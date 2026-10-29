/**
 * ============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN Y CONTROL DE ACCESO (RBAC)
 * Verifica tokens JWT y valida permisos por rol en rutas protegidas.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT en el header Authorization.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso no autorizado',
      mensaje: 'Token no proporcionado o formato inválido (debe ser Bearer <token>)'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'secreto_concordia_jwt_2026';
    const decodificado = jwt.verify(token, jwtSecret);
    req.usuario = decodificado;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      mensaje: error.message
    });
  }
};

/**
 * Middleware para validar los roles permitidos en el endpoint.
 * @param  {...number} rolesPermitidos - Lista de IDs de roles autorizados (ej: 1, 2, 3)
 */
const autorizarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No posees los permisos necesarios para realizar esta acción'
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  autorizarRol
};