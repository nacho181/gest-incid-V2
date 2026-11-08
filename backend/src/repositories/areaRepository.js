/**
 * ============================================================================
 * REPOSITORIO DE ÁREAS
 * Consultas SQL directas para la tabla areas
 * ============================================================================
 */

import db from '../config/db.js';

export const AREAS_SORT_MAP = {
  id: 'id_area',
  id_area: 'id_area',
  descripcion: 'descripcion',
  activo: 'activo'
};

class AreaRepository {
  async findAllPaginated({
    buscar = null,
    limit = 10,
    offset = 0,
    sortSql = 'id_area ASC'
  } = {}) {
    const fromAndWhere = `
      FROM public.areas
      WHERE activo = 1
    `;
    const params = [];
    let filterClauses = '';

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      filterClauses += ` AND descripcion ILIKE $${params.length}`;
    }

    const countSql = `SELECT COUNT(*)::int AS total ${fromAndWhere} ${filterClauses}`;
    const countResult = await db.query(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    const dataParams = [...params];
    dataParams.push(limit);
    const limitPlaceholder = `$${dataParams.length}`;
    dataParams.push(offset);
    const offsetPlaceholder = `$${dataParams.length}`;

    const dataSql = `
      SELECT id_area, descripcion, activo
      ${fromAndWhere} ${filterClauses}
      ORDER BY ${sortSql}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const { rows } = await db.query(dataSql, dataParams);
    return { rows, total };
  }

  async findById(idArea) {
    const queryText = `
      SELECT id_area, descripcion, activo
      FROM public.areas
      WHERE id_area = $1
    `;
    const { rows } = await db.query(queryText, [idArea]);
    return rows[0] || null;
  }
}

export default new AreaRepository();
