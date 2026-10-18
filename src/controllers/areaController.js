/**
 * ============================================================================
 * CONTROLADOR DE ÁREAS MUNICIPALES
 * Listado de áreas para relaciones con artículos y usuarios.
 * ============================================================================
 */

const db = require('../config/db');

let mockAreas = [
  { id_area: 1, descripcion: 'Legales', activo: 1 },
  { id_area: 2, descripcion: 'Personal', activo: 1 },
  { id_area: 3, descripcion: 'Sistemas', activo: 1 },
  { id_area: 4, descripcion: 'Hacienda', activo: 1 },
  { id_area: 5, descripcion: 'Finanzas', activo: 1 },
  { id_area: 6, descripcion: 'Salud y Accion Social', activo: 1 },
  { id_area: 7, descripcion: 'Desarrollo Urbano', activo: 0 }
];

/**
 * Obtiene el listado de áreas activas.
 */
exports.getAreas = async (req, res) => {
  const { incluir_inactivos } = req.query;
  const traerTodos = incluir_inactivos === 'true' || incluir_inactivos === '1';

  try {
    let queryText = `SELECT id_area, descripcion, activo FROM public.areas`;
    if (!traerTodos) {
      queryText += ` WHERE activo = 1`;
    }
    queryText += ` ORDER BY id_area ASC`;

    const result = await db.query(queryText);
    return res.status(200).json(result.rows);
  } catch (error) {
    let filtradas = [...mockAreas];
    if (!traerTodos) {
      filtradas = filtradas.filter(a => a.activo === 1);
    }
    return res.status(200).json(filtradas);
  }
};
