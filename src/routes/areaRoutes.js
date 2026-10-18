/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ÁREAS
 * Endpoints REST para consulta de áreas municipales
 * ============================================================================
 */

const { uploadAvatar } = require('../middlewares/uploadMiddleware');
const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');

/**
 * @openapi
 * tags:
 *   name: Áreas
 *   description: Consulta de áreas municipales
 * 
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
module.exports = router;
