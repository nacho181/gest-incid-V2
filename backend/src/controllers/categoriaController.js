/**
 * ============================================================================
 * CONTROLADOR DE CATEGORÍAS
 * Capa de presentación para BREAD de Categorías
 * ============================================================================
 */

const categoriaService = require('../services/categoriaService');

class CategoriaController {
  async getCategorias(req, res) {
    try {
      const categorias = await categoriaService.getCategorias(req.query);
      return res.status(200).json(categorias);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al consultar categorías'
      });
    }
  }

  async getCategoriaById(req, res) {
    try {
      const categoria = await categoriaService.getCategoriaById(req.params.id);
      return res.status(200).json({
        ...categoria,
        categoria
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener la categoría'
      });
    }
  }

  async crearCategoria(req, res) {
    try {
      const nuevaCategoria = await categoriaService.crearCategoria(req.body);
      return res.status(201).json({
        mensaje: 'Categoría creada exitosamente',
        categoria: nuevaCategoria,
        ...nuevaCategoria
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al crear la categoría'
      });
    }
  }

  async actualizarCategoria(req, res) {
    try {
      const categoriaActualizada = await categoriaService.actualizarCategoria(req.params.id, req.body);
      return res.status(200).json({
        mensaje: 'Categoría actualizada exitosamente',
        categoria: categoriaActualizada,
        ...categoriaActualizada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al actualizar la categoría'
      });
    }
  }

  async eliminarCategoria(req, res) {
    try {
      const categoriaEliminada = await categoriaService.eliminarCategoria(req.params.id);
      return res.status(200).json({
        mensaje: 'Categoría dada de baja correctamente (borrado lógico)',
        categoria: categoriaEliminada,
        ...categoriaEliminada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al eliminar la categoría'
      });
    }
  }

  async reactivarCategoria(req, res) {
    try {
      const categoriaReactivada = await categoriaService.reactivarCategoria(req.params.id);
      return res.status(200).json({
        mensaje: 'Categoría reactivada exitosamente',
        categoria: categoriaReactivada,
        ...categoriaReactivada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al reactivar la categoría'
      });
    }
  }
}

module.exports = new CategoriaController();
