/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - GESTIÓN DE ENTIDADES BASE
 * Lógica de cliente para BREAD completo de Categorías y Artículos:
 * - Browse (Listados interactivos con filtros y búsqueda en tiempo real)
 * - Read (Visualización detallada por ID en modales de Bootstrap)
 * - Edit (Actualización de registros)
 * - Add (Creación de nuevos registros)
 * - Delete (Soft delete / Borrado lógico mediante activo = 0)
 * ============================================================================
 */

const API_BASE_URL = '/api/v1';

// Estado local
let categoriasCache = [];
let articulosCache = [];
let areasCache = [];

// Instancias de Modales y Toast
let bsToast = null;
let modalCatForm = null;
let modalCatDetalle = null;
let modalArtForm = null;
let modalArtDetalle = null;
let modalConfirmDelete = null;

// Registro seleccionado para borrado lógico
let itemABorrar = null; // { tipo: 'categoria'|'articulo', id, nombre }

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Toast de Bootstrap
    const toastEl = document.getElementById('toast');
    if (toastEl && window.bootstrap) {
        bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    }

    // 2. Inicializar Modales
    if (window.bootstrap) {
        modalCatForm = new bootstrap.Modal(document.getElementById('modalCategoriaForm'));
        modalCatDetalle = new bootstrap.Modal(document.getElementById('modalCategoriaDetalle'));
        modalArtForm = new bootstrap.Modal(document.getElementById('modalArticuloForm'));
        modalArtDetalle = new bootstrap.Modal(document.getElementById('modalArticuloDetalle'));
        modalConfirmDelete = new bootstrap.Modal(document.getElementById('modalConfirmSoftDelete'));
    }

    // 3. Comprobar usuario en cabecera
    verificarUsuarioCabecera();

    // 4. Registrar Event Listeners
    setupEventListeners();

    // 5. Cargar datos iniciales
    cargarCategorias();
    cargarAreas();
    cargarArticulos();
});

/**
 * Muestra información del usuario logueado en la barra superior si existe.
 */
function verificarUsuarioCabecera() {
    const lblUser = document.getElementById('lblUserHeader');
    const lblUserRol = document.getElementById('lblUserRolHeader');
    const btnLogout = document.getElementById('btnLogoutHeader');

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = 'index.html';
        });
    }

    try {
        const raw = localStorage.getItem('user_data');
        if (raw) {
            const user = JSON.parse(raw);
            if (lblUser && user && user.nombres) {
                lblUser.textContent = `${user.nombres} ${user.apellidos || ''}`.trim();
            }
            if (lblUserRol && user) {
                const rolTexto = user.rol === 3 ? 'Director de Sistemas' : user.rol === 2 ? 'Empleado de Sistemas' : 'Empleado Municipal';
                lblUserRol.textContent = rolTexto;
            }
        }
    } catch (e) {
        // Ignorar si no hay sesión
    }
}

/**
 * Configura los eventos del DOM para botones y formularios.
 */
function setupEventListeners() {
    // Categorías: Botón nueva
    document.getElementById('btnNuevaCategoria')?.addEventListener('click', abrirModalCrearCategoria);
    // Categorías: Formulario submit
    document.getElementById('formCategoria')?.addEventListener('submit', guardarCategoria);
    // Categorías: Refrescar
    document.getElementById('btnRefrescarCategorias')?.addEventListener('click', () => {
        cargarCategorias();
        mostrarToast('Categorías actualizadas', 'info');
    });
    // Categorías: Filtro checkbox inactivos
    document.getElementById('chkInactivosCategorias')?.addEventListener('change', cargarCategorias);
    // Categorías: Búsqueda reactiva
    document.getElementById('txtBuscarCategoria')?.addEventListener('input', filtrarCategorias);

    // Artículos: Botón nuevo
    document.getElementById('btnNuevoArticulo')?.addEventListener('click', abrirModalCrearArticulo);
    // Artículos: Formulario submit
    document.getElementById('formArticulo')?.addEventListener('submit', guardarArticulo);
    // Artículos: Refrescar
    document.getElementById('btnRefrescarArticulos')?.addEventListener('click', () => {
        cargarArticulos();
        mostrarToast('Artículos actualizados', 'info');
    });
    // Artículos: Filtro checkbox inactivos
    document.getElementById('chkInactivosArticulos')?.addEventListener('change', cargarArticulos);
    // Artículos: Filtro categoría
    document.getElementById('filtroCategoriaArticulo')?.addEventListener('change', filtrarArticulos);
    // Artículos: Filtro área
    document.getElementById('filtroAreaArticulo')?.addEventListener('change', filtrarArticulos);
    // Artículos: Búsqueda reactiva
    document.getElementById('txtBuscarArticulo')?.addEventListener('input', filtrarArticulos);

    // Botón ejecutar borrado lógico
    document.getElementById('btnEjecutarSoftDelete')?.addEventListener('click', ejecutarBorradoLogico);
}

// ============================================================================
// BREAD DE CATEGORÍAS
// ============================================================================

/**
 * BROWSE: Carga el listado de categorías desde la API.
 */
async function cargarCategorias() {
    const tbody = document.getElementById('tbodyCategorias');
    const chkInactivos = document.getElementById('chkInactivosCategorias');
    const incluirInactivos = chkInactivos ? chkInactivos.checked : false;

    try {
        const url = `${API_BASE_URL}/categorias${incluirInactivos ? '?incluir_inactivos=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al consultar categorías');

        categoriasCache = await response.json();
        renderizarTablaCategorias(categoriasCache);
        poblarSelectsCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar categorías: ${escapeHtml(error.message)}</td></tr>`;
    }
}

/**
 * Renderiza las filas en la tabla de categorías.
 */
function renderizarTablaCategorias(lista) {
    const tbody = document.getElementById('tbodyCategorias');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No se encontraron categorías registradas</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const esActivo = c.activo === 1;
        const badgeEstado = esActivo
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activa</span>`
            : `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i class="bi bi-x-circle me-1"></i>Inactiva (Baja)</span>`;

        return `
            <tr class="${!esActivo ? 'table-light opacity-75' : ''}">
                <td class="fw-bold text-muted">#${c.id_categoria}</td>
                <td class="fw-semibold text-dark">${escapeHtml(c.descripcion)}</td>
                <td>${badgeEstado}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-info me-1" onclick="verDetalleCategoria(${c.id_categoria})" title="Ver Detalle (Read)">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarCategoria(${c.id_categoria})" title="Editar (Edit)">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${esActivo ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmarBajaLogica('categoria', ${c.id_categoria}, '${escapeHtml(c.descripcion)}')" title="Baja Lógica (Soft Delete)">
                            <i class="bi bi-trash3"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success" onclick="reactivarCategoria(${c.id_categoria})" title="Reactivar">
                            <i class="bi bi-arrow-counterclockwise me-1"></i>Reactivar
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filtra el listado de categorías reactivamente.
 */
function filtrarCategorias() {
    const q = (document.getElementById('txtBuscarCategoria')?.value || '').toLowerCase().trim();
    const filtradas = categoriasCache.filter(c => c.descripcion.toLowerCase().includes(q));
    renderizarTablaCategorias(filtradas);
}

/**
 * READ: Muestra el modal con el detalle completo de una categoría.
 */
async function verDetalleCategoria(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/categorias/${id}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle de la categoría');
        const cat = await res.json();

        document.getElementById('detCatId').textContent = `#${cat.id_categoria}`;
        document.getElementById('detCatDescripcion').textContent = cat.descripcion;
        document.getElementById('detCatEstado').innerHTML = cat.activo === 1
            ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Activa (activo = 1)</span>`
            : `<span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Inactiva / Baja Lógica (activo = 0)</span>`;

        if (modalCatDetalle) modalCatDetalle.show();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

/**
 * ADD: Abre modal para crear una nueva categoría.
 */
function abrirModalCrearCategoria() {
    document.getElementById('formCategoria').reset();
    document.getElementById('txtCatId').value = '';
    document.getElementById('modalCategoriaFormLabel').innerHTML = `<i class="bi bi-plus-circle me-1"></i> Nueva Categoría`;
    document.getElementById('divCatEstado').classList.add('d-none');
    if (modalCatForm) modalCatForm.show();
}

/**
 * EDIT: Abre modal pre-cargado para editar una categoría existente.
 */
async function abrirModalEditarCategoria(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/categorias/${id}`);
        if (!res.ok) throw new Error('Error al cargar la categoría');
        const cat = await res.json();

        document.getElementById('txtCatId').value = cat.id_categoria;
        document.getElementById('txtCatDescripcion').value = cat.descripcion;
        document.getElementById('selectCatActivo').value = cat.activo;
        document.getElementById('divCatEstado').classList.remove('d-none');
        document.getElementById('modalCategoriaFormLabel').innerHTML = `<i class="bi bi-pencil-square me-1"></i> Editar Categoría #${cat.id_categoria}`;

        if (modalCatForm) modalCatForm.show();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

/**
 * ADD / EDIT: Envía la petición a la API para crear o editar la categoría.
 */
async function guardarCategoria(e) {
    e.preventDefault();
    const id = document.getElementById('txtCatId').value;
    const descripcion = document.getElementById('txtCatDescripcion').value.trim();
    const activo = document.getElementById('selectCatActivo').value;

    if (!descripcion) {
        mostrarToast('Por favor ingrese la descripción de la categoría', 'error');
        return;
    }

    const esEdicion = Boolean(id);
    const url = esEdicion ? `${API_BASE_URL}/categorias/${id}` : `${API_BASE_URL}/categorias`;
    const method = esEdicion ? 'PUT' : 'POST';
    const bodyData = { descripcion };
    if (esEdicion) bodyData.activo = parseInt(activo, 10);

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar la categoría');

        mostrarToast(esEdicion ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente', 'exito');
        if (modalCatForm) modalCatForm.hide();
        await cargarCategorias();
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

/**
 * REACTIVAR: Reactiva una categoría que estaba en baja lógica.
 */
async function reactivarCategoria(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/categorias/${id}/reactivar`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al reactivar categoría');

        mostrarToast('Categoría reactivada exitosamente', 'exito');
        await cargarCategorias();
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

// ============================================================================
// BREAD DE ARTÍCULOS
// ============================================================================

/**
 * Carga el catálogo de áreas para poblar los selectores.
 */
async function cargarAreas() {
    try {
        const res = await fetch(`${API_BASE_URL}/areas`);
        if (!res.ok) throw new Error('Error al consultar áreas');
        areasCache = await res.json();
        poblarSelectsAreas();
    } catch (e) {
        console.warn('Error al cargar áreas:', e);
    }
}

/**
 * BROWSE: Carga el listado de artículos desde la API.
 */
async function cargarArticulos() {
    const tbody = document.getElementById('tbodyArticulos');
    const chkInactivos = document.getElementById('chkInactivosArticulos');
    const incluirInactivos = chkInactivos ? chkInactivos.checked : false;

    try {
        const url = `${API_BASE_URL}/articulos${incluirInactivos ? '?incluir_inactivos=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al consultar artículos');

        articulosCache = await response.json();
        renderizarTablaArticulos(articulosCache);
    } catch (error) {
        console.error('Error cargando artículos:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar artículos: ${escapeHtml(error.message)}</td></tr>`;
    }
}

/**
 * Renderiza las filas en la tabla de artículos.
 */
function renderizarTablaArticulos(lista) {
    const tbody = document.getElementById('tbodyArticulos');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No se encontraron artículos registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const esActivo = a.activo === 1;
        const badgeEstado = esActivo
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activo</span>`
            : `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i class="bi bi-x-circle me-1"></i>Inactivo (Baja)</span>`;

        return `
            <tr class="${!esActivo ? 'table-light opacity-75' : ''}">
                <td class="fw-bold text-muted">#${a.id_articulo}</td>
                <td class="fw-semibold text-dark">${escapeHtml(a.descripcion)}</td>
                <td><span class="badge bg-concordia-light text-white">${escapeHtml(a.categoria_descripcion || 'Sin categoría')}</span></td>
                <td><span class="badge bg-light text-dark border">${escapeHtml(a.area_descripcion || 'Sin área')}</span></td>
                <td>${badgeEstado}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-info me-1" onclick="verDetalleArticulo(${a.id_articulo})" title="Ver Detalle (Read)">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarArticulo(${a.id_articulo})" title="Editar (Edit)">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${esActivo ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmarBajaLogica('articulo', ${a.id_articulo}, '${escapeHtml(a.descripcion)}')" title="Baja Lógica (Soft Delete)">
                            <i class="bi bi-trash3"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success" onclick="reactivarArticulo(${a.id_articulo})" title="Reactivar">
                            <i class="bi bi-arrow-counterclockwise me-1"></i>Reactivar
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filtra el listado de artículos por texto, categoría y área reactivamente.
 */
function filtrarArticulos() {
    const q = (document.getElementById('txtBuscarArticulo')?.value || '').toLowerCase().trim();
    const filtroCat = document.getElementById('filtroCategoriaArticulo')?.value;
    const filtroArea = document.getElementById('filtroAreaArticulo')?.value;

    let filtrados = [...articulosCache];

    if (filtroCat) {
        filtrados = filtrados.filter(a => a.id_categoria === parseInt(filtroCat, 10));
    }
    if (filtroArea) {
        filtrados = filtrados.filter(a => a.id_area === parseInt(filtroArea, 10));
    }
    if (q) {
        filtrados = filtrados.filter(a =>
            a.descripcion.toLowerCase().includes(q) ||
            (a.categoria_descripcion && a.categoria_descripcion.toLowerCase().includes(q)) ||
            (a.area_descripcion && a.area_descripcion.toLowerCase().includes(q))
        );
    }

    renderizarTablaArticulos(filtrados);
}

/**
 * READ: Muestra el modal con el detalle completo de un artículo.
 */
async function verDetalleArticulo(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/articulos/${id}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle del artículo');
        const art = await res.json();

        document.getElementById('detArtId').textContent = `#${art.id_articulo}`;
        document.getElementById('detArtDescripcion').textContent = art.descripcion;
        document.getElementById('detArtCategoria').textContent = art.categoria_descripcion || `Categoría #${art.id_categoria}`;
        document.getElementById('detArtArea').textContent = art.area_descripcion || `Área #${art.id_area}`;
        document.getElementById('detArtEstado').innerHTML = art.activo === 1
            ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Activo (activo = 1)</span>`
            : `<span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Inactivo / Baja Lógica (activo = 0)</span>`;

        if (modalArtDetalle) modalArtDetalle.show();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

/**
 * ADD: Abre modal para crear un nuevo artículo.
 */
function abrirModalCrearArticulo() {
    document.getElementById('formArticulo').reset();
    document.getElementById('txtArtId').value = '';
    document.getElementById('modalArticuloFormLabel').innerHTML = `<i class="bi bi-plus-circle me-1"></i> Nuevo Artículo`;
    document.getElementById('divArtEstado').classList.add('d-none');
    poblarSelectsFormularioArticulo();
    if (modalArtForm) modalArtForm.show();
}

/**
 * EDIT: Abre modal pre-cargado para editar un artículo existente.
 */
async function abrirModalEditarArticulo(id) {
    try {
        poblarSelectsFormularioArticulo();
        const res = await fetch(`${API_BASE_URL}/articulos/${id}`);
        if (!res.ok) throw new Error('Error al cargar el artículo');
        const art = await res.json();

        document.getElementById('txtArtId').value = art.id_articulo;
        document.getElementById('txtArtDescripcion').value = art.descripcion;
        document.getElementById('selectArtCategoria').value = art.id_categoria;
        document.getElementById('selectArtArea').value = art.id_area;
        document.getElementById('selectArtActivo').value = art.activo;
        document.getElementById('divArtEstado').classList.remove('d-none');
        document.getElementById('modalArticuloFormLabel').innerHTML = `<i class="bi bi-pencil-square me-1"></i> Editar Artículo #${art.id_articulo}`;

        if (modalArtForm) modalArtForm.show();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

/**
 * ADD / EDIT: Envía la petición a la API para crear o editar el artículo.
 */
async function guardarArticulo(e) {
    e.preventDefault();
    const id = document.getElementById('txtArtId').value;
    const descripcion = document.getElementById('txtArtDescripcion').value.trim();
    const id_categoria = document.getElementById('selectArtCategoria').value;
    const id_area = document.getElementById('selectArtArea').value;
    const activo = document.getElementById('selectArtActivo').value;

    if (!descripcion || !id_categoria || !id_area) {
        mostrarToast('Por favor complete todos los campos obligatorios', 'error');
        return;
    }

    const esEdicion = Boolean(id);
    const url = esEdicion ? `${API_BASE_URL}/articulos/${id}` : `${API_BASE_URL}/articulos`;
    const method = esEdicion ? 'PUT' : 'POST';
    const bodyData = {
        descripcion,
        id_categoria: parseInt(id_categoria, 10),
        id_area: parseInt(id_area, 10)
    };
    if (esEdicion) bodyData.activo = parseInt(activo, 10);

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar el artículo');

        mostrarToast(esEdicion ? 'Artículo actualizado exitosamente' : 'Artículo creado exitosamente', 'exito');
        if (modalArtForm) modalArtForm.hide();
        await cargarArticulos();
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

/**
 * REACTIVAR: Reactiva un artículo en baja lógica.
 */
async function reactivarArticulo(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/articulos/${id}/reactivar`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al reactivar artículo');

        mostrarToast('Artículo reactivado exitosamente', 'exito');
        await cargarArticulos();
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

// ============================================================================
// BORRADO LÓGICO (SOFT DELETE) - CONFIRMACIÓN Y EJECUCIÓN
// ============================================================================

/**
 * DELETE: Abre el modal de confirmación explicando el Soft Delete.
 */
function confirmarBajaLogica(tipo, id, nombre) {
    itemABorrar = { tipo, id, nombre };
    const lbl = document.getElementById('lblDetalleItemBorrar');
    if (lbl) {
        lbl.textContent = `${tipo === 'categoria' ? 'Categoría' : 'Artículo'} #${id}: ${nombre}`;
    }
    if (modalConfirmDelete) modalConfirmDelete.show();
}

/**
 * Ejecuta el DELETE (Soft Delete en API) sin borrado físico.
 */
async function ejecutarBorradoLogico() {
    if (!itemABorrar) return;

    const { tipo, id } = itemABorrar;
    const url = tipo === 'categoria' ? `${API_BASE_URL}/categorias/${id}` : `${API_BASE_URL}/articulos/${id}`;

    try {
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al dar de baja el registro');

        mostrarToast(
            `${tipo === 'categoria' ? 'Categoría' : 'Artículo'} dado de baja correctamente (Soft delete activo=0)`,
            'exito'
        );

        if (modalConfirmDelete) modalConfirmDelete.hide();

        if (tipo === 'categoria') {
            await cargarCategorias();
        } else {
            await cargarArticulos();
        }
    } catch (err) {
        mostrarToast(err.message, 'error');
    } finally {
        itemABorrar = null;
    }
}

// ============================================================================
// AUXILIARES Y POBLADO DE SELECTS
// ============================================================================

function poblarSelectsCategorias() {
    const filtro = document.getElementById('filtroCategoriaArticulo');
    if (filtro) {
        const valActual = filtro.value;
        filtro.innerHTML = '<option value="">Todas las Categorías</option>' +
            categoriasCache.map(c => `<option value="${c.id_categoria}">${escapeHtml(c.descripcion)}</option>`).join('');
        filtro.value = valActual;
    }
}

function poblarSelectsAreas() {
    const filtro = document.getElementById('filtroAreaArticulo');
    if (filtro) {
        const valActual = filtro.value;
        filtro.innerHTML = '<option value="">Todas las Áreas</option>' +
            areasCache.map(a => `<option value="${a.id_area}">${escapeHtml(a.descripcion)}</option>`).join('');
        filtro.value = valActual;
    }
}

function poblarSelectsFormularioArticulo() {
    const selectCat = document.getElementById('selectArtCategoria');
    const selectArea = document.getElementById('selectArtArea');

    if (selectCat) {
        selectCat.innerHTML = '<option value="">-- Seleccionar Categoría --</option>' +
            categoriasCache.map(c => `<option value="${c.id_categoria}">${escapeHtml(c.descripcion)} ${c.activo === 0 ? '(Inactiva)' : ''}</option>`).join('');
    }

    if (selectArea) {
        selectArea.innerHTML = '<option value="">-- Seleccionar Área --</option>' +
            areasCache.map(a => `<option value="${a.id_area}">${escapeHtml(a.descripcion)}</option>`).join('');
    }
}

/**
 * Muestra el Toast de Bootstrap con estilos temáticos.
 */
function mostrarToast(mensaje, tipo = 'info') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');
    if (!toastEl || !toastBody || !bsToast) return;

    toastEl.classList.remove('bg-danger', 'bg-success', 'bg-concordia-light', 'bg-info');

    if (tipo === 'exito') {
        toastEl.classList.add('bg-concordia-light');
    } else if (tipo === 'error') {
        toastEl.classList.add('bg-danger');
    } else {
        toastEl.classList.add('bg-concordia-dark');
    }

    toastBody.textContent = mensaje;
    bsToast.show();
}

/**
 * Escapa HTML para prevenir inyecciones XSS.
 */
function escapeHtml(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
