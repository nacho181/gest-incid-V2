/**
 * ============================================================================
 * RUTAS DE LA API - USUARIOS
 * Consulta de personal. Por ahora solo el listado de técnicos de Sistemas.
 * ============================================================================
 */

import express from 'express';
import { query } from 'express-validator';
import directorController from '../controllers/directorController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import { validarCampos } from '../middlewares/validar.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

/**
 * @openapi
 * /api/v1/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar técnicos del área de Sistemas (solo Director)
 *     description: Se usa para elegir a quién asignar una incidencia.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['2']
 *         description: Por ahora solo se admite rol=2 (técnicos de Sistemas)
 *     responses:
 *       200:
 *         description: Lista de técnicos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_usuario:
 *                     type: integer
 *                     example: 1
 *                   nombres:
 *                     type: string
 *                     example: Carlos
 *                   apellidos:
 *                     type: string
 *                     example: Perez
 *                   usuario:
 *                     type: string
 *                     example: carper@correo.com
 *                   rol:
 *                     type: integer
 *                     example: 2
 *                   activo:
 *                     type: integer
 *                     example: 1
 *                   area_descripcion:
 *                     type: string
 *                     example: Sistemas
 *       400:
 *         $ref: '#/components/responses/Validacion'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 */

// GET /usuarios?rol=2  -> técnicos del área de Sistemas (solo Director)
router.get(
  '/',
  verificarToken,
  autorizarRol(ROLES.DIRECTOR),
  [
    query('rol').isIn(['2']).withMessage('Por ahora solo se admite el filtro rol=2 (técnicos de Sistemas)'),
    validarCampos
  ],
  directorController.getEmpleadosSistemas
);

export default router;