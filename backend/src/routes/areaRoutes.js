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
 *     summary: Obtener lista de áreas disponibles
 *     responses:
 *       200:
 *         description: Lista de áreas obtenida exitosamente
 */

// Obtener lista de áreas
router.get('/', areaController.getAreas);

export default router;
