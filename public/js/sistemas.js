/**
 * ============================================================================
 * LÓGICA DEL PANEL DE EMPLEADO DE SISTEMAS - MUNICIPALIDAD DE CONCORDIA
 * Módulo: Incidencias - Sistemas y Notificaciones.
 * - Carga de incidencias asignadas al técnico autenticado
 * - Finalización de incidencias con registro de resolución técnica
 * - Notificación por correo electrónico y feedback en tiempo real
 * ============================================================================
 */

const API_BASE_URL = '/api/v1';

let authToken = localStorage.getItem('token');
let currentUser = null;
let incidenciasAsignadas = [];
let filtroActual = 'todos';

// Elementos de la interfaz
let modalFinalizarBs = null;
let modalVerResolucionBs = null;
let toastBs = null;
let incidenciaSeleccionada = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar componentes de Bootstrap
    const modalFinalizarEl = document.getElementById('modalFinalizar');
    if (modalFinalizarEl && window.bootstrap) {
        modalFinalizarBs = new bootstrap.Modal(modalFinalizarEl);
    }

    const modalVerResEl = document.getElementById('modalVerResolucion');
    if (modalVerResEl && window.bootstrap) {
        modalVerResolucionBs = new bootstrap.Modal(modalVerResEl);
    }

    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        toastBs = new bootstrap.Toast(toastEl, { delay: 4000 });
    }

    // 2. Validar autenticación y rol de Sistemas (rol 2 o 3)
    if (!validarSesion()) {
        return;
    }

    // 3. Vincular eventos de la interfaz
    document.getElementById('btnLogoutSistemas')?.addEventListener('click', cerrarSesion);
    document.getElementById('btnRefrescar')?.addEventListener('click', () => cargarIncidenciasAsignadas());
    document.getElementById('formFinalizarIncidencia')?.addEventListener('submit', finalizarIncidenciaSubmit);

    // Eventos de los botones de filtro
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            filtroActual = e.currentTarget.getAttribute('data-filter');
            renderizarTabla();
        });
    });

    // 4. Cargar incidencias iniciales
    cargarIncidenciasAsignadas();
});

/**
 * Valida la existencia del token y asegura que el rol pertenezca al área de Sistemas.
 */
function validarSesion() {
    const userStr = localStorage.getItem('usuario');
    if (!authToken || !userStr) {
        window.location.href = 'index.html';
        return false;
    }

    try {
        currentUser = JSON.parse(userStr);
        // Roles permitidos: 2 (Empleado de Sistemas) o 3 (Director de Sistemas)
        if (currentUser.rol !== 2 && currentUser.rol !== 3) {
            alert('Acceso restringido: Se requieren permisos del Área de Sistemas.');
            window.location.href = 'index.html';
            return false;
        }

        // Mostrar nombre y rol en el encabezado
        const lblNombre = document.getElementById('lblSistemasNombre');
        const lblRol = document.getElementById('lblSistemasRol');
        if (lblNombre) lblNombre.textContent = `${currentUser.nombres} ${currentUser.apellidos}`;
        if (lblRol) lblRol.textContent = currentUser.rol === 3 ? 'Director de Sistemas' : 'Empleado de Sistemas';

        return true;
    } catch (e) {
        localStorage.clear();
        window.location.href = 'index.html';
        return false;
    }
}

/**
 * Petición con cabecera de autenticación JWT.
 */
async function fetchConAuth(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${authToken}`;
    return fetch(url, options);
}

/**
 * Obtiene las incidencias asignadas al técnico autenticado desde la API REST.
 */
async function cargarIncidenciasAsignadas() {
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-5">
                    <div class="spinner-border spinner-border-sm text-concordia me-2" role="status"></div>
                    Cargando incidencias asignadas...
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/sistemas/incidencias`);

        if (response.status === 401 || response.status === 403) {
            mostrarToast('Sesión inválida o permisos insuficientes', 'danger');
            setTimeout(() => { cerrarSesion(); }, 1500);
            return;
        }

        if (!response.ok) {
            throw new Error('Error al obtener la lista de incidencias');
        }

        incidenciasAsignadas = await response.json();
        actualizarMetricas();
        renderizarTabla();

    } catch (error) {
        console.error('Error cargando incidencias asignadas:', error);
        mostrarToast(error.message, 'danger');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle me-1"></i> No se pudieron cargar las incidencias. Por favor, reintenta.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Calcula y actualiza las tarjetas de métricas numéricas.
 */
function actualizarMetricas() {
    const total = incidenciasAsignadas.length;
    const pendientes = incidenciasAsignadas.filter(i => i.id_estado === 1).length;
    const enProceso = incidenciasAsignadas.filter(i => i.id_estado === 2).length;
    const resueltas = incidenciasAsignadas.filter(i => i.id_estado === 3).length;

    const elTotal = document.getElementById('metricTotal');
    const elPendientes = document.getElementById('metricPendientes');
    const elEnProceso = document.getElementById('metricEnProceso');
    const elResueltas = document.getElementById('metricResueltas');

    if (elTotal) elTotal.textContent = total;
    if (elPendientes) elPendientes.textContent = pendientes;
    if (elEnProceso) elEnProceso.textContent = enProceso;
    if (elResueltas) elResueltas.textContent = resueltas;
}

/**
 * Renderiza el cuerpo de la tabla con los datos filtrados.
 */
function renderizarTabla() {
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (!tbody) return;

    let lista = [...incidenciasAsignadas];

    if (filtroActual === 'pendientes') {
        lista = lista.filter(i => i.id_estado === 1);
    } else if (filtroActual === 'proceso') {
        lista = lista.filter(i => i.id_estado === 2);
    } else if (filtroActual === 'resueltas') {
        lista = lista.filter(i => i.id_estado === 3);
    }

    const lblCantidad = document.getElementById('lblCantidadFiltrada');
    if (lblCantidad) {
        lblCantidad.textContent = `Mostrando ${lista.length} de ${incidenciasAsignadas.length} incidencias`;
    }

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    No se encontraron incidencias en esta categoría.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    lista.forEach(inc => {
        const tr = document.createElement('tr');

        // Formato de Estado
        let badgeEstado = '';
        const estDesc = (inc.estado_descripcion || '').toLowerCase();
        if (inc.id_estado === 1 || estDesc.includes('pendiente')) {
            badgeEstado = `<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Pendiente</span>`;
        } else if (inc.id_estado === 2 || estDesc.includes('proceso')) {
            badgeEstado = `<span class="badge bg-info text-dark"><i class="bi bi-tools me-1"></i>En Proceso</span>`;
        } else if (inc.id_estado === 3 || estDesc.includes('resuel') || estDesc.includes('finaliz')) {
            badgeEstado = `<span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i>Resuelta</span>`;
        } else if (inc.id_estado === 4 || estDesc.includes('cancel')) {
            badgeEstado = `<span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Cancelada</span>`;
        } else {
            badgeEstado = `<span class="badge bg-light text-dark">${escapeHtml(inc.estado_descripcion || 'Sin estado')}</span>`;
        }

        // Formato de Prioridad
        let badgePrioridad = '';
        if (inc.prioridad === 1) {
            badgePrioridad = `<span class="badge bg-danger">Alta</span>`;
        } else if (inc.prioridad === 2) {
            badgePrioridad = `<span class="badge bg-warning text-dark">Media</span>`;
        } else {
            badgePrioridad = `<span class="badge bg-info text-dark">Baja</span>`;
        }

        // Formato de Fecha
        const fecha = new Date(inc.creado).toLocaleDateString('es-AR', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        // Solicitante
        const solicitanteInfo = `
            <div class="fw-bold text-dark small">${escapeHtml(inc.usuario_creador || 'Solicitante')}</div>
            <div class="text-muted" style="font-size: 11px;">
                <span class="badge bg-light text-muted border">${escapeHtml(inc.area_solicitante || 'Área')}</span>
                ${inc.usuario_creador_email ? `&bull; ${escapeHtml(inc.usuario_creador_email)}` : ''}
            </div>
        `;

        // Columna de Acciones
        let accionesHtml = '';
        if (inc.id_estado === 1 || inc.id_estado === 2) {
            accionesHtml = `
                <button class="btn btn-sm btn-concordia fw-semibold py-1 px-2" onclick="abrirModalFinalizar(${inc.id_incidencia})">
                    <i class="bi bi-check2-square me-1"></i> Finalizar
                </button>
            `;
        } else if (inc.id_estado === 3) {
            accionesHtml = `
                <button class="btn btn-sm btn-outline-success fw-semibold py-1 px-2" onclick="abrirModalVerResolucion(${inc.id_incidencia})">
                    <i class="bi bi-eye me-1"></i> Ver Solución
                </button>
            `;
        } else {
            accionesHtml = `<span class="text-muted small">Sin acciones</span>`;
        }

        tr.innerHTML = `
            <td class="fw-bold text-concordia-dark">#${inc.id_incidencia}</td>
            <td class="text-muted small">${fecha}</td>
            <td>${solicitanteInfo}</td>
            <td class="fw-semibold small">${escapeHtml(inc.articulo_descripcion || 'Artículo')}</td>
            <td class="small text-muted" style="max-width: 260px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
            <td>${badgePrioridad}</td>
            <td>${badgeEstado}</td>
            <td class="text-end">${accionesHtml}</td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Abre el modal para ingresar la resolución y finalizar la incidencia.
 */
window.abrirModalFinalizar = function(idIncidencia) {
    const inc = incidenciasAsignadas.find(i => i.id_incidencia === idIncidencia);
    if (!inc) return;

    incidenciaSeleccionada = inc;

    document.getElementById('modalIncidenciaId').textContent = inc.id_incidencia;
    document.getElementById('modalSolicitante').textContent = `${inc.usuario_creador || 'Solicitante'} (${inc.usuario_creador_email || ''})`;
    document.getElementById('modalArticulo').textContent = inc.articulo_descripcion || 'Artículo';
    document.getElementById('modalDescripcion').textContent = inc.descripcion_pedido || 'Sin detalles';

    const txtRes = document.getElementById('txtResolucion');
    if (txtRes) txtRes.value = '';

    if (modalFinalizarBs) {
        modalFinalizarBs.show();
    }
};

/**
 * Abre el modal de consulta para ver la solución aplicada a una incidencia resuelta.
 */
window.abrirModalVerResolucion = function(idIncidencia) {
    const inc = incidenciasAsignadas.find(i => i.id_incidencia === idIncidencia);
    if (!inc) return;

    document.getElementById('verModalId').textContent = inc.id_incidencia;
    document.getElementById('verModalEquipo').textContent = `${inc.articulo_descripcion || 'Equipo'} — Solicitado por ${inc.usuario_creador || 'Empleado'}`;
    document.getElementById('verModalFalla').textContent = inc.descripcion_pedido || 'Sin descripción';
    document.getElementById('verModalResolucion').textContent = inc.descripcion_resolucion || 'Resolución completada por el técnico de Sistemas.';

    if (modalVerResolucionBs) {
        modalVerResolucionBs.show();
    }
};

/**
 * Envía la petición PUT para finalizar la incidencia y disparar el correo.
 */
async function finalizarIncidenciaSubmit(e) {
    e.preventDefault();

    if (!incidenciaSeleccionada) return;

    const txtRes = document.getElementById('txtResolucion');
    const resolucion = txtRes ? txtRes.value.trim() : '';

    if (!resolucion) {
        mostrarToast('Debes ingresar la descripción de la resolución técnica.', 'warning');
        return;
    }

    const btnSubmit = document.getElementById('btnConfirmarFinalizar');
    const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Finalizando y enviando correo...`;
    }

    try {
        const response = await fetchConAuth(`${API_BASE_URL}/sistemas/incidencias/${incidenciaSeleccionada.id_incidencia}/finalizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descripcion_resolucion: resolucion })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'Error al finalizar la incidencia');
        }

        if (modalFinalizarBs) {
            modalFinalizarBs.hide();
        }

        mostrarToast(`✅ Incidencia #${incidenciaSeleccionada.id_incidencia} finalizada exitosamente. Notificación por correo enviada.`, 'success');

        // Recargar la tabla con los nuevos datos
        await cargarIncidenciasAsignadas();

    } catch (error) {
        console.error('Error al finalizar incidencia:', error);
        mostrarToast(error.message, 'danger');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    }
}

/**
 * Cierra la sesión activa y redirige al login.
 */
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}

/**
 * Muestra una notificación Toast emergente en pantalla.
 */
function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');

    if (!toastEl || !toastBody) return;

    toastEl.className = 'toast align-items-center text-white border-0';
    if (tipo === 'success') {
        toastEl.classList.add('bg-concordia-light');
    } else if (tipo === 'danger' || tipo === 'error') {
        toastEl.classList.add('bg-danger');
    } else if (tipo === 'warning') {
        toastEl.classList.add('bg-warning', 'text-dark');
    } else {
        toastEl.classList.add('bg-secondary');
    }

    toastBody.textContent = mensaje;
    if (toastBs) toastBs.show();
}

/**
 * Sanitiza texto para prevenir inyección HTML / XSS.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
