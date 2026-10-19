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
const ROLES = require('../config/roles');

// Middleware para verificar token JWT y autorizar roles de sistemas (2 = Empleado de Sistemas, 3 = Director)
const verificarSistemas = [verificarToken, autorizarRol(ROLES.SISTEMAS, ROLES.DIRECTOR)];

/**
 * @openapi
 * tags:
 *   name: Sistemas
 *   description: Gestión de incidencias asignadas a técnicos
 * 
 * /api/v1/sistemas/incidencias:
 *   get:
 *     tags: [Sistemas]
 *     summary: Obtener incidencias asignadas al técnico
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de incidencias
 * 
 * /api/v1/sistemas/incidencias/{id}/finalizar:
 *   put:
 *     tags: [Sistemas]
 *     summary: Finalizar incidencia y cargar resolución técnica
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
 *               descripcion_resolucion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incidencia finalizada y correo enviado
 */

// Obtener todas las incidencias asignadas al empleado de Sistemas autenticado
router.get('/incidencias', verificarSistemas, sistemasController.getIncidenciasAsignadas);

// Finalizar una incidencia asignada cargando la solución técnica y notificando por correo
router.put('/incidencias/:id/finalizar', verificarSistemas, sistemasController.finalizarIncidencia);

module.exports = router;
