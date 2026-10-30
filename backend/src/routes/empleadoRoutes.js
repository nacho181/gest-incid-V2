/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO EMPLEADOS
 * Definición de endpoints REST para la gestión de incidencias y artículos.
 * ============================================================================
 */

import express from 'express';
import empleadoController from '../controllers/empleadoController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

// Middleware para que cualquier empleado logueado pueda operar
const verificarEmpleado = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS, ROLES.MUNICIPAL)];
const verificarSoloMunicipal = [verificarToken, autorizarRol(ROLES.MUNICIPAL)];

/**
 * @openapi
 * /api/v1/incidencias:
 *   post:
 *     tags: [Empleados]
 *     summary: Reportar una nueva incidencia técnica
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_articulo:
 *                 type: integer
 *               prioridad:
 *                 type: integer
 *               descripcion_pedido:
 *                 type: string
 *     responses:
 *       201:
 *         description: Incidencia creada
 * 
 * /api/v1/incidencias/mis-incidencias:
 *   get:
 *     tags: [Empleados]
 *     summary: Obtener las incidencias reportadas por el usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de incidencias
 * 
 * /api/v1/incidencias/{id}/cancelar:
 *   put:
 *     tags: [Empleados]
 *     summary: Cancelar una incidencia propia en estado Pendiente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Incidencia cancelada
 */

// Obtener la lista de usuarios/empleados municipales
router.get('/usuarios/empleados', verificarEmpleado, empleadoController.getEmpleados);

// Crear/Reportar una nueva incidencia técnica
router.post('/incidencias', verificarSoloMunicipal, empleadoController.crearIncidencia);

// Obtener las incidencias reportadas por el empleado activo
router.get('/incidencias/mis-incidencias', verificarEmpleado, empleadoController.getMisIncidencias);

// Cancelar una incidencia propia en estado Pendiente
router.put('/incidencias/:id/cancelar', verificarEmpleado, empleadoController.cancelarIncidencia);

export default router;
