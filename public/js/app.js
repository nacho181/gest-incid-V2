/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - SISTEMA DE INCIDENCIAS
 * ============================================================================
 */

const API_BASE_URL = '/api/v1';

// Estado de sesión del cliente
let currentUser = null;
let authToken = localStorage.getItem('jwt_token') || null;

// Caché local para filtrado de artículos
let listaArticulosCache = [];
let bsToast = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Toast de Bootstrap
    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    }

    // 2. Registrar eventos generales
    setupEventListeners();

    // 3. Comprobar si ya existe una sesión activa
    verificarSesion();
});

/**
 * Registra los escuchadores de eventos para la interfaz.
 */
function setupEventListeners() {
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
        btnRefresh.addEventListener('click', () => {
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
        mostrarToast('Por favor ingrese usuario y contraseña', 'error');
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
            throw new Error(data.mensaje || data.error || 'Credenciales inválidas');
        }

        // Guardar token y datos del usuario en localStorage
        authToken = data.token;
        currentUser = data.usuario;
        localStorage.setItem('jwt_token', authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        localStorage.setItem('usuario', JSON.stringify(currentUser));

        mostrarToast(`Bienvenido/a, ${currentUser.nombres}!`, 'exito');
        document.getElementById('formLogin').reset();

        // Si es Director de Sistemas (rol 3 o estren@correo.com), redireccionar al Panel Director
        if (currentUser.rol === 3 || currentUser.usuario === 'estren@correo.com') {
            window.location.href = 'director.html';
            return;
        }

        // Si es Empleado de Sistemas (rol 2), redireccionar al Panel Técnico de Sistemas
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
        console.warn('Token no válido o expirado:', error);
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
    mostrarToast('Sesión cerrada correctamente', 'info');
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
    // Si el usuario autenticado es Director de Sistemas, redireccionar al Panel de Director
    if (currentUser && (currentUser.rol === 3 || currentUser.usuario === 'estren@correo.com')) {
        window.location.href = 'director.html';
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

    // Mapear nombres y roles
    if (currentUser) {
        document.getElementById('lblUsuarioNombre').textContent = `${currentUser.nombres} ${currentUser.apellidos}`;

        let nombreRol = 'Empleado';
        if (currentUser.rol === 1) nombreRol = 'Empleado Municipal';
        if (currentUser.rol === 2) nombreRol = 'Empleado de Sistemas';
        if (currentUser.rol === 3) nombreRol = 'Director de Sistemas';

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
            selectArticulo.innerHTML = '<option value="">-- Seleccionar Artículo --</option>';
            listaArticulosCache.forEach(art => {
                const option = document.createElement('option');
                option.value = art.id_articulo;
                option.textContent = `${art.descripcion} - [Cat: ${art.categoria_descripcion || art.categoria_nombre || 'Gral'}]`;
                selectArticulo.appendChild(option);
            });
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
                        <span class="badge bg-concordia-light text-white">${escapeHtml(art.categoria_descripcion || art.categoria_nombre || 'Artículo')}</span>
                        <small class="text-muted">ID: #${art.id_articulo}</small>
                    </div>
                    <h5 class="card-title fw-bold text-concordia-dark mb-1">${escapeHtml(art.descripcion)}</h5>
                    <p class="card-text small text-muted mb-3">Área asignada: <strong>${escapeHtml(art.area_descripcion || art.area_nombre || 'General')}</strong></p>
                    <div class="mt-auto">
                        <button onclick="seleccionarArticuloParaIncidencia(${art.id_articulo})" class="btn btn-sm btn-outline-concordia w-100 fw-semibold">
                            Reportar Falla
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
    const selectArticulo = document.getElementById('selectArticulo');
    if (selectArticulo) {
        selectArticulo.value = idArticulo;
    }

    const tabBtn = document.getElementById('btn-nueva-incidencia');
    if (tabBtn && window.bootstrap) {
        const tabTrigger = new bootstrap.Tab(tabBtn);
        tabTrigger.show();
    }

    mostrarToast('Artículo seleccionado. Describe la falla a continuación.', 'info');
}

/**
 * Consulta y carga las incidencias creadas por el usuario autenticado.
 */
async function cargarMisIncidencias() {
    const tbody = document.getElementById('tbodyIncidencias');
    if (!tbody || !currentUser) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Cargando incidencias...</td></tr>`;

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias/mis-incidencias?id_usuario=${currentUser.id_usuario}`);
        if (!response.ok) throw new Error('Error al obtener incidencias');

        const result = await response.json();
        const incidencias = Array.isArray(result) ? result : (result.data || []);
        tbody.innerHTML = '';

        if (incidencias.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No tienes incidencias registradas.</td></tr>`;
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
            } else if (estadoNom.includes('resuela') || estadoNom.includes('resuelta') || inc.id_estado === 3) {
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
                ? `<button onclick="cancelarIncidencia(${inc.id_incidencia})" class="btn btn-sm btn-outline-danger fw-semibold">Cancelar</button>`
                : `<span class="text-muted small">Sin acciones</span>`;

            tr.innerHTML = `
                <td class="fw-bold">#${inc.id_incidencia}</td>
                <td class="small">${fechaFormateada}</td>
                <td class="fw-semibold">${escapeHtml(inc.articulo_descripcion || inc.articulo_nombre || 'Artículo #' + inc.id_articulo)}</td>
                <td class="small text-wrap" style="max-width: 250px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
                <td>${badgePrioridad}</td>
                <td>${badgeEstado}</td>
                <td class="text-end">${botonAccion}</td>
            `;

            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error cargando incidencias:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar incidencias.</td></tr>`;
    }
}

/**
 * Crea una nueva incidencia enviando el ID del usuario autenticado.
 */
async function crearIncidencia(e) {
    e.preventDefault();

    if (!currentUser) {
        mostrarToast('Debes iniciar sesión para reportar una incidencia', 'error');
        return;
    }

    const id_articulo = parseInt(document.getElementById('selectArticulo').value, 10);
    const prioridad = parseInt(document.getElementById('selectPrioridad').value, 10);
    const descripcion_pedido = document.getElementById('txtDescripcion').value.trim();

    if (!id_articulo || !descripcion_pedido) {
        mostrarToast('Por favor completa todos los campos requeridos.', 'error');
        return;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_articulo,
                creado_por: currentUser.id_usuario,
                prioridad,
                descripcion_pedido
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.mensaje || errData.error || 'Error al crear la incidencia');
        }

        mostrarToast('¡Incidencia creada exitosamente!', 'exito');
        document.getElementById('formNuevaIncidencia').reset();

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
 * Cancela una incidencia en estado Pendiente.
 */
async function cancelarIncidencia(idIncidencia) {
    if (!confirm(`¿Estás seguro de que deseas cancelar la incidencia #${idIncidencia}?`)) {
        return;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/incidencias/${idIncidencia}/cancelar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: currentUser.id_usuario })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'No se pudo cancelar la incidencia');
        }

        mostrarToast(`Incidencia #${idIncidencia} cancelada correctamente.`, 'exito');
        await cargarMisIncidencias();

    } catch (error) {
        console.error('Error cancelando incidencia:', error);
        mostrarToast(error.message, 'error');
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