/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO EMPLEADOS
 * Definición de endpoints REST para la gestión de incidencias y artículos.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');
const { verificarToken, autorizarRol } = require('../middlewares/authMiddleware');

// Middleware para que cualquier empleado logueado pueda operar
const verificarEmpleado = [verificarToken, autorizarRol(1, 2, 3)];

/**
 * @openapi
 * tags:
 *   name: Empleados
 *   description: Endpoints para el reporte y listado de incidencias de empleados
 * 
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
 *               creado_por:
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
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Incidencia cancelada
 */


// Obtener la lista de usuarios/empleados municipales
router.get('/usuarios/empleados', verificarEmpleado, empleadoController.getEmpleados);

// Obtener el catálogo de artículos y equipamientos activos
router.get('/articulos', verificarEmpleado, empleadoController.getArticulos);

// Crear/Reportar una nueva incidencia técnica
router.post('/incidencias', verificarEmpleado, empleadoController.crearIncidencia);

// Obtener las incidencias reportadas por el empleado activo
router.get('/incidencias/mis-incidencias', verificarEmpleado, empleadoController.getMisIncidencias);

// Cancelar una incidencia propia en estado Pendiente
router.put('/incidencias/:id/cancelar', verificarEmpleado, empleadoController.cancelarIncidencia);

module.exports = router;