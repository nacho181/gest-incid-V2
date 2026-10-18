/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO DIRECTOR DE SISTEMAS
 * Definición de endpoints protegidos por JWT para el rol Director.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const directorController = require('../controllers/directorController');
const { verificarToken, autorizarRol } = require('../middlewares/authMiddleware');

// Middleware estricto para validar token JWT y verificar el rol de Director de Sistemas (rol 3)
const verificarDirector = [verificarToken, autorizarRol(1)];

/**
 * @openapi
 * tags:
 *   name: Director
 *   description: Panel de supervisión y reportes del Director de Sistemas
 * 
 * /api/v1/director/dashboard:
 *   get:
 *     tags: [Director]
 *     summary: Resumen de métricas para el dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del dashboard obtenidos correctamente
 * 
 * /api/v1/director/empleados-sistemas:
 *   get:
 *     tags: [Director]
 *     summary: Lista de técnicos del área de sistemas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empleados obtenida
 * 
 * /api/v1/director/incidencias:
 *   get:
 *     tags: [Director]
 *     summary: Obtener todas las incidencias de la institución
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de incidencias
 * 
 * /api/v1/director/incidencias/{id}/asignar:
 *   put:
 *     tags: [Director]
 *     summary: Asignar una incidencia a un empleado de sistemas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario_sistemas:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Incidencia asignada correctamente
 * 
 * /api/v1/director/incidencias/{id}/cancelar:
 *   put:
 *     tags: [Director]
 *     summary: Cancelar una incidencia en estado Pendiente
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
 * 
 * /api/v1/director/reportes:
 *   get:
 *     tags: [Director]
 *     summary: Obtener datos para reportes estadísticos en PDF
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos estadísticos obtenidos
 */


// Resumen del dashboard (totales por estado, totales por fecha, prioritarias)
router.get('/dashboard', verificarDirector, directorController.getDashboardSummary);

// Lista de empleados de la área de Sistemas
router.get('/empleados-sistemas', verificarDirector, directorController.getEmpleadosSistemas);

// Obtener todas las incidencias de la institución
router.get('/incidencias', verificarDirector, directorController.getTodasIncidencias);

// Asignar una incidencia a un empleado de Sistemas
router.put('/incidencias/:id/asignar', verificarDirector, directorController.asignarIncidencia);

// Cancelar una incidencia en estado Pendiente (Soft Delete)
router.put('/incidencias/:id/cancelar', verificarDirector, directorController.cancelarIncidenciaDirector);

// Obtener datos para reportes estadísticos en PDF
router.get('/reportes', verificarDirector, directorController.getReportesEstadisticos);

module.exports = router;
