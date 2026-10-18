/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - PANEL DEL DIRECTOR DE SISTEMAS
 * Lógica Frontend: Consumo de endpoints REST con token JWT, Dashboard y PDF
 * NO UTILIZA IMÁGENES, ÍCONOS NI SVG BAJO NINGUNA CIRCUNSTANCIA.
 * ============================================================================
 */

// URL Base de la API REST
const API_BASE_URL = '/api/v1';

// Variables de estado local
let tokenJWT = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
let empleadosSistemas = [];
let incidenciaSeleccionadaModal = null;
let bsToastDirector = null;
let modalAsignarInstance = null;

/**
 * Evento principal DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación y validar que sea el Director de Sistemas (rol = 3)
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch (e) {
        userData = null;
    }

    if (!tokenJWT || !userData || (userData.rol !== 3 && userData.usuario !== 'estren@correo.com')) {
        console.warn('Acceso denegado: Usuario no autorizado para el Panel de Director');
        window.location.href = 'index.html';
        return;
    }

    // Inicializar notificación Toast
    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        bsToastDirector = new bootstrap.Toast(toastEl, { delay: 4000 });
    }

    // Inicializar Modal de Asignación de Bootstrap
    const modalEl = document.getElementById('modalAsignar');
    if (modalEl && window.bootstrap) {
        modalAsignarInstance = new bootstrap.Modal(modalEl);
    }

    // Configurar fecha actual de emisión en reporte
    const fechaEl = document.getElementById('reporteFechaEmision');
    if (fechaEl) {
        fechaEl.textContent = `Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`;
    }

    // Actualizar nombre y rol en la cabecera si están disponibles
    const lblNombre = document.getElementById('lblDirectorNombre');
    if (lblNombre && userData.nombres) {
        lblNombre.textContent = `${userData.nombres} ${userData.apellidos || ''}`.trim();
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
    // Botón para cerrar sesión
    const btnLogout = document.getElementById('btnLogoutDirector');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = 'index.html';
        });
    }

    // Botón de refrescar gestión de incidencias
    const btnRefresh = document.getElementById('btnRefreshGestion');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            cargarGestionIncidencias();
            cargarDashboard();
            mostrarToastDirector('Listado de gestión actualizado', 'info');
        });
    }

    // Botón de confirmar asignación en el modal
    const btnConfirmar = document.getElementById('btnConfirmarAsignacion');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', ejecutarAsignacion);
    }

    // Botón para la generación e impresión del reporte PDF
    const btnPDF = document.getElementById('btnGenerarPDF');
    if (btnPDF) {
        btnPDF.addEventListener('click', generarReportePDF);
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
 */
async function cargarDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/director/dashboard`, {
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
                tbodyPrio.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No existen incidencias de alta prioridad activas</td></tr>';
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
                        <td class="small fw-semibold">${escapeHtml(inc.articulo_descripcion || 'Artículo')} - ${escapeHtml(inc.descripcion_pedido || '')}</td>
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
 */
async function cargarEmpleadosSistemas() {
    try {
        const response = await fetch(`${API_BASE_URL}/director/empleados-sistemas`, {
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
    } catch (error) {
        console.error('Error al cargar empleados de sistemas:', error);
    }
}

/**
 * Carga todas las incidencias para la tabla interactiva de gestión y asignación.
 */
async function cargarGestionIncidencias() {
    const tbody = document.getElementById('tbodyGestion');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Cargando incidencias...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/director/incidencias`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al obtener incidencias para gestión');

        const incidencias = await response.json();
        tbody.innerHTML = '';

        if (!incidencias || incidencias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay incidencias registradas.</td></tr>';
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

            const esCancelada = (inc.id_estado === 4 || estadoNom.includes('cancel'));
            const esPendiente = (inc.id_estado === 1 || estadoNom.includes('pendiente'));

            // Botón para Asignar (Deshabilitado si está Cancelada)
            const btnAsignar = esCancelada
                ? `<button class="btn btn-sm btn-outline-secondary me-1 fw-semibold" disabled title="Incidencia cancelada">Asignar</button>`
                : `<button onclick="abrirModalAsignar(${inc.id_incidencia})" class="btn btn-sm btn-outline-concordia me-1 fw-semibold">Asignar</button>`;

            // Botón para Cancelar (Soft delete habilitado únicamente si está Pendiente)
            const btnCancelar = esPendiente
                ? `<button onclick="cancelarIncidenciaDirector(${inc.id_incidencia})" class="btn btn-sm btn-outline-danger fw-semibold">Cancelar</button>`
                : `<span class="text-muted small">N/A</span>`;

            tr.innerHTML = `
                <td class="fw-bold">#${inc.id_incidencia}</td>
                <td class="small fw-semibold">${escapeHtml(inc.usuario_creador || 'Empleado')}</td>
                <td class="small">${escapeHtml(inc.articulo_descripcion || 'Artículo')}</td>
                <td class="small text-wrap" style="max-width: 200px;">${escapeHtml(inc.descripcion_pedido || '')}</td>
                <td>${badgePrio}</td>
                <td>${badgeEst}</td>
                <td class="small fw-bold text-concordia-dark">${escapeHtml(inc.asignado_nombre || 'Sin Asignar')}</td>
                <td class="text-end">${btnAsignar} ${btnCancelar}</td>
            `;

            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error en gestión de incidencias:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error de conexión al cargar el listado.</td></tr>';
    }
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
 * Ejecuta la actualización de asignación mediante petición PUT al backend REST.
 */
async function ejecutarAsignacion() {
    if (!incidenciaSeleccionadaModal) return;

    const select = document.getElementById('selectSistemasEmpleado');
    const id_usuario_sistemas = parseInt(select.value, 10);

    if (!id_usuario_sistemas) {
        mostrarToastDirector('Por favor selecciona un técnico de Sistemas.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/director/incidencias/${incidenciaSeleccionadaModal}/asignar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_usuario_sistemas })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'Error al asignar la incidencia');
        }

        mostrarToastDirector(`Incidencia #${incidenciaSeleccionadaModal} asignada con éxito.`, 'exito');

        if (modalAsignarInstance) {
            modalAsignarInstance.hide();
        }

        // Actualizar vistas
        cargarGestionIncidencias();
        cargarDashboard();

    } catch (error) {
        console.error('Error asignando incidencia:', error);
        mostrarToastDirector(`Error: ${error.message}`, 'error');
    }
}

/**
 * Ejecuta el soft delete (cancelación) de una incidencia con estado 'Pendiente'.
 * @param {number} idIncidencia - ID de la incidencia.
 */
async function cancelarIncidenciaDirector(idIncidencia) {
    if (!confirm(`¿Confirmas la cancelación (soft delete) de la incidencia #${idIncidencia}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/director/incidencias/${idIncidencia}/cancelar`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'No se pudo cancelar la incidencia');
        }

        mostrarToastDirector(`Incidencia #${idIncidencia} cancelada correctamente.`, 'exito');

        cargarGestionIncidencias();
        cargarDashboard();

    } catch (error) {
        console.error('Error cancelando incidencia:', error);
        mostrarToastDirector(`Error: ${error.message}`, 'error');
    }
}

/**
 * Carga las estadísticas para el reporte en la pestaña de reportes.
 */
async function cargarReportesEstadisticos() {
    try {
        const response = await fetch(`${API_BASE_URL}/director/reportes`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al cargar datos estadísticos');

        const data = await response.json();

        document.getElementById('repTotalIncidencias').textContent = data.total_incidencias || 0;

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
 * Genera y descarga el archivo PDF del reporte estadístico.
 */
function generarReportePDF() {
    const elemento = document.getElementById('areaReportePDF');
    if (!elemento) return;

    mostrarToastDirector('Generando archivo PDF...', 'info');

    const opciones = {
        margin:       10,
        filename:     `Reporte_Estadistico_Concordia_${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
        window.html2pdf().set(opciones).from(elemento).save().then(() => {
            mostrarToastDirector('Reporte PDF descargado exitosamente.', 'exito');
        }).catch(err => {
            console.error('Error generando PDF:', err);
            mostrarToastDirector('Error al generar el PDF.', 'error');
        });
    } else {
        window.print();
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
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
