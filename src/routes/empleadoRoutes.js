/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO EMPLEADOS
 * Definición de endpoints REST para la gestión de incidencias y artículos.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');

// Obtener la lista de usuarios/empleados municipales
router.get('/usuarios/empleados', empleadoController.getEmpleados);

// Obtener el catálogo de artículos y equipamientos activos
router.get('/articulos', empleadoController.getArticulos);

// Crear/Reportar una nueva incidencia técnica
router.post('/incidencias', empleadoController.crearIncidencia);

// Obtener las incidencias reportadas por el empleado activo
router.get('/incidencias/mis-incidencias', empleadoController.getMisIncidencias);

// Cancelar una incidencia propia en estado Pendiente
router.put('/incidencias/:id/cancelar', empleadoController.cancelarIncidencia);

module.exports = router;
