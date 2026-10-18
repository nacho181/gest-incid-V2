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
const verificarDirector = [verificarToken, autorizarRol(3)];

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
