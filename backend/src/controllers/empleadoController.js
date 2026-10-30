/**
 * ============================================================================
 * CONTROLADOR DE EMPLEADOS
 * Capa de presentación para el módulo de Empleados
 * ============================================================================
 */

import empleadoService from '../services/empleadoService.js';

class EmpleadoController {
  async getEmpleados(req, res) {
    try {
      const empleados = await empleadoService.getEmpleados();
      return res.status(200).json(empleados);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener empleados'
      });
    }
  }

  async getArticulos(req, res) {
    try {
      const articulos = await empleadoService.getArticulos();
      return res.status(200).json(articulos);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener artículos'
      });
    }
  }

  async crearIncidencia(req, res) {
    try {
      const { id_articulo, prioridad, descripcion_pedido } = req.body;
      const idUsuario = req.usuario.id_usuario;
      // Por requerimiento de negocio, todo nuevo ticket debe iniciar sin responsable asignado (NULL)
      const asignado_a = null;

      const nuevaIncidencia = await empleadoService.crearIncidencia({
        id_articulo,
        prioridad,
        descripcion_pedido,
        idUsuario,
        asignado_a
      });

      return res.status(201).json({
        mensaje: 'Incidencia creada correctamente',
        incidencia: nuevaIncidencia
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al crear la incidencia'
      });
    }
  }

  async getMisIncidencias(req, res) {
    try {
      const idUsuario = req.usuario.id_usuario;
      const incidencias = await empleadoService.getMisIncidencias(idUsuario);
      return res.status(200).json(incidencias);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al obtener las incidencias'
      });
    }
  }

  async cancelarIncidencia(req, res) {
    try {
      const { id } = req.params;
      const idUsuario = req.usuario.id_usuario;

      const incidenciaCancelada = await empleadoService.cancelarIncidencia(id, idUsuario);

      return res.status(200).json({
        mensaje: 'Incidencia cancelada correctamente',
        incidencia: incidenciaCancelada
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: true,
        mensaje: error.message || 'Error al cancelar la incidencia'
      });
    }
  }
}

export default new EmpleadoController();
