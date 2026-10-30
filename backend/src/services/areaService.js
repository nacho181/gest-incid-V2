/**
 * ============================================================================
 * SERVICIO DE ÁREAS
 * Lógica de negocio para áreas municipales
 * ============================================================================
 */

import areaRepository from '../repositories/areaRepository.js';

class AreaService {
  async getAreas() {
    return await areaRepository.findAll();
  }
}

export default new AreaService();
