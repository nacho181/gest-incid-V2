/**
 * ============================================================================
 * SERVICIO DE ÁREAS
 * Lógica de negocio para áreas municipales
 * ============================================================================
 */

const areaRepository = require('../repositories/areaRepository');

class AreaService {
  async getAreas() {
    return await areaRepository.findAll();
  }
}

module.exports = new AreaService();
