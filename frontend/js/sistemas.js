/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - PANEL DEL EMPLEADO DE SISTEMAS
 * ============================================================================
 */

import * as bootstrap from 'bootstrap';
window.bootstrap = bootstrap;

const API_BASE_URL = '/api/v1';

// Estado global de la vista
let tokenJWT = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
let incidenciasCache = [];
let filtroEstadoActual = 'todos';
let idIncidenciaSeleccionadaModal = null;

// Referencias a Modales y Notificaciones de Bootstrap
let modalFinalizarBs = null;
let modalVerResolucionBs = null;
let toastBs = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar autenticación de usuario con rol 2 (Empleado de Sistemas) o rol 1 (Director)
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch (e) {
        userData = null;
    }

    if (!tokenJWT || !userData || (userData.rol !== 2 && userData.rol !== 1)) {
        console.warn('Acceso restringido: Se requiere rol de Empleado de Sistemas');
        window.location.href = 'index.html';
        return;
    }

    // 2. Inicializar modales y componentes de Bootstrap
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

    // 3. Cargar datos del usuario en la cabecera
    const lblNombre = document.getElementById('lblSistemasNombre');
    if (lblNombre && userData.nombres) {
        lblNombre.textContent = `${userData.nombres} ${userData.apellidos || ''}`.trim();
    }

    // 4. Cargar incidencias asignadas
    cargarIncidenciasAsignadas();

    // 5. Configurar Event Listeners
    setupEventListenersSistemas();
});

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (tokenJWT) {
        headers['Authorization'] = `Bearer ${tokenJWT}`;
    }
    return headers;
}

function setupEventListenersSistemas() {
    // Cerrar sesión
    const btnLogout = document.getElementById('btnLogoutSistemas');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('usuario');
            window.location.href = 'index.html';
        });
    }

    // Refrescar listado
    const btnRefrescar = document.getElementById('btnRefrescar');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => {
            cargarIncidenciasAsignadas();
            mostrarToast('Listado de incidencias actualizado', 'info');
        });
    }

    // Filtros rápidos
    const btnGroup = document.querySelector('.btn-group[aria-label="Filtro de Estado"]');
    if (btnGroup) {
        btnGroup.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                btnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                filtroEstadoActual = e.target.dataset.filter || 'todos';
                aplicarFiltroYRenderizar();
            }
        });
    }

    // Formulario de finalización de incidencia
    const formFinalizar = document.getElementById('formFinalizarIncidencia');
    if (formFinalizar) {
        formFinalizar.addEventListener('submit', enviarFinalizacionIncidencia);
    }

    // Delegación de eventos para la tabla
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id, 10);
            if (!id) return;

            if (action === 'finalizar') {
                abrirModalFinalizar(id);
            } else if (action === 'ver-resolucion') {
                abrirModalVerResolucion(id);
            }
        });
    }
}

async function cargarIncidenciasAsignadas() {
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm text-concordia me-2" role="status"></div>
                Cargando incidencias asignadas...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/sistemas/incidencias`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al consultar incidencias asignadas');
        }

        incidenciasCache = await response.json();
        actualizarMetricasCards(incidenciasCache);
        aplicarFiltroYRenderizar();

    } catch (error) {
        console.error('Error cargando incidencias asignadas:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger py-4">
                    Error al conectar con la API REST de Sistemas. Verifique su conexión o sesión.
                </td>
            </tr>
        `;
    }
}

function actualizarMetricasCards(incidencias) {
    let total = incidencias.length;
    let pend = 0;
    let proc = 0;
    let res = 0;

    incidencias.forEach(inc => {
        const est = (inc.estado_descripcion || '').toLowerCase();
        if (est.includes('pendiente') || inc.id_estado === 1) pend++;
        else if (est.includes('proceso') || inc.id_estado === 2) proc++;
        else if (est.includes('resuel') || est.includes('finaliz') || inc.id_estado === 3) res++;
    });

    document.getElementById('metricTotal').textContent = total;
    document.getElementById('metricPendientes').textContent = pend;
    document.getElementById('metricEnProceso').textContent = proc;
    document.getElementById('metricResueltas').textContent = res;
}

function aplicarFiltroYRenderizar() {
    let filtradas = [...incidenciasCache];

    if (filtroEstadoActual === 'pendientes') {
        filtradas = filtradas.filter(inc => inc.id_estado === 1 || (inc.estado_descripcion || '').toLowerCase().includes('pendiente'));
    } else if (filtroEstadoActual === 'proceso') {
        filtradas = filtradas.filter(inc => inc.id_estado === 2 || (inc.estado_descripcion || '').toLowerCase().includes('proceso'));
    } else if (filtroEstadoActual === 'resueltas') {
        filtradas = filtradas.filter(inc => inc.id_estado === 3 || (inc.estado_descripcion || '').toLowerCase().includes('resuel'));
    }

    const lbl = document.getElementById('lblCantidadFiltrada');
    if (lbl) {
        lbl.textContent = `Mostrando ${filtradas.length} de ${incidenciasCache.length} incidencias`;
    }

    renderizarTablaSistemas(filtradas);
}

function renderizarTablaSistemas(lista) {
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">No existen incidencias en esta categoría.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(inc => {
        const fechaFmt = new Date(inc.creado).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Badge Prioridad
        let badgePrio = '<span class="badge bg-info text-dark">Baja</span>';
        if (inc.prioridad === 1) badgePrio = '<span class="badge bg-danger">Alta</span>';
        else if (inc.prioridad === 2) badgePrio = '<span class="badge bg-warning text-dark">Media</span>';

        // Badge Estado
        const estDesc = (inc.estado_descripcion || 'Pendiente').toLowerCase();
        let badgeEst = '<span class="badge bg-secondary">Desconocido</span>';
        if (estDesc.includes('pendiente') || inc.id_estado === 1) {
            badgeEst = '<span class="badge bg-warning text-dark">Pendiente</span>';
        } else if (estDesc.includes('proceso') || inc.id_estado === 2) {
            badgeEst = '<span class="badge bg-info text-dark">En Proceso</span>';
        } else if (estDesc.includes('resuel') || estDesc.includes('finaliz') || inc.id_estado === 3) {
            badgeEst = '<span class="badge bg-success">Resuelta</span>';
        } else if (estDesc.includes('cancel') || inc.id_estado === 4) {
            badgeEst = '<span class="badge bg-secondary">Cancelada</span>';
        }

        const esFinalizada = (inc.id_estado === 3 || estDesc.includes('resuel') || estDesc.includes('finaliz'));
        const esCancelada = (inc.id_estado === 4 || estDesc.includes('cancel'));

        let botonAccion = '';
        if (esFinalizada) {
            botonAccion = `<button data-action="ver-resolucion" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-success fw-semibold"><i class="bi bi-eye me-1"></i> Ver Solución</button>`;
        } else if (esCancelada) {
            botonAccion = `<span class="text-muted small">Cancelada</span>`;
        } else {
            botonAccion = `<button data-action="finalizar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-concordia fw-bold"><i class="bi bi-check2-circle me-1"></i> Finalizar Ticket</button>`;
        }

        return `
            <tr>
                <td class="fw-bold">#${inc.id_incidencia}</td>
                <td class="small text-muted">${fechaFmt}</td>
                <td class="small">
                    <div class="fw-bold text-dark">${escapeHtml(inc.usuario_creador || 'Empleado')}</div>
                    <div class="text-muted text-truncate" style="max-width: 140px;">${escapeHtml(inc.area_solicitante || 'Área Municipal')}</div>
                </td>
                <td class="fw-semibold small">${escapeHtml(inc.articulo_descripcion || 'Artículo')}</td>
                <td class="small text-wrap" style="max-width: 220px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
                <td>${badgePrio}</td>
                <td>${badgeEst}</td>
                <td class="text-end">${botonAccion}</td>
            </tr>
        `;
    }).join('');
}

function abrirModalFinalizar(idIncidencia) {
    const inc = incidenciasCache.find(i => i.id_incidencia === idIncidencia);
    if (!inc) return;

    idIncidenciaSeleccionadaModal = idIncidencia;

    document.getElementById('modalIncidenciaId').textContent = idIncidencia;
    document.getElementById('modalSolicitante').textContent = `${inc.usuario_creador || 'Empleado'} (${inc.area_solicitante || 'Área Municipal'})`;
    document.getElementById('modalArticulo').textContent = inc.articulo_descripcion || 'Artículo';
    document.getElementById('modalDescripcion').textContent = inc.descripcion_pedido || 'Sin descripción';
    document.getElementById('txtResolucion').value = '';

    if (modalFinalizarBs) {
        modalFinalizarBs.show();
    }
}

async function enviarFinalizacionIncidencia(e) {
    e.preventDefault();

    if (!idIncidenciaSeleccionadaModal) return;

    const descripcion_resolucion = document.getElementById('txtResolucion').value.trim();
    if (!descripcion_resolucion) {
        mostrarToast('Debes ingresar la descripción de la resolución técnica.', 'error');
        return;
    }

    const btnSubmit = document.getElementById('btnConfirmarFinalizar');
    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Procesando...`;

        const response = await fetch(`${API_BASE_URL}/sistemas/incidencias/${idIncidenciaSeleccionadaModal}/finalizar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ descripcion_resolucion })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'Error al finalizar la incidencia');
        }

        mostrarToast(`¡Incidencia #${idIncidenciaSeleccionadaModal} resuelta! Notificación por correo enviada.`, 'exito');

        if (modalFinalizarBs) {
            modalFinalizarBs.hide();
        }

        await cargarIncidenciasAsignadas();

    } catch (error) {
        console.error('Error al finalizar incidencia:', error);
        mostrarToast(error.message, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-send-check me-1"></i> Finalizar y Notificar`;
    }
}

function abrirModalVerResolucion(idIncidencia) {
    const inc = incidenciasCache.find(i => i.id_incidencia === idIncidencia);
    if (!inc) return;

    document.getElementById('verModalId').textContent = idIncidencia;
    document.getElementById('verModalEquipo').textContent = `${inc.articulo_descripcion || 'Equipo'} — Solicitado por ${inc.usuario_creador || 'Empleado'}`;
    document.getElementById('verModalFalla').textContent = inc.descripcion_pedido || 'Sin descripción del inconveniente';
    document.getElementById('verModalResolucion').textContent = inc.descripcion_resolucion || 'Resolución registrada sin detalle en texto.';

    if (modalVerResolucionBs) {
        modalVerResolucionBs.show();
    }
}

function mostrarToast(mensaje, tipo = 'exito') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');

    if (!toastEl || !toastBody || !toastBs) return;

    toastEl.classList.remove('bg-danger', 'bg-success', 'bg-concordia-light', 'bg-secondary');

    if (tipo === 'exito') {
        toastEl.classList.add('bg-concordia-light');
    } else if (tipo === 'error') {
        toastEl.classList.add('bg-danger');
    } else {
        toastEl.classList.add('bg-secondary');
    }

    toastBody.textContent = mensaje;
    toastBs.show();
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
