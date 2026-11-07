/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN
 * Capa de presentación para autenticación
 * ============================================================================
 */

import authService from '../services/authService.js';
import { wrapController } from '../utils/asyncHandler.js';

class AuthController {
  async login(req, res) {
    const { usuario, contrasenia } = req.body;
    const result = await authService.login(usuario, contrasenia);
    res.status(200).json({ mensaje: 'Inicio de sesión exitoso', token: result.token, usuario: result.usuario });
  }
  obtenerUsuarioActual(req, res) { res.status(200).json({ usuario: req.usuario }); }
  async subirAvatar(req, res) {
    const usuario = await authService.subirAvatar(req.usuario.id_usuario, req.file);
    res.status(200).json({ mensaje: 'Avatar actualizado exitosamente', usuario });
  }
}

export default wrapController(new AuthController());