/**
 * ============================================================================
 * RUTAS DE LA API - ESTADÍSTICAS DEL DIRECTOR
 * Dashboard y reportes. Protegidas por JWT para el rol Director.
 * ============================================================================
 */

import express from 'express';
import directorController from '../controllers/directorController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

const verificarDirector = [verificarToken, autorizarRol(ROLES.DIRECTOR)];

/**
 * @openapi
 * /api/v1/dashboard:
 *   get:
 *     tags: [Director]
 *     summary: Resumen de métricas para el dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Totales por estado, por fecha e incidencias prioritarias
 *
 * /api/v1/reportes:
 *   get:
 *     tags: [Director]
 *     summary: Datos para reportes estadísticos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos estadísticos obtenidos
 */

// Resumen del dashboard (totales por estado, totales por fecha, prioritarias)
router.get('/dashboard', verificarDirector, directorController.getDashboardSummary);

// Datos para reportes estadísticos
router.get('/reportes', verificarDirector, directorController.getReportesEstadisticos);

export default router;