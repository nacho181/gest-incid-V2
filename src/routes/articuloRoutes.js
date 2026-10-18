/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ARTÍCULOS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Artículos:
 * - GET    /api/v1/articulos            (Browse)
 * - GET    /api/v1/articulos/:id        (Read)
 * - POST   /api/v1/articulos            (Add)
 * - PUT    /api/v1/articulos/:id        (Edit)
 * - PATCH  /api/v1/articulos/:id        (Edit)
 * - DELETE /api/v1/articulos/:id        (Delete - Borrado Lógico / Soft Delete)
 * - PUT    /api/v1/articulos/:id/reactivar (Reactivación lógica)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const articuloController = require('../controllers/articuloController');

// BROWSE: Listar artículos activos con filtros opcionales
router.get('/', articuloController.getArticulos);

// READ: Obtener detalle de un artículo por ID
router.get('/:id', articuloController.getArticuloById);

// ADD: Crear un nuevo artículo
router.post('/', articuloController.crearArticulo);

// EDIT: Actualizar un artículo existente
router.put('/:id', articuloController.actualizarArticulo);
router.patch('/:id', articuloController.actualizarArticulo);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', articuloController.eliminarArticulo);

// REACTIVAR: Reactivación lógica de artículo
router.put('/:id/reactivar', articuloController.reactivarArticulo);
router.patch('/:id/reactivar', articuloController.reactivarArticulo);

module.exports = router;
