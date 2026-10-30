/**
 * ============================================================================
 * REPOSITORIO DE ÁREAS
 * Consultas SQL directas para la tabla areas
 * ============================================================================
 */

import db from '../config/db.js';

class AreaRepository {
  async findAll() {
    const queryText = `
      SELECT id_area, descripcion, activo
      FROM public.areas
      WHERE activo = 1
      ORDER BY id_area ASC
    `;
    const { rows } = await db.query(queryText);
    return rows;
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
