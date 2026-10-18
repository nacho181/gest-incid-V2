/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO CATEGORÍAS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Categorías:
 * - GET    /api/v1/categorias            (Browse)
 * - GET    /api/v1/categorias/:id        (Read)
 * - POST   /api/v1/categorias            (Add)
 * - PUT    /api/v1/categorias/:id        (Edit)
 * - PATCH  /api/v1/categorias/:id        (Edit)
 * - DELETE /api/v1/categorias/:id        (Delete - Borrado Lógico / Soft Delete)
 * - PUT    /api/v1/categorias/:id/reactivar (Reactivación lógica)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');

// BROWSE: Listar categorías
router.get('/', categoriaController.getCategorias);

// READ: Obtener detalle de una categoría por ID
router.get('/:id', categoriaController.getCategoriaById);

// ADD: Crear una nueva categoría
router.post('/', categoriaController.crearCategoria);

// EDIT: Actualizar una categoría existente
router.put('/:id', categoriaController.actualizarCategoria);
router.patch('/:id', categoriaController.actualizarCategoria);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', categoriaController.eliminarCategoria);

// REACTIVAR: Reactivación lógica de categoría
router.put('/:id/reactivar', categoriaController.reactivarCategoria);
router.patch('/:id/reactivar', categoriaController.reactivarCategoria);

module.exports = router;
