/**
 * ============================================================================
 * MUNICIPALIDAD DE CONCORDIA - GESTIÓN DE ENTIDADES BASE
 * ============================================================================
 */

import * as bootstrap from 'bootstrap';
import TomSelect from 'tom-select';
window.bootstrap = bootstrap;

const API_BASE_URL = '/api/v1';
const TOKEN = localStorage.getItem('jwt_token') || localStorage.getItem('token');
let USER = null;
try {
    USER = JSON.parse(localStorage.getItem('user_data') || 'null');
} catch (e) {
    USER = null;
}

// Solo Director (1) y Sistemas (2) pueden administrar entidades
const SIN_ACCESO = !TOKEN || !USER || USER.rol !== 2;
if (SIN_ACCESO) {
    window.location.replace('index.html');
}

function limpiarSesion() {
    ['jwt_token', 'token', 'user_data', 'usuario'].forEach(k => localStorage.removeItem(k));
}

function authFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${TOKEN}`
        }
    }).then(res => {
        if (res.status === 401) {
            limpiarSesion();
            window.location.replace('index.html');
        }
        return res;
    });
}

// Estado local
let categoriasCache = []; // Categorías para la tabla paginada
let categoriasActivasCache = []; // Categorías activas completas para selectores TomSelect
let articulosCache = [];
let areasCache = [];

// Instancias de TomSelect para Categorías
let tomSelectFiltroCategoria = null;
let tomSelectArtCategoria = null;

// Paginación de Categorías
let paginaActualCategorias = 1;
const limiteCategorias = 10;
let totalRegistrosCategorias = 0;
let totalPaginasCategorias = 1;

// Paginación de Artículos
let paginaActualArticulos = 1;
const limiteArticulos = 10;
let totalRegistrosArticulos = 0;
let totalPaginasArticulos = 1;

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
    if (SIN_ACCESO) return;
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
    cargarCategoriasParaSelectores();
    cargarAreas();
    cargarArticulos();
});

/**
 * Muestra información del usuario logueado en la barra superior si existe.
 */
function verificarUsuarioCabecera() {
    // Referencias actualizadas al menú dropdown
    const btnLogout = document.getElementById('btnLogoutHeader');

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            limpiarSesion();
            window.location.href = 'index.html';
        });
    }

    try {
        const raw = localStorage.getItem('user_data');
        if (raw) {
            const user = JSON.parse(raw);
            const nombreCompleto = `${user.nombres} ${user.apellidos || ''}`.trim();
            const rolTexto = user.rol === 1 ? 'Director de Sistemas' : user.rol === 2 ? 'Empleado de Sistemas' : 'Empleado Municipal';
            
            // Actualizar vista normal
            const lblUser = document.getElementById('lblUserHeader');
            const lblUserRol = document.getElementById('lblUserRolHeader');
            if (lblUser && user && user.nombres) lblUser.textContent = nombreCompleto;
            if (lblUserRol && user) lblUserRol.textContent = rolTexto;
            
            // Actualizar interior del dropdown
            const lblNombreDrop = document.getElementById('lblUsuarioNombreDrop');
            const lblUsuarioDrop = document.getElementById('lblUsuarioUsuarioDrop');
            if (lblNombreDrop) lblNombreDrop.textContent = nombreCompleto;
            if (lblUsuarioDrop) lblUsuarioDrop.textContent = user.usuario || '';
            
            // Cargar avatar en todas las etiquetas
            const imgNav = document.getElementById('imgAvatarNav');
            const imgLarge = document.getElementById('imgAvatarLarge');
            const imgFull = document.getElementById('imgAvatarFull');
            
            if (user.avatar) {
                if (imgNav) imgNav.src = user.avatar;
                if (imgLarge) imgLarge.src = user.avatar;
                if (imgFull) imgFull.src = user.avatar;
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

    // Categorías: Botón nueva
    document.getElementById('btnNuevaCategoria')?.addEventListener('click', abrirModalCrearCategoria);
    // Categorías: Formulario submit
    document.getElementById('formCategoria')?.addEventListener('submit', guardarCategoria);
    // Categorías: Refrescar
    const btnRefrescarCategorias = document.getElementById('btnRefrescarCategorias');
    if (btnRefrescarCategorias) {
        btnRefrescarCategorias.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn?.blur();
            const icon = btn?.querySelector('i');
            if (btn) btn.disabled = true;
            if (icon) icon.classList.add('spin');
            btn?.classList.add('opacity-75');

            try {
                await cargarCategorias(paginaActualCategorias, true);
                mostrarToast('Catálogo de categorías actualizado correctamente.', 'info');
            } catch (err) {
                console.error('Error al refrescar categorías:', err);
                mostrarToast('Error al actualizar el catálogo de categorías.', 'error');
            } finally {
                if (btn) btn.disabled = false;
                if (icon) icon.classList.remove('spin');
                btn?.classList.remove('opacity-75');
            }
        });
    }
    // Categorías: Filtro checkbox inactivos
    document.getElementById('chkInactivosCategorias')?.addEventListener('change', cargarCategorias);
    // Categorías: Búsqueda reactiva
    document.getElementById('txtBuscarCategoria')?.addEventListener('input', filtrarCategorias);

    // Artículos: Botón nuevo
    document.getElementById('btnNuevoArticulo')?.addEventListener('click', abrirModalCrearArticulo);
    // Artículos: Formulario submit
    document.getElementById('formArticulo')?.addEventListener('submit', guardarArticulo);
    // Artículos: Refrescar
    const btnRefrescarArticulos = document.getElementById('btnRefrescarArticulos');
    if (btnRefrescarArticulos) {
        btnRefrescarArticulos.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn?.blur();
            const icon = btn?.querySelector('i');
            if (btn) btn.disabled = true;
            if (icon) icon.classList.add('spin');
            btn?.classList.add('opacity-75');

            try {
                await cargarArticulos(paginaActualArticulos, true);
                mostrarToast('Catálogo de artículos actualizado correctamente.', 'info');
            } catch (err) {
                console.error('Error al refrescar artículos:', err);
                mostrarToast('Error al actualizar el catálogo de artículos.', 'error');
            } finally {
                if (btn) btn.disabled = false;
                if (icon) icon.classList.remove('spin');
                btn?.classList.remove('opacity-75');
            }
        });
    }
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

    // Delegación de eventos para la tabla de categorías
    const tbodyCategorias = document.getElementById('tbodyCategorias');
    if (tbodyCategorias) {
        tbodyCategorias.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id ? parseInt(btn.dataset.id, 10) : null;
            if (!id) return;

            if (action === 'ver-detalle') {
                verDetalleCategoria(id);
            } else if (action === 'editar') {
                abrirModalEditarCategoria(id);
            } else if (action === 'baja-logica') {
                const nombre = btn.dataset.nombre || '';
                confirmarBajaLogica('categoria', id, nombre);
            } else if (action === 'reactivar') {
                reactivarCategoria(id);
            }
        });
    }

    // Delegación de eventos para la tabla de artículos
    const tbodyArticulos = document.getElementById('tbodyArticulos');
    if (tbodyArticulos) {
        tbodyArticulos.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id ? parseInt(btn.dataset.id, 10) : null;
            if (!id) return;

            if (action === 'ver-detalle') {
                verDetalleArticulo(id);
            } else if (action === 'editar') {
                abrirModalEditarArticulo(id);
            } else if (action === 'baja-logica') {
                const nombre = btn.dataset.nombre || '';
                confirmarBajaLogica('articulo', id, nombre);
            } else if (action === 'reactivar') {
                reactivarArticulo(id);
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
                mostrarToast('La imagen supera el tamaño máximo de 2 MB', 'error');
                inputAvatar.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file); // 'avatar' debe coincidir con el campo esperado en backend

            try {
                mostrarToast('Subiendo foto de perfil...', 'info');

                const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`
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
                if (USER) {
                    USER.avatar = data.usuario.avatar;
                    localStorage.setItem('user_data', JSON.stringify(USER));
                }

                mostrarToast('Foto de perfil actualizada con éxito', 'exito');
            } catch (error) {
                console.error('Error subiendo avatar:', error);
                mostrarToast(error.message, 'error');
            } finally {
                inputAvatar.value = ''; // Resetear para permitir subir la misma foto si falló
            }
        });
    }
}

// ============================================================================
// GESTIÓN DE CATEGORÍAS
// ============================================================================

/**
 * BROWSE: Carga el listado de categorías desde la API con paginación LIMIT/OFFSET.
 */
async function cargarCategorias(pagina = 1, forzarRefresco = false) {
    paginaActualCategorias = pagina;
    const tbody = document.getElementById('tbodyCategorias');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="100%" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Actualizando datos...</td></tr>';
    }
    const chkInactivos = document.getElementById('chkInactivosCategorias');
    const incluirInactivos = chkInactivos ? chkInactivos.checked : false;
    const buscar = (document.getElementById('txtBuscarCategoria')?.value || '').trim();

    try {
        let url = `${API_BASE_URL}/categorias?page=${pagina}&limit=${limiteCategorias}`;
        if (incluirInactivos) url += '&incluir_inactivos=true';
        if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
        if (forzarRefresco) url += `&_t=${Date.now()}`;

        const response = await authFetch(url);
        if (!response.ok) throw new Error('Error al consultar categorías');

        const rawData = await response.json();
        categoriasCache = Array.isArray(rawData) ? rawData : (rawData.data || []);
        const pagination = rawData.pagination || {
            total: categoriasCache.length,
            page: pagina,
            limit: limiteCategorias,
            total_pages: Math.ceil(categoriasCache.length / limiteCategorias) || 1
        };

        totalRegistrosCategorias = pagination.total;
        totalPaginasCategorias = pagination.total_pages || 1;

        renderizarTablaCategorias(categoriasCache);
        await cargarCategoriasParaSelectores();

        renderizarPaginador({
            ulElement: document.getElementById('paginacionCategorias'),
            infoElement: document.getElementById('lblInfoPaginacionCategorias'),
            total: totalRegistrosCategorias,
            page: paginaActualCategorias,
            limit: limiteCategorias,
            totalPages: totalPaginasCategorias,
            onCambiarPagina: (p) => cargarCategorias(p),
            singular: 'categoría',
            plural: 'categorías'
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="100%" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-1"></i> Error al cargar datos: ${escapeHtml(error.message || 'Error de conexión')}</td></tr>`;
        }
        throw error;
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
            ? `<span class="badge badge-activo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activa</span>`
            : `<span class="badge badge-inactivo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-slash-circle me-1"></i>Inactiva</span>`;

        return `
            <tr class="${!esActivo ? 'table-light opacity-75' : ''}">
                <td class="align-middle fw-bold text-muted text-start">#${c.id_categoria}</td>
                <td class="align-middle fw-semibold text-dark text-start">${escapeHtml(c.descripcion)}</td>
                <td class="align-middle text-center">${badgeEstado}</td>
                <td class="align-middle text-end">
                    <div class="d-inline-flex gap-1 align-items-center justify-content-end table-actions-group">
                        <button class="btn btn-sm btn-outline-secondary rounded-2" data-action="ver-detalle" data-id="${c.id_categoria}" title="Ver detalle" aria-label="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-concordia rounded-2" data-action="editar" data-id="${c.id_categoria}" title="Editar categoría" aria-label="Editar categoría">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${esActivo ? `
                            <button class="btn btn-sm btn-outline-danger rounded-2" data-action="baja-logica" data-id="${c.id_categoria}" data-nombre="${escapeHtml(c.descripcion)}" title="Dar de baja" aria-label="Dar de baja">
                                <i class="bi bi-trash3"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-concordia rounded-2" data-action="reactivar" data-id="${c.id_categoria}" title="Reactivar categoría" aria-label="Reactivar categoría">
                                <i class="bi bi-arrow-counterclockwise me-1"></i>Reactivar
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

let debounceTimerCat = null;
/**
 * Filtra el listado de categorías mediante consulta paginada en base de datos.
 */
function filtrarCategorias() {
    clearTimeout(debounceTimerCat);
    debounceTimerCat = setTimeout(() => {
        paginaActualCategorias = 1;
        cargarCategorias(1);
    }, 250);
}

/**
 * READ: Muestra el modal con el detalle completo de una categoría.
 */
async function verDetalleCategoria(id) {
    try {
        const res = await authFetch(`${API_BASE_URL}/categorias/${id}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle de la categoría');
        const cat = await res.json();

        document.getElementById('detCatId').textContent = `#${cat.id_categoria}`;
        document.getElementById('detCatDescripcion').textContent = cat.descripcion;
        document.getElementById('detCatEstado').innerHTML = cat.activo === 1
            ? `<span class="badge badge-activo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activa</span>`
            : `<span class="badge badge-inactivo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-slash-circle me-1"></i>Inactiva</span>`;

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
        const res = await authFetch(`${API_BASE_URL}/categorias/${id}`);
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
        mostrarToast('Por favor, ingrese el nombre de la categoría.', 'error');
        return;
    }

    const esEdicion = Boolean(id);
    const url = esEdicion ? `${API_BASE_URL}/categorias/${id}` : `${API_BASE_URL}/categorias`;
    const method = esEdicion ? 'PUT' : 'POST';
    const bodyData = { descripcion };
    if (esEdicion) bodyData.activo = parseInt(activo, 10);

    try {
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No fue posible guardar la categoría. Por favor, intente nuevamente.');

        mostrarToast(esEdicion ? 'Categoría actualizada exitosamente.' : 'Categoría creada exitosamente.', 'exito');
        if (modalCatForm) modalCatForm.hide();
        await cargarCategorias(esEdicion ? paginaActualCategorias : 1);
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

/**
 * REACTIVAR: Reactiva una categoría que estaba desactivada.
 */
async function reactivarCategoria(id) {
    try {
        const res = await authFetch(`${API_BASE_URL}/categorias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: 1 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No fue posible reactivar la categoría.');

        mostrarToast('Categoría reactivada exitosamente.', 'exito');
        await cargarCategorias(paginaActualCategorias);
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

// ============================================================================
// GESTIÓN DE ARTÍCULOS
// ============================================================================

/**
 * Carga el catálogo de áreas para poblar los selectores.
 */
async function cargarAreas() {
    try {
        const res = await authFetch(`${API_BASE_URL}/areas`);
        if (!res.ok) throw new Error('Error al consultar áreas');
        const rawAreas = await res.json();
        areasCache = Array.isArray(rawAreas) ? rawAreas : (rawAreas.data || []);
        poblarSelectsAreas();
    } catch (_) {
        // Silencioso en carga inicial de áreas
    }
}

/**
 * BROWSE: Carga el listado de artículos desde la API con paginación LIMIT/OFFSET.
 */
async function cargarArticulos(pagina = 1, forzarRefresco = false) {
    paginaActualArticulos = pagina;
    const tbody = document.getElementById('tbodyArticulos');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="100%" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Actualizando datos...</td></tr>';
    }
    const chkInactivos = document.getElementById('chkInactivosArticulos');
    const incluirInactivos = chkInactivos ? chkInactivos.checked : false;
    const buscar = (document.getElementById('txtBuscarArticulo')?.value || '').trim();
    const filtroCat = tomSelectFiltroCategoria ? tomSelectFiltroCategoria.getValue() : (document.getElementById('filtroCategoriaArticulo')?.value || '');
    const filtroArea = document.getElementById('filtroAreaArticulo')?.value;

    try {
        let url = `${API_BASE_URL}/articulos?page=${pagina}&limit=${limiteArticulos}`;
        if (incluirInactivos) url += '&incluir_inactivos=true';
        if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
        if (filtroCat) url += `&id_categoria=${encodeURIComponent(filtroCat)}`;
        if (filtroArea) url += `&id_area=${encodeURIComponent(filtroArea)}`;
        if (forzarRefresco) url += `&_t=${Date.now()}`;

        const response = await authFetch(url);
        if (!response.ok) throw new Error('Error al consultar artículos');

        const rawArt = await response.json();
        articulosCache = Array.isArray(rawArt) ? rawArt : (rawArt.data || []);
        const pagination = rawArt.pagination || {
            total: articulosCache.length,
            page: pagina,
            limit: limiteArticulos,
            total_pages: Math.ceil(articulosCache.length / limiteArticulos) || 1
        };

        totalRegistrosArticulos = pagination.total;
        totalPaginasArticulos = pagination.total_pages || 1;

        renderizarTablaArticulos(articulosCache);

        renderizarPaginador({
            ulElement: document.getElementById('paginacionArticulos'),
            infoElement: document.getElementById('lblInfoPaginacionArticulos'),
            total: totalRegistrosArticulos,
            page: paginaActualArticulos,
            limit: limiteArticulos,
            totalPages: totalPaginasArticulos,
            onCambiarPagina: (p) => cargarArticulos(p),
            singular: 'artículo',
            plural: 'artículos'
        });
    } catch (error) {
        console.error('Error cargando artículos:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="100%" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-1"></i> Error al cargar artículos: ${escapeHtml(error.message || 'Error de conexión')}</td></tr>`;
        }
        throw error;
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
            ? `<span class="badge badge-activo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activo</span>`
            : `<span class="badge badge-inactivo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-slash-circle me-1"></i>Inactivo</span>`;

        return `
            <tr class="${!esActivo ? 'table-light opacity-75' : ''}">
                <td class="align-middle fw-bold text-muted text-start">#${a.id_articulo}</td>
                <td class="align-middle fw-semibold text-dark text-start">${escapeHtml(a.descripcion)}</td>
                <td class="align-middle text-start text-nowrap">
                    <span class="badge rounded-pill bg-light text-dark border fw-medium px-2 py-1 text-truncate d-inline-block align-middle" style="max-width: 170px;" title="${escapeHtml(a.categoria_descripcion || 'Sin categoría')}">
                        ${escapeHtml(a.categoria_descripcion || 'Sin categoría')}
                    </span>
                </td>
                <td class="align-middle text-start text-nowrap">
                    <span class="badge rounded-pill bg-light text-muted border fw-normal px-2 py-1 text-truncate d-inline-block align-middle" style="max-width: 190px;" title="${escapeHtml(a.area_descripcion || 'Sin área')}">
                        <i class="bi bi-geo-alt me-1 text-secondary"></i>${escapeHtml(a.area_descripcion || 'Sin área')}
                    </span>
                </td>
                <td class="align-middle text-center text-nowrap">${badgeEstado}</td>
                <td class="align-middle text-end text-nowrap">
                    <div class="d-inline-flex gap-1 align-items-center justify-content-end table-actions-group">
                        <button class="btn btn-sm btn-outline-secondary rounded-2" data-action="ver-detalle" data-id="${a.id_articulo}" title="Ver detalle" aria-label="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-concordia rounded-2" data-action="editar" data-id="${a.id_articulo}" title="Editar artículo" aria-label="Editar artículo">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${esActivo ? `
                            <button class="btn btn-sm btn-outline-danger rounded-2" data-action="baja-logica" data-id="${a.id_articulo}" data-nombre="${escapeHtml(a.descripcion)}" title="Dar de baja" aria-label="Dar de baja">
                                <i class="bi bi-trash3"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-concordia rounded-2" data-action="reactivar" data-id="${a.id_articulo}" title="Reactivar artículo" aria-label="Reactivar artículo">
                                <i class="bi bi-arrow-counterclockwise me-1"></i>Reactivar
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

let debounceTimerArt = null;
/**
 * Filtra el listado de artículos por texto, categoría y área en base de datos.
 */
function filtrarArticulos() {
    clearTimeout(debounceTimerArt);
    debounceTimerArt = setTimeout(() => {
        paginaActualArticulos = 1;
        cargarArticulos(1);
    }, 250);
}

/**
 * READ: Muestra el modal con el detalle completo de un artículo.
 */
async function verDetalleArticulo(id) {
    try {
        const res = await authFetch(`${API_BASE_URL}/articulos/${id}`);
        if (!res.ok) throw new Error('No se pudo obtener el detalle del artículo');
        const art = await res.json();

        document.getElementById('detArtId').textContent = `#${art.id_articulo}`;
        document.getElementById('detArtDescripcion').textContent = art.descripcion;
        document.getElementById('detArtCategoria').textContent = art.categoria_descripcion || `Categoría #${art.id_categoria}`;
        document.getElementById('detArtArea').textContent = art.area_descripcion || `Área #${art.id_area}`;
        document.getElementById('detArtEstado').innerHTML = art.activo === 1
            ? `<span class="badge badge-activo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-check-circle me-1"></i>Activo</span>`
            : `<span class="badge badge-inactivo rounded-pill fw-semibold px-2 py-1"><i class="bi bi-slash-circle me-1"></i>Inactivo</span>`;

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

    // Ocultar alerta de categoría inactiva
    const alertEl = document.getElementById('alertaCategoriaInactiva');
    if (alertEl) alertEl.classList.add('d-none');

    poblarSelectsFormularioArticulo();

    if (tomSelectArtCategoria) {
        tomSelectArtCategoria.clear();
    }

    if (modalArtForm) modalArtForm.show();
}

/**
 * EDIT: Abre modal pre-cargado para editar un artículo existente.
 */
async function abrirModalEditarArticulo(id) {
    try {
        poblarSelectsFormularioArticulo();
        const res = await authFetch(`${API_BASE_URL}/articulos/${id}`);
        if (!res.ok) throw new Error('Error al cargar el artículo');
        const art = await res.json();

        document.getElementById('txtArtId').value = art.id_articulo;
        document.getElementById('txtArtDescripcion').value = art.descripcion;
        document.getElementById('selectArtArea').value = art.id_area;
        document.getElementById('selectArtActivo').value = art.activo;
        document.getElementById('divArtEstado').classList.remove('d-none');
        document.getElementById('modalArticuloFormLabel').innerHTML = `<i class="bi bi-pencil-square me-1"></i> Editar Artículo #${art.id_articulo}`;

        // Comprobar si la categoría asignada al artículo sigue activa
        const catEstaActiva = categoriasActivasCache.some(c => Number(c.id_categoria) === Number(art.id_categoria));
        const alertEl = document.getElementById('alertaCategoriaInactiva');
        const txtAlertEl = document.getElementById('txtAlertaCatInactiva');

        if (!catEstaActiva) {
            // La categoría fue dada de baja previamente: alertar y forzar selección de categoría activa
            if (alertEl && txtAlertEl) {
                const nombreCat = art.categoria_descripcion || `ID #${art.id_categoria}`;
                txtAlertEl.innerHTML = `<strong>Aviso importante:</strong> La categoría asignada originalmente (<em>${escapeHtml(nombreCat)}</em>) fue dada de baja. Debe seleccionar una categoría activa válida antes de guardar los cambios.`;
                alertEl.classList.remove('d-none');
            }
            if (tomSelectArtCategoria) {
                tomSelectArtCategoria.clear();
            }
        } else {
            if (alertEl) alertEl.classList.add('d-none');
            if (tomSelectArtCategoria) {
                tomSelectArtCategoria.setValue(String(art.id_categoria));
            } else {
                document.getElementById('selectArtCategoria').value = art.id_categoria;
            }
        }

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
    const id_categoria = tomSelectArtCategoria ? tomSelectArtCategoria.getValue() : document.getElementById('selectArtCategoria').value;
    const id_area = document.getElementById('selectArtArea').value;
    const activo = document.getElementById('selectArtActivo').value;

    if (!descripcion || !id_categoria || !id_area) {
        mostrarToast('Por favor, complete todos los campos obligatorios y seleccione una categoría activa válida.', 'error');
        return;
    }

    // Validar en el cliente que la categoría pertenezca a la lista de categorías activas
    const catValida = categoriasActivasCache.some(c => String(c.id_categoria) === String(id_categoria));
    if (!catValida) {
        mostrarToast('No se puede guardar el artículo con una categoría inactiva. Por favor, seleccione una categoría activa.', 'error');
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
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No fue posible guardar el artículo. Por favor, intente nuevamente.');

        mostrarToast(esEdicion ? 'Artículo actualizado exitosamente.' : 'Artículo registrado exitosamente.', 'exito');
        if (modalArtForm) modalArtForm.hide();
        await cargarArticulos(esEdicion ? paginaActualArticulos : 1);
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

/**
 * REACTIVAR: Reactiva un artículo desactivado.
 */
async function reactivarArticulo(id) {
    try {
        const res = await authFetch(`${API_BASE_URL}/articulos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: 1 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No fue posible reactivar el artículo.');

        mostrarToast('Artículo reactivado exitosamente.', 'exito');
        await cargarArticulos(paginaActualArticulos);
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

// ============================================================================
// DESACTIVACIÓN DE REGISTROS - CONFIRMACIÓN Y EJECUCIÓN
// ============================================================================

/**
 * DELETE: Abre el modal de confirmación para desactivar el registro.
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
 * Ejecuta la desactivación del registro en el sistema.
 */
async function ejecutarBorradoLogico() {
    if (!itemABorrar) return;

    const { tipo, id } = itemABorrar;
    const url = tipo === 'categoria' ? `${API_BASE_URL}/categorias/${id}` : `${API_BASE_URL}/articulos/${id}`;

    try {
        const res = await authFetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No fue posible desactivar el registro.');

        mostrarToast(
            `${tipo === 'categoria' ? 'Categoría dada de baja' : 'Artículo dado de baja'} correctamente.`,
            'exito'
        );

        if (modalConfirmDelete) modalConfirmDelete.hide();

        if (tipo === 'categoria') {
            await cargarCategorias(paginaActualCategorias);
        } else {
            await cargarArticulos(paginaActualArticulos);
        }
    } catch (err) {
        mostrarToast(err.message, 'error');
    } finally {
        itemABorrar = null;
    }
}

// ============================================================================
// AUXILIARES Y POBLADO DE SELECTS CON TOM SELECT
// ============================================================================

/**
 * Consulta la totalidad de categorías activas para poblar los selectores interactivos TomSelect.
 */
async function cargarCategoriasParaSelectores() {
    try {
        const res = await authFetch(`${API_BASE_URL}/categorias?limit=1000&activo=1`);
        if (!res.ok) throw new Error('Error al consultar categorías para selectores');
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : (raw.data || []);
        categoriasActivasCache = items.filter(c => c.activo === 1);
        poblarTomSelectsCategorias();
    } catch (err) {
        console.error('Error cargando categorías para selectores:', err);
    }
}

/**
 * Inicializa la instancia de TomSelect en el filtro de categorías si aún no existe.
 */
function inicializarTomSelectFiltroCategoria() {
    const el = document.getElementById('filtroCategoriaArticulo');
    if (!el || tomSelectFiltroCategoria) return;

    tomSelectFiltroCategoria = new TomSelect('#filtroCategoriaArticulo', {
        create: false,
        allowEmptyOption: false,
        placeholder: 'Todas las categorías',
        plugins: ['clear_button'],
        sortField: { field: 'text', direction: 'asc' },
        maxOptions: 1000
    });

    tomSelectFiltroCategoria.on('change', () => {
        filtrarArticulos();
    });
}

/**
 * Inicializa la instancia de TomSelect en el selector de categoría del modal de artículo si aún no existe.
 */
function inicializarTomSelectArtCategoria() {
    const el = document.getElementById('selectArtCategoria');
    if (!el || tomSelectArtCategoria) return;

    tomSelectArtCategoria = new TomSelect('#selectArtCategoria', {
        create: false,
        allowEmptyOption: false,
        placeholder: 'Buscar y seleccionar categoría...',
        plugins: ['clear_button'],
        sortField: { field: 'text', direction: 'asc' },
        maxOptions: 1000
    });
}

/**
 * Actualiza dinámicamente las opciones de los selectores TomSelect de categorías
 * sin duplicar componentes en el DOM y preservando los valores seleccionados.
 */
function poblarTomSelectsCategorias() {
    inicializarTomSelectFiltroCategoria();
    inicializarTomSelectArtCategoria();

    // 1. Selector de filtro en la barra de herramientas de Artículos
    if (tomSelectFiltroCategoria) {
        const valActual = tomSelectFiltroCategoria.getValue();
        tomSelectFiltroCategoria.clearOptions();
        categoriasActivasCache.forEach(c => {
            tomSelectFiltroCategoria.addOption({
                value: String(c.id_categoria),
                text: c.descripcion
            });
        });
        if (valActual) {
            tomSelectFiltroCategoria.setValue(valActual, true);
        } else {
            tomSelectFiltroCategoria.clear(true);
        }
    }

    // 2. Selector dentro del modal de alta / edición de Artículos
    if (tomSelectArtCategoria) {
        const valActual = tomSelectArtCategoria.getValue();
        tomSelectArtCategoria.clearOptions();
        categoriasActivasCache.forEach(c => {
            tomSelectArtCategoria.addOption({
                value: String(c.id_categoria),
                text: c.descripcion
            });
        });
        if (valActual) {
            tomSelectArtCategoria.setValue(valActual, true);
        } else {
            tomSelectArtCategoria.clear(true);
        }
    }
}

function poblarSelectsCategorias() {
    poblarTomSelectsCategorias();
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
    poblarTomSelectsCategorias();

    const selectArea = document.getElementById('selectArtArea');
    if (selectArea) {
        const valActual = selectArea.value;
        selectArea.innerHTML = '<option value="">-- Seleccionar Área --</option>' +
            areasCache.map(a => `<option value="${a.id_area}">${escapeHtml(a.descripcion)}</option>`).join('');
        if (valActual) selectArea.value = valActual;
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
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'");
}

/**
 * Renderiza el componente de paginación Bootstrap 5 y actualiza la leyenda.
 */
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