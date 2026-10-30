/**
 * ============================================================================
 * SERVICIO DE CATEGORÍAS
 * Lógica de negocio para BREAD de categorías
 * ============================================================================
 */

import categoriaRepository from '../repositories/categoriaRepository.js';

class CategoriaService {
  async getCategorias(query) {
    const { incluir_inactivos, todos, buscar } = query;
    const traerTodos = incluir_inactivos === 'true' || incluir_inactivos === '1' || todos === 'true' || todos === '1';

    return await categoriaRepository.findAll({
      traerTodos,
      buscar
    });
  }

  async getCategoriaById(id) {
    const idCat = parseInt(id, 10);
    if (isNaN(idCat)) {
      const error = new Error('El ID de la categoría debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const categoria = await categoriaRepository.findById(idCat);
    if (!categoria) {
      const error = new Error(`Categoría con ID ${idCat} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    return categoria;
  }

  async crearCategoria({ descripcion }) {
    if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
      const error = new Error('La descripción de la categoría es obligatoria y no puede estar vacía');
      error.statusCode = 400;
      throw error;
    }

    return await categoriaRepository.create({ descripcion: descripcion.trim() });
  }

  async actualizarCategoria(id, { descripcion, activo }) {
    const idCat = parseInt(id, 10);
    if (isNaN(idCat)) {
      const error = new Error('El ID de la categoría debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    if (descripcion !== undefined && (typeof descripcion !== 'string' || !descripcion.trim())) {
      const error = new Error('La descripción no puede estar vacía');
      error.statusCode = 400;
      throw error;
    }

    const check = await categoriaRepository.findById(idCat);
    if (!check) {
      const error = new Error(`Categoría con ID ${idCat} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    return await categoriaRepository.update(idCat, {
      descripcion: descripcion ? descripcion.trim() : undefined,
      activo: activo !== undefined ? parseInt(activo, 10) : undefined
    });
  }

  async eliminarCategoria(id) {
    const idCat = parseInt(id, 10);
    if (isNaN(idCat)) {
      const error = new Error('El ID de la categoría debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const check = await categoriaRepository.findById(idCat);
    if (!check) {
      const error = new Error(`Categoría con ID ${idCat} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    return await categoriaRepository.softDelete(idCat);
  }

  async reactivarCategoria(id) {
    const idCat = parseInt(id, 10);
    if (isNaN(idCat)) {
      const error = new Error('El ID de la categoría debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const check = await categoriaRepository.findById(idCat);
    if (!check) {
      const error = new Error(`Categoría con ID ${idCat} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    return await categoriaRepository.reactivate(idCat);
  }
}

export default new CategoriaService();
