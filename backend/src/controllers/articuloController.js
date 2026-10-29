/**
 * ============================================================================
 * CONTROLADOR DE ARTÍCULOS
 * Capa de presentación para BREAD de Artículos
 * ============================================================================
 */

const articuloService = require('../services/articuloService');

class ArticuloController {
  async getArticulos(req, res) {
    try {
      const articulos = await articuloService.getArticulos(req.query, req.usuario);
      return res.status(200).json(articulos);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al consultar artículos'
      });
    }
  }

  async getArticuloById(req, res) {
    try {
      const articulo = await articuloService.getArticuloById(req.params.id);
      return res.status(200).json({
        ...articulo,
        articulo
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener el artículo'
      });
    }
  }

  async crearArticulo(req, res) {
    try {
      const nuevoArticulo = await articuloService.crearArticulo(req.body);
      return res.status(201).json({
        mensaje: 'Artículo creado exitosamente',
        articulo: nuevoArticulo,
        ...nuevoArticulo
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al crear el artículo'
      });
    }
  }

  async actualizarArticulo(req, res) {
    try {
      const articuloActualizado = await articuloService.actualizarArticulo(req.params.id, req.body);
      return res.status(200).json({
        mensaje: 'Artículo actualizado exitosamente',
        articulo: articuloActualizado,
        ...articuloActualizado
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al actualizar el artículo'
      });
    }
  }

  async eliminarArticulo(req, res) {
    try {
      const articuloEliminado = await articuloService.eliminarArticulo(req.params.id);
      return res.status(200).json({
        mensaje: 'Artículo dado de baja correctamente (borrado lógico)',
        articulo: articuloEliminado,
        ...articuloEliminado
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al eliminar el artículo'
      });
    }
  }

  async reactivarArticulo(req, res) {
    try {
      const articuloReactivado = await articuloService.reactivarArticulo(req.params.id);
      return res.status(200).json({
        mensaje: 'Artículo reactivado exitosamente',
        articulo: articuloReactivado,
        ...articuloReactivado
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al reactivar el artículo'
      });
    }
  }
}

module.exports = new ArticuloController();
