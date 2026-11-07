/**
 * ============================================================================
 * CONTROLADOR DE ARTÍCULOS
 * Capa de presentación para BREAD de Artículos
 * ============================================================================
 */


import articuloService from '../services/articuloService.js';
import { wrapController } from '../utils/asyncHandler.js';

class ArticuloController {
  async getArticulos(req, res) {
    res.status(200).json(await articuloService.getArticulos(req.query, req.usuario));
  }
  async getArticuloById(req, res) {
    res.status(200).json(await articuloService.getArticuloById(req.params.id));
  }
  async crearArticulo(req, res) {
    const articulo = await articuloService.crearArticulo(req.body);
    res.status(201).json({ mensaje: 'Artículo creado exitosamente', articulo });
  }
  async actualizarArticulo(req, res) {
    const articulo = await articuloService.actualizarArticulo(req.params.id, req.body);
    res.status(200).json({ mensaje: 'Artículo actualizado exitosamente', articulo });
  }
  async eliminarArticulo(req, res) {
    const articulo = await articuloService.eliminarArticulo(req.params.id);
    res.status(200).json({ mensaje: 'Artículo dado de baja correctamente (borrado lógico)', articulo });
  }
  async reactivarArticulo(req, res) {
    const articulo = await articuloService.reactivarArticulo(req.params.id);
    res.status(200).json({ mensaje: 'Artículo reactivado exitosamente', articulo });
  }
}

export default wrapController(new ArticuloController());
