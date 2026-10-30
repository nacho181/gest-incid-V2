/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN
 * Capa de presentación para autenticación
 * ============================================================================
 */

import authService from '../services/authService.js';

class AuthController {
  async login(req, res, next) {
    try {
      const { usuario, contrasenia } = req.body;
      const result = await authService.login(usuario, contrasenia);
      return res.status(200).json({
        mensaje: 'Inicio de sesión exitoso',
        token: result.token,
        usuario: result.usuario
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error interno del servidor'
      });
    }
  }

  obtenerUsuarioActual(req, res) {
    return res.status(200).json({
      usuario: req.usuario
    });
  }

  async subirAvatar(req, res, next) {
    try {
      const idUsuario = req.usuario.id_usuario;
      const usuarioActualizado = await authService.subirAvatar(idUsuario, req.file);
      return res.status(200).json({
        mensaje: 'Avatar actualizado exitosamente',
        usuario: usuarioActualizado
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error interno al guardar el avatar'
      });
    }
  }
}

export default new AuthController();
