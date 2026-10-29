/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * Lógica de negocio de login, hashing y tokens
 * ============================================================================
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');

class AuthService {
  async login(usuario, contrasenia) {
    if (!usuario || !contrasenia) {
      const error = new Error('Debes proporcionar usuario/correo y contraseña');
      error.statusCode = 400;
      throw error;
    }

    const contraseniaHash = crypto
      .createHash('sha256')
      .update(contrasenia.trim())
      .digest('hex');

    const usuarioAutenticado = await usuarioRepository.findByUsuarioAndHash(
      usuario.trim(),
      contraseniaHash
    );

    if (!usuarioAutenticado) {
      const error = new Error('Usuario o contraseña incorrectos, o usuario inactivo');
      error.statusCode = 401;
      throw error;
    }

    const payload = {
      id_usuario: usuarioAutenticado.id_usuario,
      id_area: usuarioAutenticado.id_area,
      nombres: usuarioAutenticado.nombres,
      apellidos: usuarioAutenticado.apellidos,
      usuario: usuarioAutenticado.usuario,
      rol: usuarioAutenticado.rol
    };

    const jwtSecret = process.env.JWT_SECRET || 'secreto_concordia_jwt_2026';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '8h' });

    return { token, usuario: usuarioAutenticado };
  }

  async subirAvatar(idUsuario, file) {
    if (!file) {
      const error = new Error('No se subió ninguna imagen o el formato es incorrecto');
      error.statusCode = 400;
      throw error;
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const usuarioActualizado = await usuarioRepository.updateAvatar(idUsuario, avatarUrl);

    if (!usuarioActualizado) {
      const error = new Error('Usuario no encontrado para actualizar avatar');
      error.statusCode = 404;
      throw error;
    }

    return usuarioActualizado;
  }
}

module.exports = new AuthService();
