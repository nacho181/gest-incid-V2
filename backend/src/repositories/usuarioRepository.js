/**
 * ============================================================================
 * REPOSITORIO DE USUARIOS
 * Consultas SQL directas para la tabla usuarios
 * ============================================================================
 */

const db = require('../config/db');

class UsuarioRepository {
  async findByUsuarioAndHash(usuario, contraseniaHash) {
    const queryText = `
      SELECT id_usuario, id_area, nombres, apellidos, usuario, avatar, rol, activo
      FROM public.usuarios
      WHERE (usuario = $1) AND contrasenia = $2 AND activo = 1
      LIMIT 1
    `;
    const { rows } = await db.query(queryText, [usuario, contraseniaHash]);
    return rows[0] || null;
  }

  async findEmpleados() {
    const queryText = `
      SELECT u.id_usuario, u.nombres, u.apellidos, u.usuario, u.rol, u.activo, a.descripcion AS area_descripcion
      FROM public.usuarios u
      JOIN public.areas a ON u.id_area = a.id_area
      WHERE u.activo = 1
      ORDER BY u.id_usuario ASC
    `;
    const { rows } = await db.query(queryText);
    return rows;
  }

  async findEmpleadosSistemas() {
    const queryText = `
      SELECT u.id_usuario, u.nombres, u.apellidos, u.usuario, u.rol, u.activo, a.descripcion AS area_descripcion
      FROM public.usuarios u
      JOIN public.areas a ON u.id_area = a.id_area
      WHERE u.id_area = 3 AND u.activo = 1 AND u.rol = 2
      ORDER BY u.apellidos ASC
    `;
    const { rows } = await db.query(queryText);
    return rows;
  }

  async updateAvatar(idUsuario, avatarUrl) {
    const updateQuery = `
      UPDATE public.usuarios
      SET avatar = $1
      WHERE id_usuario = $2
      RETURNING id_usuario, usuario, avatar
    `;
    const { rows } = await db.query(updateQuery, [avatarUrl, idUsuario]);
    return rows[0] || null;
  }

  async findById(idUsuario) {
    const queryText = `
      SELECT id_usuario, id_area, nombres, apellidos, usuario, avatar, rol, activo
      FROM public.usuarios
      WHERE id_usuario = $1
    `;
    const { rows } = await db.query(queryText, [idUsuario]);
    return rows[0] || null;
  }
}

module.exports = new UsuarioRepository();
