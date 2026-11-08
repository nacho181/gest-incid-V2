/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ÁREAS
 * Endpoints REST para consulta de áreas municipales
 * ============================================================================
 */

import express from 'express';
import areaController from '../controllers/areaController.js';

const router = express.Router();

/**
 * @openapi
 * /api/v1/areas:
 *   get:
 *     tags: [Áreas]
 *     summary: Obtener lista de áreas disponibles con paginación y ordenamiento
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [id_area, descripcion]
 *           default: id_area
 *       - in: query
 *         name: order_dir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista paginada de áreas obtenida exitosamente
 */

// Obtener lista de áreas
router.get('/', areaController.getAreas);

export default router;
