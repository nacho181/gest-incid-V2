/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - PANEL DEL DIRECTOR DE SISTEMAS
 * ============================================================================
 */

import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

// URL Base de la API REST
const API_BASE_URL = '/api/v1';

// Variables de estado local
let tokenJWT = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
let empleadosSistemas = [];
let incidenciaSeleccionadaModal = null;
let idIncidenciaCancelarDirector = null;
let bsToastDirector = null;
let modalAsignarInstance = null;
let modalCancelarDirectorInstance = null;

// Variables de paginación para Gestión de Incidencias
let paginaActualGestion = 1;
const limiteGestion = 10;
let totalRegistrosGestion = 0;
let totalPaginasGestion = 1;

/**
 * Evento principal DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación y validar que sea el Director de Sistemas (rol = 1)
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch (e) {
        userData = null;
    }

    if (!tokenJWT || !userData || userData.rol !== 1) {
        window.location.href = 'index.html';
        return;
    }

    // Inicializar notificación Toast
    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        bsToastDirector = new bootstrap.Toast(toastEl, { delay: 4000 });
    }

    // Inicializar Modal de Asignación y Cancelación de Bootstrap
    const modalEl = document.getElementById('modalAsignar');
    if (modalEl && window.bootstrap) {
        modalAsignarInstance = new bootstrap.Modal(modalEl);
    }
    const modalCancelEl = document.getElementById('modalConfirmarCancelacionDirector');
    if (modalCancelEl && window.bootstrap) {
        modalCancelarDirectorInstance = new bootstrap.Modal(modalCancelEl);
    }

    // Configurar fecha actual de emisión en reporte
    const fechaEl = document.getElementById('reporteFechaEmision');
    if (fechaEl) {
        fechaEl.textContent = `Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`;
    }

    // Actualizar nombre y rol en la cabecera y el dropdown
    const lblNombre = document.getElementById('lblDirectorNombre');
    const lblNombreDrop = document.getElementById('lblDirectorNombreDrop');
    const lblUsuarioDrop = document.getElementById('lblDirectorUsuarioDrop');
    
    if (userData) {
        const nombreCompleto = `${userData.nombres || ''} ${userData.apellidos || ''}`.trim();
        if (lblNombre) lblNombre.textContent = nombreCompleto;
        if (lblNombreDrop) lblNombreDrop.textContent = nombreCompleto;
        if (lblUsuarioDrop) lblUsuarioDrop.textContent = userData.usuario || '';
    }

    // Cargar avatar si existe en la sesión
    const imgAvatarNav = document.getElementById('imgAvatarNav');
    const imgAvatarLarge = document.getElementById('imgAvatarLarge');
    const imgAvatarFull = document.getElementById('imgAvatarFull');
    if (userData && userData.avatar) {
        if (imgAvatarNav) imgAvatarNav.src = userData.avatar;
        if (imgAvatarLarge) imgAvatarLarge.src = userData.avatar;
        if (imgAvatarFull) imgAvatarFull.src = userData.avatar;
    }

    // Cargar datos iniciales
    cargarDashboard();
    cargarEmpleadosSistemas();
    cargarGestionIncidencias();
    cargarReportesEstadisticos();

    // Registrar escuchadores de eventos
    setupEventListenersDirector();
});

/**
 * Obtiene las cabeceras HTTP necesarias incluyendo el Token JWT de autenticación.
 * @returns {Object} Objeto de headers HTTP.
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (tokenJWT) {
        headers['Authorization'] = `Bearer ${tokenJWT}`;
    }
    return headers;
}

/**
 * Configura las acciones e interactividad del panel.
 */
function setupEventListenersDirector() {
    // Redirección por rol en el logo "MC"
    document.querySelectorAll('.logo-mc-interactive').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            let user = null;
            try {
                user = JSON.parse(localStorage.getItem('user_data') || 'null');
            } catch (err) {
                user = null;
            }
            const rol = user && user.rol ? Number(user.rol) : 1;
            if (rol === 1) {
                window.location.href = 'director.html';
            } else if (rol === 2) {
                window.location.href = 'sistemas.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    });

    // Botón para cerrar sesión (Actualizado al ID del dropdown)
    const btnLogout = document.getElementById('btnLogoutDropdown');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('usuario');
            window.location.href = 'index.html';
        });
    }

    // Botón de refrescar gestión de incidencias
    const btnRefresh = document.getElementById('btnRefreshGestion');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', (e) => {
            e.currentTarget?.blur();
            cargarGestionIncidencias(paginaActualGestion);
            cargarDashboard();
            mostrarToastDirector('Listado de gestión actualizado', 'info');
        });
    }

    // Botón de acceso rápido a Gestión desde Incidencias Prioritarias
    const btnVerTodas = document.getElementById('btnVerTodasGestion');
    if (btnVerTodas) {
        btnVerTodas.addEventListener('click', () => {
            const tabBtn = document.querySelector('button[data-bs-target="#tab-gestion"]');
            if (tabBtn && window.bootstrap) {
                const tab = new bootstrap.Tab(tabBtn);
                tab.show();
            }
        });
    }

    // Botón de confirmar asignación en el modal
    const btnConfirmar = document.getElementById('btnConfirmarAsignacion');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', ejecutarAsignacion);
    }

    // Botón de confirmar cancelación en el modal
    const btnConfirmarCancel = document.getElementById('btnConfirmarCancelacionDirector');
    if (btnConfirmarCancel) {
        btnConfirmarCancel.addEventListener('click', ejecutarCancelacionDirector);
    }

    // Botón para la generación y descarga del reporte PDF
    const btnPDF = document.getElementById('btnGenerarPDF');
    if (btnPDF) {
        btnPDF.addEventListener('click', generarReportePDF);
    }

    // Botón para limpiar los filtros de reporte
    const btnLimpiar = document.getElementById('btnLimpiarFiltrosReporte');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const fDesde = document.getElementById('filtroReporteDesde');
            const fHasta = document.getElementById('filtroReporteHasta');
            const fEstado = document.getElementById('filtroReporteEstado');
            const fTecnico = document.getElementById('filtroReporteTecnico');
            if (fDesde) fDesde.value = '';
            if (fHasta) fHasta.value = '';
            if (fEstado) fEstado.value = '';
            if (fTecnico) fTecnico.value = '';
            mostrarToastDirector('Filtros del reporte restablecidos.', 'info');
        });
    }

    // Delegación de eventos para la tabla de gestión de incidencias
    const tbodyGestion = document.getElementById('tbodyGestion');
    if (tbodyGestion) {
        tbodyGestion.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (!id) return;

            if (action === 'asignar') {
                abrirModalAsignar(parseInt(id, 10));
            } else if (action === 'cancelar') {
                cancelarIncidenciaDirector(parseInt(id, 10));
            }
        });
    }

    // ==========================================
    // Lógica de Subida de Avatar (Multer)
    // ==========================================
    const btnTriggerUpload = document.getElementById('btnTriggerUpload');
    const inputAvatar = document.getElementById('inputAvatarHidden');
    const imgNav = document.getElementById('imgAvatarNav');
    const imgLarge = document.getElementById('imgAvatarLarge');
    const imgFull = document.getElementById('imgAvatarFull');

    if (btnTriggerUpload && inputAvatar) {
        // Disparar input oculto solo al hacer clic en el botón de la cámara
        btnTriggerUpload.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que se cierre el menú dropdown al hacer clic
            inputAvatar.click();
        });

        // Escuchar la selección del archivo
        inputAvatar.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validación en frontend (2 MB)
            if (file.size > 2 * 1024 * 1024) {
                mostrarToastDirector('La imagen supera el tamaño máximo de 2 MB', 'error');
                inputAvatar.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file); // 'avatar' debe coincidir con el campo esperado en backend

            try {
                mostrarToastDirector('Subiendo foto de perfil...', 'info');

                const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${tokenJWT}`
                        // ATENCIÓN: No definir 'Content-Type'. 
                        // Fetch lo calcula automáticamente con el boundary del FormData.
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.mensaje || 'Error al subir el avatar.');
                }

                // Actualizar imágenes en el DOM
                if (imgNav) imgNav.src = data.usuario.avatar;
                if (imgLarge) imgLarge.src = data.usuario.avatar;
                if (imgFull) imgFull.src = data.usuario.avatar;
                
                // Actualizar la sesión en localStorage para persistencia visual entre recargas
                let sessionData = JSON.parse(localStorage.getItem('user_data') || '{}');
                sessionData.avatar = data.usuario.avatar;
                localStorage.setItem('user_data', JSON.stringify(sessionData));

                mostrarToastDirector('Foto de perfil actualizada con éxito', 'exito');
            } catch (error) {
                console.error('Error subiendo avatar:', error);
                mostrarToastDirector(error.message, 'error');
            } finally {
                inputAvatar.value = ''; // Resetear para permitir subir la misma foto si falló
            }
        });
    }
}

/**
 * Muestra un aviso emergente Toast.
 * @param {string} mensaje - Contenido del mensaje.
 * @param {string} tipo - Tipo de estado ('exito', 'error', 'info').
 */
function mostrarToastDirector(mensaje, tipo = 'exito') {
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
    if (bsToastDirector) bsToastDirector.show();
}

/**
 * Consume el endpoint del dashboard para renderizar los resúmenes y métricas.
 * GET /dashboard
 */
async function cargarDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al consultar el dashboard');

        const data = await response.json();

        // 1. Renderizar tarjetas de totales por estado
        if (data.por_estado) {
            let p = 0, ep = 0, r = 0, c = 0;
            data.por_estado.forEach(item => {
                const desc = (item.estado || '').toLowerCase();
                if (desc.includes('pendiente')) p += item.total;
                else if (desc.includes('proceso')) ep += item.total;
                else if (desc.includes('resuel') || desc.includes('finalizada')) r += item.total;
                else if (desc.includes('cancel')) c += item.total;
            });

            document.getElementById('cantPendientes').textContent = p;
            document.getElementById('cantEnProceso').textContent = ep;
            document.getElementById('cantResueltas').textContent = r;
            document.getElementById('cantCanceladas').textContent = c;
        }

        // 2. Renderizar tabla de totales por fecha
        const tbodyFecha = document.getElementById('tbodyTotalesFecha');
        if (tbodyFecha) {
            tbodyFecha.innerHTML = '';
            if (!data.por_fecha || data.por_fecha.length === 0) {
                tbodyFecha.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Sin registros por fecha</td></tr>';
            } else {
                data.por_fecha.forEach(f => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="fw-semibold">${f.fecha}</td>
                        <td class="text-end fw-bold text-concordia-dark">${f.total}</td>
                    `;
                    tbodyFecha.appendChild(tr);
                });
            }
        }

        // 3. Renderizar tabla de incidencias prioritarias
        const tbodyPrio = document.getElementById('tbodyPrioritarias');
        if (tbodyPrio) {
            tbodyPrio.innerHTML = '';
            if (!data.prioritarias || data.prioritarias.length === 0) {
                tbodyPrio.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No existen incidencias urgentes activas</td></tr>';
            } else {
                data.prioritarias.forEach(inc => {
                    const tr = document.createElement('tr');
                    const fechaFmt = new Date(inc.creado).toLocaleDateString('es-AR');

                    let badgeEstado = '<span class="badge bg-secondary">Cancelada</span>';
                    const estadoNom = (inc.estado_descripcion || '').toLowerCase();
                    if (estadoNom.includes('pendiente') || inc.id_estado === 1) {
                        badgeEstado = '<span class="badge bg-warning text-dark">Pendiente</span>';
                    } else if (estadoNom.includes('proceso') || inc.id_estado === 2) {
                        badgeEstado = '<span class="badge bg-info text-dark">En Proceso</span>';
                    } else if (estadoNom.includes('resuel') || estadoNom.includes('finalizada') || inc.id_estado === 3) {
                        badgeEstado = '<span class="badge bg-success">Resuelta</span>';
                    } else if (estadoNom.includes('cancel') || inc.id_estado === 4) {
                        badgeEstado = '<span class="badge bg-secondary">Cancelada</span>';
                    }

                    tr.innerHTML = `
                        <td class="fw-bold">#${inc.id_incidencia}</td>
                        <td class="small">${fechaFmt}</td>
                        <td class="small fw-semibold">${escapeHtml(inc.articulo_descripcion || 'Equipo')} - ${escapeHtml(inc.descripcion_pedido || '')}</td>
                        <td>${badgeEstado}</td>
                        <td class="small text-muted">${escapeHtml(inc.asignado_nombre || 'Sin Asignar')}</td>
                    `;
                    tbodyPrio.appendChild(tr);
                });
            }
        }

    } catch (error) {
        console.error('Error cargando el dashboard:', error);
    }
}

/**
 * Carga la lista de empleados del área de Sistemas para poblar el modal de asignación.
 * GET /usuarios?rol=2
 */
async function cargarEmpleadosSistemas() {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios?rol=2`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al cargar personal de sistemas');

        const data = await response.json();
        // Filtrar usuarios garantizando que sólo tengan rol = 2 (Empleado de sistemas)
        empleadosSistemas = Array.isArray(data) ? data.filter(emp => emp.rol === 2) : [];

        const select = document.getElementById('selectSistemasEmpleado');
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar Técnico --</option>';
            empleadosSistemas.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id_usuario;
                opt.textContent = `${emp.nombres} ${emp.apellidos} (${emp.usuario})`;
                select.appendChild(opt);
            });
        }

        // Poblar selector de técnicos en los filtros de reporte PDF
        const selectFiltro = document.getElementById('filtroReporteTecnico');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todos los Técnicos</option><option value="0">Sin Asignar</option>';
            empleadosSistemas.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id_usuario;
                opt.textContent = `${emp.nombres} ${emp.apellidos}`;
                selectFiltro.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error al cargar empleados de sistemas:', error);
    }
}

/**
 * Carga todas las incidencias para la tabla interactiva de gestión y asignación con paginación LIMIT/OFFSET.
 * GET /incidencias (el Director recibe todas con soporte de page y limit).
 */
async function cargarGestionIncidencias(pagina = 1) {
    paginaActualGestion = pagina;
    const tbody = document.getElementById('tbodyGestion');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-concordia me-2"></div>Cargando incidencias...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/incidencias?page=${pagina}&limit=${limiteGestion}&order_by=creado&order_dir=DESC`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al obtener incidencias para gestión');

        const rawData = await response.json();
        const incidencias = Array.isArray(rawData) ? rawData : (rawData.data || []);
        const pagination = rawData.pagination || {
            total: incidencias.length,
            page: pagina,
            limit: limiteGestion,
            total_pages: Math.ceil(incidencias.length / limiteGestion) || 1
        };

        totalRegistrosGestion = pagination.total;
        totalPaginasGestion = pagination.total_pages || 1;
        tbody.innerHTML = '';

        if (!incidencias || incidencias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron incidencias registradas.</td></tr>';
            actualizarPaginadorGestion();
            return;
        }

        incidencias.forEach(inc => {
            const tr = document.createElement('tr');

            // Badge de Prioridad
            let badgePrio = '<span class="badge bg-info text-dark">Baja</span>';
            if (inc.prioridad === 1) badgePrio = '<span class="badge bg-danger">Alta</span>';
            else if (inc.prioridad === 2) badgePrio = '<span class="badge bg-warning text-dark">Media</span>';

            // Badge de Estado
            let badgeEst = `<span class="badge bg-secondary">${escapeHtml(inc.estado_descripcion || 'Pendiente')}</span>`;
            const estadoNom = (inc.estado_descripcion || '').toLowerCase();
            if (estadoNom.includes('pendiente') || inc.id_estado === 1) {
                badgeEst = '<span class="badge bg-warning text-dark">Pendiente</span>';
            } else if (estadoNom.includes('proceso') || inc.id_estado === 2) {
                badgeEst = '<span class="badge bg-info text-dark">En Proceso</span>';
            } else if (estadoNom.includes('resuel') || estadoNom.includes('finalizada') || inc.id_estado === 3) {
                badgeEst = '<span class="badge bg-success">Resuelta</span>';
            } else if (estadoNom.includes('cancel') || inc.id_estado === 4) {
                badgeEst = '<span class="badge bg-secondary">Cancelada</span>';
            }

            const esFinalizada = (inc.id_estado === 3 || estadoNom.includes('resuel') || estadoNom.includes('finalizada'));
            const esCancelada = (inc.id_estado === 4 || estadoNom.includes('cancel'));
            const esPendiente = (inc.id_estado === 1 || estadoNom.includes('pendiente'));

            // Botón para Asignar (deshabilitado si ya está Finalizada o Cancelada)
            const btnAsignar = (esCancelada || esFinalizada)
                ? `<button class="btn btn-sm btn-outline-secondary me-1 fw-semibold" disabled title="La incidencia ya se encuentra cerrada">Asignar</button>`
                : `<button data-action="asignar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-concordia me-1 fw-semibold">Asignar</button>`;

            // Botón para Cancelar (habilitado únicamente si está Pendiente)
            const btnCancelar = esPendiente
                ? `<button data-action="cancelar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-danger fw-semibold">Cancelar</button>`
                : `<span class="text-muted small">N/A</span>`;

            tr.innerHTML = `
                <td class="fw-bold">#${inc.id_incidencia}</td>
                <td class="small fw-semibold">${escapeHtml(inc.usuario_creador || 'Empleado')}</td>
                <td class="small">${escapeHtml(inc.articulo_descripcion || 'Equipo')}</td>
                <td class="small text-wrap" style="max-width: 200px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
                <td>${badgePrio}</td>
                <td>${badgeEst}</td>
                <td class="small fw-bold text-concordia-dark">${escapeHtml(inc.asignado_nombre || 'Sin Asignar')}</td>
                <td class="text-end">${btnAsignar} ${btnCancelar}</td>
            `;

            tbody.appendChild(tr);
        });

        actualizarPaginadorGestion();

    } catch (error) {
        console.error('Error en gestión de incidencias:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error de conexión al cargar el listado.</td></tr>';
    }
}

function actualizarPaginadorGestion() {
    const ulPag = document.getElementById('paginacionDirector');
    const lblInfo = document.getElementById('lblInfoPaginacionDirector');

    renderizarPaginador({
        ulElement: ulPag,
        infoElement: lblInfo,
        total: totalRegistrosGestion,
        page: paginaActualGestion,
        limit: limiteGestion,
        totalPages: totalPaginasGestion,
        onCambiarPagina: (nuevaPagina) => cargarGestionIncidencias(nuevaPagina),
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
    liPrev.innerHTML = `<button class="page-link" type="button" aria-label="Anterior">«</button>`;
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
    liNext.innerHTML = `<button class="page-link" type="button" aria-label="Siguiente">»</button>`;
    if (pagActual < cantPaginas) {
        liNext.querySelector('button').addEventListener('click', () => onCambiarPagina(pagActual + 1));
    }
    ulElement.appendChild(liNext);
}

/**
 * Abre el modal de asignación para la incidencia especificada.
 * @param {number} idIncidencia - Identificador de la incidencia.
 */
function abrirModalAsignar(idIncidencia) {
    incidenciaSeleccionadaModal = idIncidencia;
    document.getElementById('modalIncidenciaId').textContent = `#${idIncidencia}`;

    if (modalAsignarInstance) {
        modalAsignarInstance.show();
    }
}

/**
 * Asigna la incidencia a un técnico.
 * PATCH /incidencias/:id con { asignado_a }. El servidor la pasa a "En Proceso".
 */
async function ejecutarAsignacion() {
    if (!incidenciaSeleccionadaModal) return;

    const select = document.getElementById('selectSistemasEmpleado');
    const id_usuario_sistemas = parseInt(select.value, 10);

    if (!id_usuario_sistemas) {
        mostrarToastDirector('Por favor, seleccione un técnico responsable.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/incidencias/${incidenciaSeleccionadaModal}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ asignado_a: id_usuario_sistemas })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'No fue posible asignar la incidencia. Por favor, intente nuevamente.');
        }

        mostrarToastDirector(`Incidencia #${incidenciaSeleccionadaModal} asignada con éxito.`, 'exito');

        if (modalAsignarInstance) {
            modalAsignarInstance.hide();
        }

        // Actualizar vistas
        cargarGestionIncidencias(paginaActualGestion);
        cargarDashboard();

    } catch (error) {
        console.error('Error asignando incidencia:', error);
        mostrarToastDirector(error.message, 'error');
    }
}

/**
 * Abre el modal de confirmación para cancelar una incidencia en estado 'Pendiente'.
 * @param {number} idIncidencia - ID de la incidencia.
 */
function cancelarIncidenciaDirector(idIncidencia) {
    idIncidenciaCancelarDirector = idIncidencia;
    const lbl = document.getElementById('lblDirectorCancelarId');
    if (lbl) lbl.textContent = `#${idIncidencia}`;
    if (modalCancelarDirectorInstance) {
        modalCancelarDirectorInstance.show();
    }
}

/**
 * Ejecuta la cancelación de una incidencia con estado 'Pendiente'.
 * PATCH /incidencias/:id con { id_estado: 4 }.
 */
async function ejecutarCancelacionDirector() {
    if (!idIncidenciaCancelarDirector) return;
    const idIncidencia = idIncidenciaCancelarDirector;

    try {
        const response = await fetch(`${API_BASE_URL}/incidencias/${idIncidencia}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_estado: 4 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'No fue posible cancelar la incidencia. Por favor, intente nuevamente.');
        }

        if (modalCancelarDirectorInstance) {
            modalCancelarDirectorInstance.hide();
        }

        mostrarToastDirector(`Incidencia #${idIncidencia} cancelada correctamente.`, 'exito');

        cargarGestionIncidencias(paginaActualGestion);
        cargarDashboard();

    } catch (error) {
        console.error('Error cancelando incidencia:', error);
        mostrarToastDirector(error.message, 'error');
    } finally {
        idIncidenciaCancelarDirector = null;
    }
}

/**
 * Carga las estadísticas para el reporte en la pestaña de reportes.
 * GET /reportes
 */
async function cargarReportesEstadisticos() {
    try {
        const response = await fetch(`${API_BASE_URL}/reportes`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al cargar datos estadísticos');

        const data = await response.json();

        const elRepTotal = document.getElementById('repTotalIncidencias');
        if (elRepTotal) elRepTotal.textContent = data.total_incidencias || 0;

        // Distribución por Área
        const contAreas = document.getElementById('repContenidoAreas');
        if (contAreas) {
            contAreas.innerHTML = '';
            if (!data.por_area || data.por_area.length === 0) {
                contAreas.innerHTML = '<div class="col-12 text-muted small">Sin datos de áreas</div>';
            } else {
                data.por_area.forEach(a => {
                    const col = document.createElement('div');
                    col.className = 'col-6 col-md-4';
                    col.innerHTML = `
                        <div class="p-2 border rounded bg-light">
                            <span class="d-block text-muted small">${escapeHtml(a.area)}</span>
                            <strong class="text-concordia-dark">${a.total} ticket(s)</strong>
                        </div>
                    `;
                    contAreas.appendChild(col);
                });
            }
        }

        // Distribución por Categoría
        const contCats = document.getElementById('repContenidoCategorias');
        if (contCats) {
            contCats.innerHTML = '';
            if (!data.por_categoria || data.por_categoria.length === 0) {
                contCats.innerHTML = '<div class="col-12 text-muted small">Sin datos de categorías</div>';
            } else {
                data.por_categoria.forEach(c => {
                    const col = document.createElement('div');
                    col.className = 'col-6 col-md-4';
                    col.innerHTML = `
                        <div class="p-2 border rounded bg-light">
                            <span class="d-block text-muted small">${escapeHtml(c.categoria)}</span>
                            <strong class="text-concordia-dark">${c.total} ticket(s)</strong>
                        </div>
                    `;
                    contCats.appendChild(col);
                });
            }
        }

    } catch (error) {
        console.error('Error en reportes estadísticos:', error);
    }
}

/**
 * Genera y descarga el archivo PDF del reporte oficial de incidencias.
 * Realiza la petición al backend (/director/reportes/pdf) enviando los filtros en query string y JWT,
 * convirtiendo el stream binario recibido a Blob para iniciar la descarga automática en el navegador.
 */
async function generarReportePDF() {
    const btnPDF = document.getElementById('btnGenerarPDF');
    const textoOriginal = btnPDF ? btnPDF.innerHTML : '<i class="bi bi-file-earmark-pdf me-1"></i> Descargar Reporte PDF';

    try {
        if (btnPDF) {
            btnPDF.disabled = true;
            btnPDF.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Preparando reporte...';
        }

        mostrarToastDirector('Preparando reporte PDF...', 'info');

        // Recuperar valores de los filtros
        const desde = document.getElementById('filtroReporteDesde')?.value || '';
        const hasta = document.getElementById('filtroReporteHasta')?.value || '';
        const id_estado = document.getElementById('filtroReporteEstado')?.value || '';
        const asignado_a = document.getElementById('filtroReporteTecnico')?.value || '';

        // Construir parámetros de consulta
        const params = new URLSearchParams();
        if (desde) params.append('desde', desde);
        if (hasta) params.append('hasta', hasta);
        if (id_estado) params.append('id_estado', id_estado);
        if (asignado_a !== '') params.append('asignado_a', asignado_a);

        const queryString = params.toString();
        const url = `${API_BASE_URL}/reportes/pdf${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenJWT}`
            }
        });

        if (!response.ok) {
            let errorMsg = 'No fue posible generar el reporte PDF. Por favor, intente nuevamente.';
            try {
                const errData = await response.json();
                errorMsg = errData.mensaje || errorMsg;
            } catch (_) {}
            throw new Error(errorMsg);
        }

        // Convertir la respuesta a Blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        // Crear elemento <a> temporal para disparar la descarga
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;

        const fechaHoy = new Date().toISOString().slice(0, 10);
        a.download = `reporte_incidencias_${fechaHoy}.pdf`;

        document.body.appendChild(a);
        a.click();

        // Limpiar elemento y URL de objeto
        setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        }, 200);

        mostrarToastDirector('Reporte PDF descargado con éxito.', 'exito');
    } catch (error) {
        console.error('Error generando reporte PDF:', error);
        mostrarToastDirector(error.message || 'Error al descargar el reporte.', 'error');
    } finally {
        if (btnPDF) {
            btnPDF.disabled = false;
            btnPDF.innerHTML = textoOriginal;
        }
    }
}

/**
 * Sanea entradas HTML para prevenir ataques XSS.
 * @param {string} str - Cadena de entrada.
 * @returns {string} Cadena sanitizada.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'");
}