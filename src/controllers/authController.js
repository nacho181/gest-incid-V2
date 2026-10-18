/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN
 * Gestión de login con hashing SHA-256 y generación de tokens JWT.
 * ============================================================================
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Inicia sesión validando credenciales contra la base de datos.
 */
const login = async (req, res) => {
  const { usuario, contrasenia } = req.body;

  if (!usuario || !contrasenia) {
    return res.status(400).json({
      error: 'Campos requeridos',
      mensaje: 'Debes proporcionar usuario/correo y contraseña'
    });
  }

  try {
    // 1. Hashear la contraseña recibida en texto plano con SHA-256
    const contraseniaHash = crypto
      .createHash('sha256')
      .update(contrasenia.trim())
      .digest('hex');

    // 2. Buscar al usuario activo con el correo o usuario y el hash coincidente
    const queryText = `
      SELECT id_usuario, id_area, nombres, apellidos, usuario, avatar, rol, activo
      FROM usuarios
      WHERE (usuario = $1) AND contrasenia = $2 AND activo = 1
      LIMIT 1
    `;

    const { rows } = await db.query(queryText, [usuario.trim(), contraseniaHash]);

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Usuario o contraseña incorrectos, o usuario inactivo'
      });
    }

    const usuarioAutenticado = rows[0];

    // 3. Generar token JWT con los datos del usuario en el payload
    const payload = {
      id_usuario: usuarioAutenticado.id_usuario,
      id_area: usuarioAutenticado.id_area,
      nombres: usuarioAutenticado.nombres,
      apellidos: usuarioAutenticado.apellidos,
      usuario: usuarioAutenticado.usuario,
      rol: usuarioAutenticado.rol
    };

    const jwtSecret = process.env.JWT_SECRET || 'secreto_concordia_jwt_2026';
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '8h'
    });

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: usuarioAutenticado
    });

  } catch (error) {
    console.error('Error en el proceso de login:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No fue posible completar la autenticación'
    });
  }
};

/**
 * Devuelve la información del usuario autenticado en la sesión actual.
 */
const obtenerUsuarioActual = (req, res) => {
  return res.status(200).json({
    usuario: req.usuario
  });
};

module.exports = {
  login,
  obtenerUsuarioActual
};