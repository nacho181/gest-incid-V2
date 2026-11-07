/**
 * ============================================================================
 * CONTROLADOR DE CATEGORÍAS
 * Capa de presentación para BREAD de Categorías
 * ============================================================================
 */

import categoriaService from '../services/categoriaService.js';
import { wrapController } from '../utils/asyncHandler.js';

class CategoriaController {
  async getCategorias(req, res) {
    res.status(200).json(await categoriaService.getCategorias(req.query));
  }

  async getCategoriaById(req, res) {
    res.status(200).json(await categoriaService.getCategoriaById(req.params.id));
  }

  async crearCategoria(req, res) {
    const categoria = await categoriaService.crearCategoria(req.body);
    res.status(201).json({ mensaje: 'Categoría creada exitosamente', categoria });
  }

  async actualizarCategoria(req, res) {
    const categoria = await categoriaService.actualizarCategoria(req.params.id, req.body);
    res.status(200).json({ mensaje: 'Categoría actualizada exitosamente', categoria });
  }

  async eliminarCategoria(req, res) {
    const categoria = await categoriaService.eliminarCategoria(req.params.id);
    res.status(200).json({ mensaje: 'Categoría dada de baja correctamente (borrado lógico)', categoria });
  }

  async reactivarCategoria(req, res) {
    const categoria = await categoriaService.reactivarCategoria(req.params.id);
    res.status(200).json({ mensaje: 'Categoría reactivada exitosamente', categoria });
  }
}

export default wrapController(new CategoriaController());