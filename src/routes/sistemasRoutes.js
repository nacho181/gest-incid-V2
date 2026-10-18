/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO EMPLEADO DE SISTEMAS
 * Endpoints protegidos por JWT y RBAC (rol 2: Sistemas, rol 3: Director)
 * Implementación para: Incidencias - Sistemas y Notificaciones.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const sistemasController = require('../controllers/sistemasController');
const { verificarToken, autorizarRol } = require('../middlewares/authMiddleware');

// Middleware para verificar token JWT y autorizar roles de sistemas (2 = Empleado de Sistemas, 3 = Director)
const verificarSistemas = [verificarToken, autorizarRol(2, 3)];

// Obtener todas las incidencias asignadas al empleado de Sistemas autenticado
router.get('/incidencias', verificarSistemas, sistemasController.getIncidenciasAsignadas);

// Finalizar una incidencia asignada cargando la solución técnica y notificando por correo
router.put('/incidencias/:id/finalizar', verificarSistemas, sistemasController.finalizarIncidencia);

module.exports = router;
