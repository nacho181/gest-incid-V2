/**
 * ============================================================================
 * RUTAS DE AUTENTICACIÓN
 * Endpoints públicos y protegidos vinculados a la gestión de sesión.
 * ============================================================================
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');

// 1. IMPORTANTE: Importar el middleware verificarToken
const { verificarToken } = require('../middlewares/authMiddleware');

// 2. Importar el middleware de subida de archivos (Multer)
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

// Middleware genérico para capturar errores de express-validator
const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión en el sistema
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario:
 *                 type: string
 *               contrasenia:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve el token JWT
 *       401:
 *         description: Credenciales inválidas
 * 
 * /api/v1/auth/me:
 *   get:
 *     tags: [Autenticación]
 *     summary: Obtener información del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 */

// POST /api/v1/auth/login - Con validación de entrada
router.post(
  '/login',
  [
    body('usuario').trim().notEmpty().withMessage('El usuario es obligatorio'),
    body('contrasenia').trim().notEmpty().withMessage('La contraseña es obligatoria'),
    validarCampos
  ],
  authController.login
);

// GET /api/v1/auth/me - Obtener información del usuario logueado
router.get('/me', verificarToken, authController.obtenerUsuarioActual);

// POST /api/v1/auth/avatar - Subir imagen de perfil con Multer
router.post('/avatar', verificarToken, uploadAvatar.single('avatar'), authController.subirAvatar);

module.exports = router;