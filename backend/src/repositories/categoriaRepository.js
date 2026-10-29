/**
 * ============================================================================
 * REPOSITORIO DE CATEGORÍAS
 * Consultas SQL directas para la tabla categorias
 * ============================================================================
 */

const db = require('../config/db');

class CategoriaRepository {
  async findAll({ traerTodos = false, buscar = null } = {}) {
    let queryText = `
      SELECT id_categoria, descripcion, activo
      FROM public.categorias
      WHERE 1=1
    `;
    const params = [];

    if (!traerTodos) {
      params.push(1);
      queryText += ` AND activo = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      queryText += ` AND descripcion ILIKE $${params.length}`;
    }

    queryText += ` ORDER BY id_categoria ASC`;

    const { rows } = await db.query(queryText, params);
    return rows;
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

module.exports = new CategoriaRepository();
