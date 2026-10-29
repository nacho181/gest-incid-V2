/**
 * ============================================================================
 * CONTROLADOR PANEL DIRECTOR DE SISTEMAS
 * Capa de presentación para el módulo Director
 * ============================================================================
 */

const directorService = require('../services/directorService');

class DirectorController {
  async getDashboardSummary(req, res) {
    try {
      const summary = await directorService.getDashboardSummary();
      return res.status(200).json(summary);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener resumen del dashboard'
      });
    }
  }

  async getEmpleadosSistemas(req, res) {
    try {
      const empleados = await directorService.getEmpleadosSistemas();
      return res.status(200).json(empleados);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener empleados de sistemas'
      });
    }
  }

  async getTodasIncidencias(req, res) {
    try {
      const incidencias = await directorService.getTodasIncidencias();
      return res.status(200).json(incidencias);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener incidencias'
      });
    }
  }

  async asignarIncidencia(req, res) {
    try {
      const { id } = req.params;
      const { id_usuario_sistemas } = req.body;

      const incidenciaAsignada = await directorService.asignarIncidencia(id, id_usuario_sistemas);

      return res.status(200).json({
        mensaje: 'Incidencia asignada correctamente',
        incidencia: incidenciaAsignada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al asignar la incidencia'
      });
    }
  }

  async cancelarIncidenciaDirector(req, res) {
    try {
      const { id } = req.params;
      const incidenciaCancelada = await directorService.cancelarIncidenciaDirector(id);

      return res.status(200).json({
        mensaje: 'Incidencia cancelada exitosamente',
        incidencia: incidenciaCancelada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al cancelar la incidencia'
      });
    }
  }

  async getReportesEstadisticos(req, res) {
    try {
      const reportes = await directorService.getReportesEstadisticos();
      return res.status(200).json(reportes);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al generar reportes estadísticos'
      });
    }
  }
}

module.exports = new DirectorController();
