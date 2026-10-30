/**
 * ============================================================================
 * SERVICIO DE ARTÍCULOS
 * Lógica de negocio para BREAD de artículos
 * ============================================================================
 */

import articuloRepository from '../repositories/articuloRepository.js';
import categoriaRepository from '../repositories/categoriaRepository.js';
import areaRepository from '../repositories/areaRepository.js';
import ROLES from '../utils/roles.js';

class ArticuloService {
  async getArticulos(query, usuario) {
    const { incluir_inactivos, todos, id_categoria, id_area, buscar } = query;
    const esAdmin = usuario ? usuario.rol !== ROLES.MUNICIPAL : true;
    const traerTodos = esAdmin && (incluir_inactivos === 'true' || incluir_inactivos === '1' || todos === 'true' || todos === '1');

    return await articuloRepository.findAll({
      traerTodos,
      id_categoria,
      id_area,
      buscar
    });
  }

  async getArticuloById(id) {
    const idArt = parseInt(id, 10);
    if (isNaN(idArt)) {
      const error = new Error('El ID del artículo debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const articulo = await articuloRepository.findById(idArt);
    if (!articulo) {
      const error = new Error(`Artículo con ID ${idArt} no encontrado`);
      error.statusCode = 404;
      throw error;
    }

    return articulo;
  }

  async crearArticulo({ descripcion, id_categoria, id_area }) {
    if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
      const error = new Error('La descripción del artículo es obligatoria y no puede estar vacía');
      error.statusCode = 400;
      throw error;
    }

    const idCat = parseInt(id_categoria, 10);
    const idAr = parseInt(id_area, 10);

    if (isNaN(idCat) || idCat <= 0) {
      const error = new Error('El campo id_categoria es obligatorio y debe ser un ID válido');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(idAr) || idAr <= 0) {
      const error = new Error('El campo id_area es obligatorio y debe ser un ID válido');
      error.statusCode = 400;
      throw error;
    }

    const catCheck = await categoriaRepository.findById(idCat);
    if (!catCheck) {
      const error = new Error(`La categoría con ID ${idCat} no existe`);
      error.statusCode = 400;
      throw error;
    }

    const areaCheck = await areaRepository.findById(idAr);
    if (!areaCheck) {
      const error = new Error(`El área con ID ${idAr} no existe`);
      error.statusCode = 400;
      throw error;
    }

    const nuevoArticulo = await articuloRepository.create({
      descripcion: descripcion.trim(),
      id_categoria: idCat,
      id_area: idAr
    });

    nuevoArticulo.categoria_descripcion = catCheck.descripcion;
    nuevoArticulo.area_descripcion = areaCheck.descripcion;

    return nuevoArticulo;
  }

  async actualizarArticulo(id, { descripcion, id_categoria, id_area, activo }) {
    const idArt = parseInt(id, 10);
    if (isNaN(idArt)) {
      const error = new Error('El ID del artículo debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    if (descripcion !== undefined && (typeof descripcion !== 'string' || !descripcion.trim())) {
      const error = new Error('La descripción no puede estar vacía');
      error.statusCode = 400;
      throw error;
    }

    const check = await articuloRepository.findById(idArt);
    if (!check) {
      const error = new Error(`Artículo con ID ${idArt} no encontrado`);
      error.statusCode = 404;
      throw error;
    }

    if (id_categoria !== undefined && id_categoria !== null) {
      const idCat = parseInt(id_categoria, 10);
      const catCheck = await categoriaRepository.findById(idCat);
      if (!catCheck) {
        const error = new Error(`La categoría con ID ${idCat} no existe`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (id_area !== undefined && id_area !== null) {
      const idAr = parseInt(id_area, 10);
      const areaCheck = await areaRepository.findById(idAr);
      if (!areaCheck) {
        const error = new Error(`El área con ID ${idAr} no existe`);
        error.statusCode = 400;
        throw error;
      }
    }

    const articuloActualizado = await articuloRepository.update(idArt, {
      descripcion: descripcion ? descripcion.trim() : undefined,
      id_categoria: id_categoria ? parseInt(id_categoria, 10) : undefined,
      id_area: id_area ? parseInt(id_area, 10) : undefined,
      activo: activo !== undefined ? parseInt(activo, 10) : undefined
    });

    const fullDetails = await articuloRepository.findById(idArt);
    return fullDetails || articuloActualizado;
  }

  async eliminarArticulo(id) {
    const idArt = parseInt(id, 10);
    if (isNaN(idArt)) {
      const error = new Error('El ID del artículo debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const check = await articuloRepository.findById(idArt);
    if (!check) {
      const error = new Error(`Artículo con ID ${idArt} no encontrado`);
      error.statusCode = 404;
      throw error;
    }

    return await articuloRepository.softDelete(idArt);
  }

  async reactivarArticulo(id) {
    const idArt = parseInt(id, 10);
    if (isNaN(idArt)) {
      const error = new Error('El ID del artículo debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    const check = await articuloRepository.findById(idArt);
    if (!check) {
      const error = new Error(`Artículo con ID ${idArt} no encontrado`);
      error.statusCode = 404;
      throw error;
    }

    return await articuloRepository.reactivate(idArt);
  }
}

export default new ArticuloService();
