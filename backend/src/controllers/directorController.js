/**
 * ============================================================================
 * CONTROLADOR PANEL DIRECTOR DE SISTEMAS
 * Capa de presentación para el módulo Director
 * ============================================================================
 */

import directorService from '../services/directorService.js';
import { wrapController } from '../utils/asyncHandler.js';

class DirectorController {
  async getDashboardSummary(req, res)  { res.status(200).json(await directorService.getDashboardSummary()); }
  async getEmpleadosSistemas(req, res) { res.status(200).json(await directorService.getEmpleadosSistemas()); }
  async generarReportePdf(req, res) {
    const { desde, hasta, id_estado, asignado_a } = req.query;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_incidencias.pdf"');
    await directorService.generarReportePdf({ desde, hasta, id_estado, asignado_a }, res);
  }
}

export default wrapController(new DirectorController());