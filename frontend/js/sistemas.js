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

// Paginación de Sistemas
let paginaActualSistemas = 1;
const limiteSistemas = 10;
let totalRegistrosSistemas = 0;
let totalPaginasSistemas = 1;

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
            const rol = user && user.rol ? Number(user.rol) : 2;
            if (rol === 1) {
                window.location.href = 'director.html';
            } else if (rol === 2) {
                window.location.href = 'sistemas.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    });

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
        btnRefrescar.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn?.blur();
            const icon = btn?.querySelector('i');
            if (btn) btn.disabled = true;
            if (icon) icon.classList.add('spin');
            btn?.classList.add('opacity-75');

            try {
                await cargarIncidenciasAsignadas(paginaActualSistemas, true);
                mostrarToast('Listado de incidencias actualizado correctamente.', 'info');
            } catch (err) {
                console.error('Error al actualizar incidencias asignadas:', err);
                mostrarToast('Error al actualizar el listado de incidencias.', 'error');
            } finally {
                if (btn) btn.disabled = false;
                if (icon) icon.classList.remove('spin');
                btn?.classList.remove('opacity-75');
            }
        });
    }

    // Filtros rápidos
    const btnGroup = document.querySelector('.btn-group[aria-label="Filtro de Estado"]');
    if (btnGroup) {
        btnGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn) {
                btnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filtroEstadoActual = btn.dataset.filter || 'todos';
                paginaActualSistemas = 1;
                cargarIncidenciasAsignadas(1);
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

            if (action === 'iniciar') {
                iniciarAtencionIncidencia(id, btn);
            } else if (action === 'finalizar') {
                abrirModalFinalizar(id);
            } else if (action === 'ver-resolucion') {
                abrirModalVerResolucion(id);
            }
        });
    }
}

/**
 * GET /incidencias: para el rol Sistemas devuelve las incidencias asignadas a su cargo con paginación LIMIT/OFFSET.
 */
async function cargarIncidenciasAsignadas(pagina = 1, forzarRefresco = false) {
    paginaActualSistemas = pagina;
    const tbody = document.getElementById('tbodyIncidenciasSistemas');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="100%" class="text-center text-muted py-4">
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Actualizando datos...
            </td>
        </tr>
    `;

    try {
        let filtroUrl = '';
        if (filtroEstadoActual === 'pendientes') filtroUrl = '&id_estado=1';
        else if (filtroEstadoActual === 'proceso') filtroUrl = '&id_estado=2';
        else if (filtroEstadoActual === 'resueltas') filtroUrl = '&id_estado=3';

        const cacheBuster = forzarRefresco ? `&_t=${Date.now()}` : '';
        const response = await fetch(`${API_BASE_URL}/incidencias?page=${pagina}&limit=${limiteSistemas}${filtroUrl}${cacheBuster}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al consultar incidencias asignadas');
        }

        const rawData = await response.json();
        incidenciasCache = Array.isArray(rawData) ? rawData : (rawData.data || []);
        const pagination = rawData.pagination || {
            total: incidenciasCache.length,
            page: pagina,
            limit: limiteSistemas,
            total_pages: Math.ceil(incidenciasCache.length / limiteSistemas) || 1
        };

        totalRegistrosSistemas = pagination.total;
        totalPaginasSistemas = pagination.total_pages || 1;

        renderizarTablaSistemas(incidenciasCache);

        // Actualizar paginador y leyenda
        const ulPag = document.getElementById('paginacionSistemas');
        const lblInfo = document.getElementById('lblInfoPaginacionSistemas');
        const lblTop = document.getElementById('lblCantidadFiltrada');

        renderizarPaginador({
            ulElement: ulPag,
            infoElement: lblInfo,
            total: totalRegistrosSistemas,
            page: paginaActualSistemas,
            limit: limiteSistemas,
            totalPages: totalPaginasSistemas,
            onCambiarPagina: (nuevaPagina) => cargarIncidenciasAsignadas(nuevaPagina),
            singular: 'incidencia asignada',
            plural: 'incidencias asignadas'
        });

        if (lblTop && lblInfo) {
            lblTop.textContent = lblInfo.textContent;
        }

        // Cargar métricas en segundo plano para reflejar totales reales de toda la asignación
        cargarMetricasGlobalesSistemas();

    } catch (error) {
        console.error('Error cargando incidencias asignadas:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-1"></i> Error al cargar datos: ${escapeHtml(error.message || 'No fue posible cargar las incidencias asignadas')}
                </td>
            </tr>
        `;
        throw error;
    }
}

async function cargarMetricasGlobalesSistemas() {
    try {
        const headers = getAuthHeaders();
        const consultarTotal = async (query = '') => {
            const res = await fetch(`${API_BASE_URL}/incidencias?page=1&limit=1${query}`, { headers });
            if (!res.ok) return 0;
            const body = await res.json();
            return body?.pagination?.total ?? 0;
        };

        const [total, pend, proc, res] = await Promise.all([
            consultarTotal(''),
            consultarTotal('&id_estado=1'),
            consultarTotal('&id_estado=2'),
            consultarTotal('&id_estado=3')
        ]);

        document.getElementById('metricTotal').textContent = total;
        document.getElementById('metricPendientes').textContent = pend;
        document.getElementById('metricEnProceso').textContent = proc;
        document.getElementById('metricResueltas').textContent = res;
    } catch (_) {
        // Silencioso en actualización secundaria de métricas
    }
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

        const esPendiente = (inc.id_estado === 1 || estDesc.includes('pendiente'));
        const esEnProceso = (inc.id_estado === 2 || estDesc.includes('proceso'));
        const esFinalizada = (inc.id_estado === 3 || estDesc.includes('resuel') || estDesc.includes('finaliz'));
        const esCancelada = (inc.id_estado === 4 || estDesc.includes('cancel'));

        let botonAccion = '';
        if (esFinalizada) {
            botonAccion = `
                <div class="d-inline-flex align-items-center gap-1 justify-content-end">
                    <span class="badge bg-success-subtle text-success border border-success-subtle fw-semibold py-1 px-2 text-nowrap"><i class="bi bi-check-circle-fill me-1"></i>Completada</span>
                    <button data-action="ver-resolucion" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-concordia btn-row-action fw-semibold ms-1 text-nowrap" title="Ver solución técnica"><i class="bi bi-eye me-1"></i>Ver</button>
                </div>
            `;
        } else if (esCancelada) {
            botonAccion = `<span class="text-muted small">Sin acciones</span>`;
        } else if (esPendiente) {
            botonAccion = `<button data-action="iniciar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-outline-primary btn-row-action fw-semibold text-nowrap" title="Iniciar atención técnica y pasar a En Proceso"><i class="bi bi-play-circle me-1"></i> Comenzar</button>`;
        } else if (esEnProceso) {
            botonAccion = `<button data-action="finalizar" data-id="${inc.id_incidencia}" class="btn btn-sm btn-success btn-row-action fw-semibold text-nowrap" title="Finalizar incidencia y registrar solución técnica"><i class="bi bi-check2-circle me-1"></i> Resolver Incidencia</button>`;
        } else {
            botonAccion = `<span class="text-muted small">—</span>`;
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

/**
 * Inicia la atención técnica de una incidencia asignada.
 * PUT /incidencias/:id/en-proceso
 */
async function iniciarAtencionIncidencia(idIncidencia, btnElement) {
    if (!idIncidencia) return;

    const confirmar = window.confirm(`¿Deseas iniciar la atención de la incidencia #${idIncidencia} y pasarla a estado "En Proceso"?`);
    if (!confirmar) return;

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Iniciando...`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/incidencias/${idIncidencia}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_estado: 2 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'No fue posible iniciar la atención de la incidencia. Por favor, intente nuevamente.');
        }

        mostrarToast(`Incidencia #${idIncidencia} iniciada. Ahora se encuentra En Proceso.`, 'exito');
        await cargarIncidenciasAsignadas(paginaActualSistemas);

    } catch (error) {
        console.error('Error al iniciar atención de incidencia:', error);
        mostrarToast(error.message, 'error');
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = `<i class="bi bi-play-circle me-1"></i> Comenzar`;
        }
    }
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

/**
 * Finaliza la incidencia.
 * PUT /incidencias/:id/finalizar con { descripcion_resolucion }.
 */
async function enviarFinalizacionIncidencia(e) {
    e.preventDefault();

    if (!idIncidenciaSeleccionadaModal) return;

    const descripcion_resolucion = document.getElementById('txtResolucion').value.trim();
    if (!descripcion_resolucion) {
        mostrarToast('Por favor, describa la solución técnica aplicada.', 'error');
        return;
    }

    const idFinalizada = idIncidenciaSeleccionadaModal;
    const btnSubmit = document.getElementById('btnConfirmarFinalizar');
    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Procesando...`;
        
        const response = await fetch(`${API_BASE_URL}/incidencias/${idFinalizada}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                id_estado: 3, 
                descripcion_resolucion: descripcion_resolucion 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'No fue posible registrar la resolución de la incidencia. Por favor, intente nuevamente.');
        }

        // El aviso depende del resultado real del envío del correo
        const correo = data.notificacion_email;
        if (correo && correo.exito) {
            mostrarToast(`Incidencia #${idFinalizada} resuelta. Se notificó al solicitante por correo electrónico.`, 'exito');
        } else {
            mostrarToast(`Incidencia #${idFinalizada} resuelta correctamente (aviso por correo pendiente de entrega).`, 'info');
        }

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
    document.getElementById('verModalResolucion').textContent = inc.descripcion_resolucion || 'Resolución registrada sin observaciones adicionales.';

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