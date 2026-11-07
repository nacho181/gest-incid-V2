/**
 * ============================================================================
 * CONTROLADOR MÓDULO EMPLEADO DE SISTEMAS
 * Capa de presentación para el módulo Sistemas
 * ============================================================================
 */

import sistemasService from '../services/sistemasService.js';
import { wrapController } from '../utils/asyncHandler.js';

class SistemasController {
  async getIncidenciasAsignadas(req, res) {
    res.status(200).json(await sistemasService.getIncidenciasAsignadas(req.usuario.id_usuario));
  }
  async finalizarIncidencia(req, res) {
    const { id } = req.params;
    const result = await sistemasService.finalizarIncidencia({
      idIncidencia: id,
      descripcion_resolucion: req.body.descripcion_resolucion,
      usuarioAutenticado: req.usuario
    });
    res.status(200).json({
      mensaje: `Incidencia #${id} finalizada exitosamente`,
      incidencia: result.incidencia,
      notificacion_email: result.notificacion_email
    });
  }
}

export default wrapController(new SistemasController());