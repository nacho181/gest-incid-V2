/**
 * ============================================================================
 * REPOSITORIO DE ARTÍCULOS
 * Consultas SQL directas para la tabla articulos y sus relaciones
 * ============================================================================
 */

import db from '../config/db.js';

export const ARTICULOS_SORT_MAP = {
  id: 'art.id_articulo',
  id_articulo: 'art.id_articulo',
  descripcion: 'art.descripcion',
  id_area: 'art.id_area',
  id_categoria: 'art.id_categoria',
  activo: 'art.activo',
  categoria_descripcion: 'cat.descripcion',
  area_descripcion: 'ar.descripcion'
};

class ArticuloRepository {
  /**
   * Consulta paginada con LIMIT, OFFSET, conteo total y ordenamiento seguro en base de datos.
   */
  async findAllPaginated({
    traerTodos = false,
    id_categoria = null,
    id_area = null,
    buscar = null,
    limit = 10,
    offset = 0,
    sortSql = 'art.id_articulo ASC'
  } = {}) {
    const fromAndWhere = `
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE 1=1
    `;
    const params = [];
    let filterClauses = '';

    if (!traerTodos) {
      params.push(1);
      filterClauses += ` AND art.activo = $${params.length}`;
    }

    if (id_categoria) {
      params.push(parseInt(id_categoria, 10));
      filterClauses += ` AND art.id_categoria = $${params.length}`;
    }

    if (id_area) {
      params.push(parseInt(id_area, 10));
      filterClauses += ` AND art.id_area = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      filterClauses += ` AND (art.descripcion ILIKE $${params.length} OR cat.descripcion ILIKE $${params.length} OR ar.descripcion ILIKE $${params.length})`;
    }

    // 1. Conteo total de registros que cumplen los filtros (sin LIMIT ni OFFSET)
    const countSql = `SELECT COUNT(*)::int AS total ${fromAndWhere} ${filterClauses}`;
    const countResult = await db.query(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    // 2. Consulta de registros con ordenamiento y paginación LIMIT / OFFSET
    const dataParams = [...params];
    dataParams.push(limit);
    const limitPlaceholder = `$${dataParams.length}`;
    dataParams.push(offset);
    const offsetPlaceholder = `$${dataParams.length}`;

    const dataSql = `
      SELECT art.id_articulo, art.id_area, art.id_categoria, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      ${fromAndWhere} ${filterClauses}
      ORDER BY ${sortSql}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const { rows } = await db.query(dataSql, dataParams);
    return { rows, total };
  }

  async existeActivo(idArticulo, executor = db) {
    const { rows } = await executor.query(
      'SELECT 1 FROM public.articulos WHERE id_articulo = $1 AND activo = 1',
      [idArticulo]
    );
    return rows.length > 0;
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
