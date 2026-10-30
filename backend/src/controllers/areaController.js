/**
 * ============================================================================
 * CONTROLADOR DE ÁREAS
 * Capa de presentación para consulta de Áreas
 * ============================================================================
 */

import areaService from '../services/areaService.js';

class AreaController {
  async getAreas(req, res) {
    try {
      const areas = await areaService.getAreas();
      return res.status(200).json(areas);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener las áreas'
      });
    }
  }
}

export default new AreaController();
