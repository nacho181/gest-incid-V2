/**
 * ============================================================================
 * REPOSITORIO DE ARTÍCULOS
 * Consultas SQL directas para la tabla articulos y sus relaciones
 * ============================================================================
 */

import db from '../config/db.js';

class ArticuloRepository {
  async findAll({ traerTodos = false, id_categoria = null, id_area = null, buscar = null } = {}) {
    let queryText = `
      SELECT art.id_articulo, art.id_area, art.id_categoria, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE 1=1
    `;
    const params = [];

    if (!traerTodos) {
      params.push(1);
      queryText += ` AND art.activo = $${params.length}`;
    }

    if (id_categoria) {
      params.push(parseInt(id_categoria, 10));
      queryText += ` AND art.id_categoria = $${params.length}`;
    }

    if (id_area) {
      params.push(parseInt(id_area, 10));
      queryText += ` AND art.id_area = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      queryText += ` AND art.descripcion ILIKE $${params.length}`;
    }

    queryText += ` ORDER BY art.id_articulo ASC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  }

  async findById(idArt) {
    const queryText = `
      SELECT art.id_articulo, art.id_area, art.id_categoria, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE art.id_articulo = $1
    `;
    const { rows } = await db.query(queryText, [idArt]);
    return rows[0] || null;
  }

  async create({ id_area, id_categoria, descripcion }) {
    const insertQuery = `
      INSERT INTO public.articulos (id_area, id_categoria, descripcion, activo)
      VALUES ($1, $2, $3, 1)
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(insertQuery, [id_area, id_categoria, descripcion]);
    return rows[0];
  }

  async update(idArt, { descripcion, id_categoria, id_area, activo }) {
    const updateQuery = `
      UPDATE public.articulos
      SET descripcion = COALESCE($1, descripcion),
          id_categoria = COALESCE($2, id_categoria),
          id_area = COALESCE($3, id_area),
          activo = COALESCE($4, activo)
      WHERE id_articulo = $5
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(updateQuery, [
      descripcion || null,
      id_categoria || null,
      id_area || null,
      activo !== undefined && activo !== null ? activo : null,
      idArt
    ]);
    return rows[0] || null;
  }

  async softDelete(idArt) {
    const queryText = `
      UPDATE public.articulos
      SET activo = 0
      WHERE id_articulo = $1
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(queryText, [idArt]);
    return rows[0] || null;
  }

  async reactivate(idArt) {
    const queryText = `
      UPDATE public.articulos
      SET activo = 1
      WHERE id_articulo = $1
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(queryText, [idArt]);
    return rows[0] || null;
  }
}

export default new ArticuloRepository();
