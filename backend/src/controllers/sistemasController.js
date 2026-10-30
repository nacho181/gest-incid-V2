/**
 * ============================================================================
 * CONTROLADOR MÓDULO EMPLEADO DE SISTEMAS
 * Capa de presentación para el módulo Sistemas
 * ============================================================================
 */

import sistemasService from '../services/sistemasService.js';

class SistemasController {
  async getIncidenciasAsignadas(req, res) {
    try {
      const idUsuarioAutenticado = req.usuario.id_usuario;
      const incidencias = await sistemasService.getIncidenciasAsignadas(idUsuarioAutenticado);
      return res.status(200).json(incidencias);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener incidencias asignadas'
      });
    }
  }

  async finalizarIncidencia(req, res) {
    try {
      const { id } = req.params;
      const { descripcion_resolucion } = req.body;
      const usuarioAutenticado = req.usuario;

      const result = await sistemasService.finalizarIncidencia({
        idIncidencia: id,
        descripcion_resolucion,
        usuarioAutenticado
      });

      return res.status(200).json({
        mensaje: `Incidencia #${id} finalizada exitosamente`,
        incidencia: result.incidencia,
        notificacion_email: result.notificacion_email
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al finalizar la incidencia'
      });
    }
  }
}

export default new SistemasController();
