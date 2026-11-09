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
 * /api/v1/director/reportes/pdf:
 *   get:
 *     tags: [Director]
 *     summary: Generar y descargar reporte oficial de incidencias en PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del filtro (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del filtro (YYYY-MM-DD)
 *       - in: query
 *         name: id_estado
 *         schema:
 *           type: integer
 *         description: Filtrar por ID del estado (1 Pendiente, 2 En Proceso, 3 Resuelta, 4 Cancelada)
 *       - in: query
 *         name: asignado_a
 *         schema:
 *           type: integer
 *         description: Filtrar por técnico asignado (ID del usuario de sistemas o 0 para sin asignar)
 *     responses:
 *       200:
 *         description: Archivo PDF generado y transmitido por stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

// Resumen del dashboard (totales por estado, totales por fecha, prioritarias)
router.get('/dashboard', verificarDirector, directorController.getDashboardSummary);

// Generación y descarga de reporte oficial de incidencias en formato PDF (PDFKit)
router.get('/director/reportes/pdf', verificarDirector, directorController.generarReportePdf);
router.get('/reportes/pdf', verificarDirector, directorController.generarReportePdf);

export default router;