/**
 * ============================================================================
 * RUTAS DE AUTENTICACIÓN
 * Endpoints públicos y protegidos vinculados a la gestión de sesión.
 * ============================================================================
 */
import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';
import { validarCampos } from '../middlewares/validar.js';

const router = express.Router();

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

router.get('/me', verificarToken, authController.obtenerUsuarioActual);

router.post('/avatar', verificarToken, uploadAvatar.single('avatar'), authController.subirAvatar);

export default router;
