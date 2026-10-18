/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ÁREAS
 * Endpoints REST para consulta de áreas municipales
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');

// Obtener lista de áreas
router.get('/', areaController.getAreas);

module.exports = router;
