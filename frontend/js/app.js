/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - SISTEMA DE INCIDENCIAS
 * ============================================================================
 */

import * as bootstrap from 'bootstrap';
import TomSelect from 'tom-select';

window.bootstrap = bootstrap;

const API_BASE_URL = '/api/v1';

// Estado de sesión del cliente
let currentUser = null;
let authToken = localStorage.getItem('jwt_token') || null;

// Caché local para filtrado de artículos
let listaArticulosCache = [];
let bsToast = null;
let modalCancelarBs = null;
let idIncidenciaACancelar = null;
let tomSelectArticulo = null;

// Paginación de Mis Incidencias
let paginaActualMisIncidencias = 1;
const limiteMisIncidencias = 10;
let totalRegistrosMisIncidencias = 0;
let totalPaginasMisIncidencias = 1;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Toast y Modal de Bootstrap
    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    }
    const modalCancelEl = document.getElementById('modalConfirmarCancelacion');
    if (modalCancelEl && window.bootstrap) {
        modalCancelarBs = new bootstrap.Modal(modalCancelEl);
    }

    // 2. Registrar eventos generales
    setupEventListeners();

    // 3. Comprobar si ya existe una sesión activa
    verificarSesion();
});

/**
 * Obtiene la URL de inicio correspondiente según el rol del usuario autenticado.
 * - Rol 1: Director de Sistemas -> director.html
 * - Rol 2: Empleado de Sistemas -> sistemas.html
 * - Rol 3: Empleado Municipal -> index.html
 */
function getHomeUrlPorRol(user) {
    if (!user) {
        try {
            user = JSON.parse(localStorage.getItem('user_data') || 'null');
        } catch (e) {
            user = null;
        }
    }
    const rol = user && user.rol ? Number(user.rol) : null;
    if (rol === 1) return 'director.html';
    if (rol === 2) return 'sistemas.html';
    return 'index.html';
}

function redirigirPorRol(user) {
    window.location.href = getHomeUrlPorRol(user);
}

/**
 * Registra los escuchadores de eventos para la interfaz.
 */
function setupEventListeners() {
    // Redirección por rol en el logo "MC"
    document.querySelectorAll('.logo-mc-interactive').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            redirigirPorRol(currentUser);
        });
    });

    // Formulario de login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', manejarLogin);
    }

    // Botón de cerrar sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }

    // Refrescar incidencias
    const btnRefresh = document.getElementById('btnRefreshIncidencias');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', (e) => {
            e.currentTarget?.blur();
            cargarMisIncidencias();
            mostrarToast('Lista de incidencias actualizada', 'info');
        });
    }

    // Formulario de nueva incidencia
    const formNuevaIncidencia = document.getElementById('formNuevaIncidencia');
    if (formNuevaIncidencia) {
        formNuevaIncidencia.addEventListener('submit', crearIncidencia);
    }

    // Filtro reactivo de artículos
    const searchArticulos = document.getElementById('searchArticulos');
    if (searchArticulos) {
        searchArticulos.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filtrarArticulos(query);
        });
    }

    // Delegación de eventos para tarjetas de artículos
    const gridArticulos = document.getElementById('gridArticulos');
    if (gridArticulos) {
        gridArticulos.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'reportar-falla' && id) {
                seleccionarArticuloParaIncidencia(parseInt(id, 10));
            }
        });
    }

    // Delegación de eventos para la tabla de incidencias
    const tbodyIncidencias = document.getElementById('tbodyIncidencias');
    if (tbodyIncidencias) {
        tbodyIncidencias.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'cancelar' && id) {
                solicitarCancelacionIncidencia(parseInt(id, 10));
            }
        });
    }

    const btnConfirmarCancel = document.getElementById('btnConfirmarCancelacionModal');
    if (btnConfirmarCancel) {
        btnConfirmarCancel.addEventListener('click', ejecutarCancelacionIncidencia);
    }
}

/**
 * Petición de login contra la API REST.
 */
async function manejarLogin(e) {
    e.preventDefault();

    const usuarioInput = document.getElementById('txtLoginUsuario').value.trim();
    const contraseniaInput = document.getElementById('txtLoginPassword').value;
    const btnSubmit = document.getElementById('btnSubmitLogin');

    if (!usuarioInput || !contraseniaInput) {
        mostrarToast('Por favor, ingrese su usuario y contraseña.', 'error');
        return;
    }

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Ingresando...`;

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioInput, contrasenia: contraseniaInput })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'Credenciales incorrectas. Verifique los datos ingresados.');
        }

        // Guardar token y datos del usuario en localStorage
        authToken = data.token;
        currentUser = data.usuario;
        localStorage.setItem('jwt_token', authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        localStorage.setItem('usuario', JSON.stringify(currentUser));

        mostrarToast(`¡Bienvenido/a, ${currentUser.nombres}!`, 'exito');
        document.getElementById('formLogin').reset();

        if (currentUser.rol === 1) {
            window.location.href = 'director.html';
            return;
        }

        if (currentUser.rol === 2) {
            window.location.href = 'sistemas.html';
            return;
        }

        mostrarVistaAutenticada();
    } catch (error) {
        console.error('Error en autenticación:', error);
        mostrarToast(error.message, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Ingresar al Sistema`;
    }
}

/**
 * Valida la existencia del token al iniciar y consulta /me para comprobar vigencia.
 */
async function verificarSesion() {
    const savedToken = localStorage.getItem('jwt_token');
    const savedUser = localStorage.getItem('user_data');

    if (!savedToken) {
        mostrarVistaLogin();
        return;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/auth/me`);
        if (!response.ok) {
            throw new Error('Sesión expirada');
        }

        const data = await response.json();
        currentUser = data.usuario || (savedUser ? JSON.parse(savedUser) : null);
        authToken = savedToken;
        mostrarVistaAutenticada();
    } catch (error) {
        cerrarSesion();
    }
}

/**
 * Cierra la sesión activa y limpia las credenciales.
 */
function cerrarSesion() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('usuario');
    authToken = null;
    currentUser = null;
    mostrarVistaLogin();
    mostrarToast('Sesión cerrada correctamente.', 'info');
}

/**
 * Muestra el formulario de login y oculta el panel principal.
 */
function mostrarVistaLogin() {
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('appSection').classList.add('d-none');
    document.getElementById('userProfileNav').classList.add('d-none');
    document.getElementById('userProfileNav').classList.remove('d-flex');
}

/**
 * Muestra el panel principal y carga los datos de acuerdo al usuario.
 */
function mostrarVistaAutenticada() {

    if (currentUser && currentUser.rol === 1) {
        window.location.href = 'director.html';
        return;
    }

    if (currentUser && currentUser.rol === 2) {
        window.location.href = 'sistemas.html';
        return;
    }

    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('appSection').classList.remove('d-none');

    const navProfile = document.getElementById('userProfileNav');
    navProfile.classList.remove('d-none');
    navProfile.classList.add('d-flex');

    // Ocultar botón del Director para usuarios estándar (rol != 3)
    const btnLinkDirector = document.getElementById('btnLinkDirector');
    if (btnLinkDirector) {
        if (currentUser && currentUser.rol === 3) {
            btnLinkDirector.classList.remove('d-none');
        } else {
            btnLinkDirector.classList.add('d-none');
        }
    }

    // Mostrar botón de acceso al Panel de Sistemas para roles 2 y 3
    const btnLinkSistemas = document.getElementById('btnLinkSistemas');
    if (btnLinkSistemas) {
        if (currentUser && (currentUser.rol === 2 || currentUser.rol === 3)) {
            btnLinkSistemas.classList.remove('d-none');
        } else {
            btnLinkSistemas.classList.add('d-none');
        }
    }
    const btnEntidades = document.getElementById('btnLinkEntidades');
    if (btnEntidades) {
        const puedeAdministrar = currentUser && (currentUser.rol === 2);
        btnEntidades.classList.toggle('d-none', !puedeAdministrar);
    }
    // Mapear nombres y roles
    if (currentUser) {
        document.getElementById('lblUsuarioNombre').textContent = `${currentUser.nombres} ${currentUser.apellidos}`;

        let nombreRol = 'Empleado';
        if (currentUser.rol === 1) nombreRol = 'Director de Sistemas';
        if (currentUser.rol === 2) nombreRol = 'Empleado de Sistemas';
        if (currentUser.rol === 3) nombreRol = 'Empleado Municipal';

        document.getElementById('lblUsuarioRol').textContent = nombreRol;
    }

    // Cargar los módulos correspondientes
    cargarArticulos();
    cargarMisIncidencias();
}

/**
 * Helper para realizar fetch agregando el token JWT en el header.
 */
async function fetchConAuth(url, options = {}) {
    const headers = options.headers || {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch(url, { ...options, headers });
}

/**
 * Inicializa la librería Tom Select en el selector de artículos para permitir búsqueda avanzada.
 */
function inicializarTomSelect() {
    const selectEl = document.getElementById('selectArticulo');
    if (!selectEl) return;

    if (tomSelectArticulo) {
        tomSelectArticulo.destroy();
        tomSelectArticulo = null;
    }

    tomSelectArticulo = new TomSelect('#selectArticulo', {
        create: false,
        placeholder: '-- Seleccionar Artículo --',
        allowEmptyOption: false,
        maxOptions: 500,
        sortField: {
            field: 'text',
            direction: 'asc'
        }
    });
}

/**
 * Consulta y carga el catálogo de artículos.
 */
async function cargarArticulos() {
    try {
        const response = await fetchConAuth(`${API_BASE_URL}/articulos`);
        if (!response.ok) throw new Error('Error al obtener artículos');

        const result = await response.json();
        listaArticulosCache = Array.isArray(result) ? result : (result.data || []);

        const selectArticulo = document.getElementById('selectArticulo');
        if (selectArticulo) {
            if (tomSelectArticulo) {
                tomSelectArticulo.destroy();
                tomSelectArticulo = null;
            }

            selectArticulo.innerHTML = '<option value="" selected></option>';
            listaArticulosCache.forEach(art => {
                const option = document.createElement('option');
                option.value = art.id_articulo;
                option.textContent = `${art.descripcion} (${art.categoria_descripcion || art.categoria_nombre || 'General'})`;
                selectArticulo.appendChild(option);
            });

            inicializarTomSelect();
        }

        renderizarGridArticulos(listaArticulosCache);
    } catch (error) {
        console.error('Error cargando artículos:', error);
    }
}

/**
 * Renderiza el grid de artículos.
 */
function renderizarGridArticulos(articulos) {
    const container = document.getElementById('gridArticulos');
    if (!container) return;

    container.innerHTML = '';

    if (!articulos || articulos.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-4">No se encontraron artículos que coincidan con la búsqueda.</div>`;
        return;
    }

    articulos.forEach(art => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card card-articulo h-100 shadow-sm rounded-3">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-concordia-light text-white">${escapeHtml(art.categoria_descripcion || art.categoria_nombre || 'Equipamiento')}</span>
                        <small class="text-muted">Código N.º ${art.id_articulo}</small>
                    </div>
                    <h5 class="card-title fw-bold text-concordia-dark mb-1">${escapeHtml(art.descripcion)}</h5>
                    <p class="card-text small text-muted mb-3">Área asignada: <strong>${escapeHtml(art.area_descripcion || art.area_nombre || 'General')}</strong></p>
                    <div class="mt-auto">
                        <button data-action="reportar-falla" data-id="${art.id_articulo}" class="btn btn-sm btn-outline-concordia w-100 fw-semibold btn-reportar-falla">
                            <i class="bi bi-plus-circle me-1"></i> Reportar Incidencia
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function filtrarArticulos(query) {
    if (!query) {
        renderizarGridArticulos(listaArticulosCache);
        return;
    }

    const filtrados = listaArticulosCache.filter(art =>
        (art.descripcion && art.descripcion.toLowerCase().includes(query)) ||
        (art.categoria_descripcion && art.categoria_descripcion.toLowerCase().includes(query)) ||
        (art.area_descripcion && art.area_descripcion.toLowerCase().includes(query))
    );

    renderizarGridArticulos(filtrados);
}

function seleccionarArticuloParaIncidencia(idArticulo) {
    if (tomSelectArticulo) {
        tomSelectArticulo.setValue(idArticulo);
    } else {
        const selectArticulo = document.getElementById('selectArticulo');
        if (selectArticulo) {
            selectArticulo.value = idArticulo;
        }
    }

    const tabBtn = document.getElementById('btn-nueva-incidencia');
    if (tabBtn && window.bootstrap) {
        const tabTrigger = new bootstrap.Tab(tabBtn);
        tabTrigger.show();
    }

    mostrarToast('Equipo seleccionado. Por favor, describa el inconveniente.', 'info');
}

/**
 * Consulta y carga las incidencias creadas por el usuario autenticado con paginación LIMIT/OFFSET.
 * GET /incidencias o /incidencias/mis-incidencias
 */
async function cargarMisIncidencias(pagina = 1) {
    paginaActualMisIncidencias = pagina;
    const tbody = document.getElementById('tbodyIncidencias');
    if (!tbody || !currentUser) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-concordia me-2"></div>Cargando incidencias...</td></tr>`;

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias?page=${pagina}&limit=${limiteMisIncidencias}`);
        if (!response.ok) throw new Error('Error al obtener incidencias');

        const result = await response.json();
        const incidencias = Array.isArray(result) ? result : (result.data || []);
        const pagination = result.pagination || {
            total: incidencias.length,
            page: pagina,
            limit: limiteMisIncidencias,
            total_pages: Math.ceil(incidencias.length / limiteMisIncidencias) || 1
        };

        totalRegistrosMisIncidencias = pagination.total;
        totalPaginasMisIncidencias = pagination.total_pages || 1;

        tbody.innerHTML = '';

        if (incidencias.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No registra incidencias reportadas hasta el momento.</td></tr>`;
            actualizarPaginadorMisIncidencias();
            return;
        }

        incidencias.forEach(inc => {
            const tr = document.createElement('tr');

            let badgeEstado = '';
            const estadoNom = (inc.estado_descripcion || inc.estado_nombre || 'Pendiente').toLowerCase();
            if (estadoNom.includes('pendiente') || inc.id_estado === 1) {
                badgeEstado = '<span class="badge bg-warning text-dark">Pendiente</span>';
            } else if (estadoNom.includes('proceso') || inc.id_estado === 2) {
                badgeEstado = '<span class="badge bg-info text-dark">En Proceso</span>';
            } else if (estadoNom.includes('resuelta') || estadoNom.includes('resuela') || estadoNom.includes('finalizada') || inc.id_estado === 3) {
                badgeEstado = '<span class="badge bg-success">Resuelta</span>';
            } else if (estadoNom.includes('cancelada') || inc.id_estado === 4) {
                badgeEstado = '<span class="badge bg-secondary">Cancelada</span>';
            } else {
                badgeEstado = `<span class="badge bg-light text-dark">${escapeHtml(inc.estado_descripcion || 'Sin estado')}</span>`;
            }

            let badgePrioridad = '';
            if (inc.prioridad === 1) {
                badgePrioridad = '<span class="badge bg-danger">Alta</span>';
            } else if (inc.prioridad === 2) {
                badgePrioridad = '<span class="badge bg-warning text-dark">Media</span>';
            } else {
                badgePrioridad = '<span class="badge bg-info text-dark">Baja</span>';
            }

            const fechaFormateada = new Date(inc.creado).toLocaleDateString('es-AR', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            const esPendiente = (inc.id_estado === 1 || estadoNom.includes('pendiente'));
            const botonAccion = esPendiente
                ? `<button data-action="cancelar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-danger fw-semibold btn-cancelar-incidencia">Cancelar</button>`
                : `<span class="text-muted small">Sin acciones</span>`;

            tr.innerHTML = `
                <td class="fw-bold">#${inc.id_incidencia}</td>
                <td class="small">${fechaFormateada}</td>
                <td class="fw-semibold">${escapeHtml(inc.articulo_descripcion || inc.articulo_nombre || 'Equipo #' + inc.id_articulo)}</td>
                <td class="small text-wrap" style="max-width: 250px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
                <td>${badgePrioridad}</td>
                <td>${badgeEstado}</td>
                <td class="text-end">${botonAccion}</td>
            `;

            tbody.appendChild(tr);
        });

        actualizarPaginadorMisIncidencias();

    } catch (error) {
        console.error('Error cargando incidencias:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Ocurrió un error al cargar sus incidencias. Por favor, intente nuevamente.</td></tr>`;
    }
}

function actualizarPaginadorMisIncidencias() {
    const ulPag = document.getElementById('paginacionMisIncidencias');
    const lblInfo = document.getElementById('lblInfoPaginacionMisIncidencias');

    renderizarPaginador({
        ulElement: ulPag,
        infoElement: lblInfo,
        total: totalRegistrosMisIncidencias,
        page: paginaActualMisIncidencias,
        limit: limiteMisIncidencias,
        totalPages: totalPaginasMisIncidencias,
        onCambiarPagina: (p) => cargarMisIncidencias(p),
        singular: 'incidencia',
        plural: 'incidencias'
    });
}

function renderizarPaginador({ ulElement, infoElement, total, page, limit, totalPages, onCambiarPagina, singular = 'registro', plural = 'registros' }) {
    if (!ulElement) return;
    ulElement.innerHTML = '';

    const totalNum = parseInt(total, 10) || 0;
    const pagActual = parseInt(page, 10) || 1;
    const cantPaginas = parseInt(totalPages, 10) || 1;

    if (infoElement) {
        if (totalNum === 0) {
            infoElement.textContent = `No se encontraron ${plural}`;
        } else {
            const desde = (pagActual - 1) * limit + 1;
            const hasta = Math.min(pagActual * limit, totalNum);
            infoElement.textContent = `Mostrando ${desde} a ${hasta} de ${totalNum} ${totalNum === 1 ? singular : plural}`;
        }
    }

    if (cantPaginas <= 1) return;

    // Botón Anterior
    const liPrev = document.createElement('li');
    liPrev.className = `page-item ${pagActual <= 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button class="page-link" type="button" aria-label="Anterior">&laquo;</button>`;
    if (pagActual > 1) {
        liPrev.querySelector('button').addEventListener('click', () => onCambiarPagina(pagActual - 1));
    }
    ulElement.appendChild(liPrev);

    let inicio = Math.max(1, pagActual - 2);
    let fin = Math.min(cantPaginas, inicio + 4);
    if (fin - inicio < 4) {
        inicio = Math.max(1, fin - 4);
    }

    if (inicio > 1) {
        const li1 = document.createElement('li');
        li1.className = 'page-item';
        li1.innerHTML = `<button class="page-link" type="button">1</button>`;
        li1.querySelector('button').addEventListener('click', () => onCambiarPagina(1));
        ulElement.appendChild(li1);

        if (inicio > 2) {
            const liDots = document.createElement('li');
            liDots.className = 'page-item disabled';
            liDots.innerHTML = `<span class="page-link">...</span>`;
            ulElement.appendChild(liDots);
        }
    }

    for (let i = inicio; i <= fin; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === pagActual ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link" type="button">${i}</button>`;
        if (i !== pagActual) {
            const n = i;
            li.querySelector('button').addEventListener('click', () => onCambiarPagina(n));
        }
        ulElement.appendChild(li);
    }

    if (fin < cantPaginas) {
        if (fin < cantPaginas - 1) {
            const liDots = document.createElement('li');
            liDots.className = 'page-item disabled';
            liDots.innerHTML = `<span class="page-link">...</span>`;
            ulElement.appendChild(liDots);
        }
        const liFin = document.createElement('li');
        liFin.className = 'page-item';
        liFin.innerHTML = `<button class="page-link" type="button">${cantPaginas}</button>`;
        liFin.querySelector('button').addEventListener('click', () => onCambiarPagina(cantPaginas));
        ulElement.appendChild(liFin);
    }

    // Botón Siguiente
    const liNext = document.createElement('li');
    liNext.className = `page-item ${pagActual >= cantPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button class="page-link" type="button" aria-label="Siguiente">&raquo;</button>`;
    if (pagActual < cantPaginas) {
        liNext.querySelector('button').addEventListener('click', () => onCambiarPagina(pagActual + 1));
    }
    ulElement.appendChild(liNext);
}

/**
 * Crea una nueva incidencia enviando el ID del usuario autenticado.
 */
async function crearIncidencia(e) {
    e.preventDefault();

    if (!currentUser) {
        mostrarToast('Debe iniciar sesión para reportar una incidencia.', 'error');
        return;
    }

    const selectEl = document.getElementById('selectArticulo');
    const id_articulo = tomSelectArticulo
        ? parseInt(tomSelectArticulo.getValue(), 10)
        : parseInt(selectEl.value, 10);

    const prioridad = parseInt(document.getElementById('selectPrioridad').value, 10);
    const descripcion_pedido = document.getElementById('txtDescripcion').value.trim();

    if (!id_articulo || !descripcion_pedido) {
        mostrarToast('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_articulo,
                prioridad,
                descripcion_pedido
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.mensaje || errData.error || 'Ocurrió un error al registrar la incidencia. Por favor, intente nuevamente.');
        }

        mostrarToast('¡Incidencia registrada con éxito!', 'exito');
        document.getElementById('formNuevaIncidencia').reset();
        if (tomSelectArticulo) {
            tomSelectArticulo.clear();
        }

        await cargarMisIncidencias();
        const tabBtn = document.getElementById('btn-mis-incidencias');
        if (tabBtn && window.bootstrap) {
            const tabTrigger = new bootstrap.Tab(tabBtn);
            tabTrigger.show();
        }

    } catch (error) {
        console.error('Error creando incidencia:', error);
        mostrarToast(error.message, 'error');
    }
}

/**
 * Abre el modal de confirmación para cancelar una incidencia en estado Pendiente.
 */
function solicitarCancelacionIncidencia(idIncidencia) {
    idIncidenciaACancelar = idIncidencia;
    const lbl = document.getElementById('lblIncidenciaCancelarId');
    if (lbl) lbl.textContent = `#${idIncidencia}`;
    if (modalCancelarBs) modalCancelarBs.show();
}

/**
 * Cancela una incidencia en estado Pendiente.
 * PATCH /incidencias/:id con { id_estado: 4 } (cancelada).
 */
async function ejecutarCancelacionIncidencia() {
    if (!idIncidenciaACancelar) return;
    const idIncidencia = idIncidenciaACancelar;

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias/${idIncidencia}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_estado: 4 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'No fue posible cancelar la incidencia. Por favor, intente nuevamente.');
        }

        if (modalCancelarBs) modalCancelarBs.hide();
        mostrarToast(`Solicitud #${idIncidencia} cancelada correctamente.`, 'exito');
        await cargarMisIncidencias(paginaActualMisIncidencias);

    } catch (error) {
        console.error('Error cancelando incidencia:', error);
        mostrarToast(error.message, 'error');
    } finally {
        idIncidenciaACancelar = null;
    }
}

function mostrarToast(mensaje, tipo = 'exito') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');

    if (!toastEl || !toastBody) return;

    toastEl.className = 'toast align-items-center text-white border-0';
    if (tipo === 'exito') {
        toastEl.classList.add('bg-concordia-light');
    } else if (tipo === 'error' || tipo === 'danger') {
        toastEl.classList.add('bg-danger');
    } else {
        toastEl.classList.add('bg-secondary');
    }

    toastBody.textContent = mensaje;
    if (bsToast) bsToast.show();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}