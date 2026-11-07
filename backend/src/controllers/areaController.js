/**
 * ============================================================================
 * CONTROLADOR DE ÁREAS
 * Capa de presentación para consulta de Áreas
 * ============================================================================
 */

import areaService from '../services/areaService.js';
import { wrapController } from '../utils/asyncHandler.js';

class AreaController {
  async getAreas(req, res) { res.status(200).json(await areaService.getAreas()); }
}

export default wrapController(new AreaController());