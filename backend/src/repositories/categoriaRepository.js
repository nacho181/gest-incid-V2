/**
 * ============================================================================
 * REPOSITORIO DE CATEGORÍAS
 * Consultas SQL directas para la tabla categorias
 * ============================================================================
 */

import db from '../config/db.js';

export const CATEGORIAS_SORT_MAP = {
  id: 'id_categoria',
  id_categoria: 'id_categoria',
  descripcion: 'descripcion',
  activo: 'activo'
};

class CategoriaRepository {
  /**
   * Consulta paginada con LIMIT, OFFSET, conteo total y ordenamiento seguro en base de datos.
   */
  async findAllPaginated({
    traerTodos = false,
    buscar = null,
    limit = 10,
    offset = 0,
    sortSql = 'id_categoria ASC'
  } = {}) {
    const fromAndWhere = `
      FROM public.categorias
      WHERE 1=1
    `;
    const params = [];
    let filterClauses = '';

    if (!traerTodos) {
      params.push(1);
      filterClauses += ` AND activo = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      filterClauses += ` AND descripcion ILIKE $${params.length}`;
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
      SELECT id_categoria, descripcion, activo
      ${fromAndWhere} ${filterClauses}
      ORDER BY ${sortSql}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const { rows } = await db.query(dataSql, dataParams);
    return { rows, total };
  }

  async findById(idCat) {
    const queryText = `
      SELECT id_categoria, descripcion, activo
      FROM public.categorias
      WHERE id_categoria = $1
    `;
    const { rows } = await db.query(queryText, [idCat]);
    return rows[0] || null;
  }

  async create({ descripcion }) {
    const insertQuery = `
      INSERT INTO public.categorias (descripcion, activo)
      VALUES ($1, 1)
      RETURNING id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(insertQuery, [descripcion]);
    return rows[0];
  }

  async update(idCat, { descripcion, activo }) {
    const updateQuery = `
      UPDATE public.categorias
      SET descripcion = COALESCE($1, descripcion),
          activo = COALESCE($2, activo)
      WHERE id_categoria = $3
      RETURNING id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(updateQuery, [
      descripcion || null,
      activo !== undefined && activo !== null ? activo : null,
      idCat
    ]);
    return rows[0] || null;
  }

  async softDelete(idCat) {
    const queryText = `
      UPDATE public.categorias
      SET activo = 0
      WHERE id_categoria = $1
      RETURNING id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(queryText, [idCat]);
    return rows[0] || null;
  }

  async reactivate(idCat) {
    const queryText = `
      UPDATE public.categorias
      SET activo = 1
      WHERE id_categoria = $1
      RETURNING id_categoria, descripcion, activo
    `;
    const { rows } = await db.query(queryText, [idCat]);
    return rows[0] || null;
  }
}

export default new CategoriaRepository();
