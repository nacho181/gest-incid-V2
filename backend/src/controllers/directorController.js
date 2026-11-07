/**
 * ============================================================================
 * CONTROLADOR PANEL DIRECTOR DE SISTEMAS
 * Capa de presentación para el módulo Director
 * ============================================================================
 */

import directorService from '../services/directorService.js';
import { wrapController } from '../utils/asyncHandler.js';

class DirectorController {
  async getDashboardSummary(req, res)     { res.status(200).json(await directorService.getDashboardSummary()); }
  async getEmpleadosSistemas(req, res)    { res.status(200).json(await directorService.getEmpleadosSistemas()); }
  async getTodasIncidencias(req, res)     { res.status(200).json(await directorService.getTodasIncidencias()); }
  async getReportesEstadisticos(req, res) { res.status(200).json(await directorService.getReportesEstadisticos()); }
  async asignarIncidencia(req, res) {
    const incidencia = await directorService.asignarIncidencia(req.params.id, req.body.id_usuario_sistemas);
    res.status(200).json({ mensaje: 'Incidencia asignada correctamente', incidencia });
  }
  async cancelarIncidenciaDirector(req, res) {
    const incidencia = await directorService.cancelarIncidenciaDirector(req.params.id);
    res.status(200).json({ mensaje: 'Incidencia cancelada exitosamente', incidencia });
  }
}

export default wrapController(new DirectorController());