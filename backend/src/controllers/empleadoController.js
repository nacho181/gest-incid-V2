/**
 * ============================================================================
 * CONTROLADOR DE EMPLEADOS
 * Capa de presentación para el módulo de Empleados
 * ============================================================================
 */

import empleadoService from '../services/empleadoService.js';
import { wrapController } from '../utils/asyncHandler.js';

class EmpleadoController {
  async getEmpleados(req, res) {
    res.status(200).json(await empleadoService.getEmpleados());
  }

  async getArticulos(req, res) {
    res.status(200).json(await empleadoService.getArticulos());
  }

  async crearIncidencia(req, res) {
    const { id_articulo, prioridad, descripcion_pedido } = req.body;
    const incidencia = await empleadoService.crearIncidencia({
      id_articulo,
      prioridad,
      descripcion_pedido,
      idUsuario: req.usuario.id_usuario,
      asignado_a: 0 // usuario comodín "Sin Asignar"
    });
    res.status(201).json({ mensaje: 'Incidencia creada correctamente', incidencia });
  }

  async getMisIncidencias(req, res) {
    res.status(200).json(await empleadoService.getMisIncidencias(req.usuario.id_usuario));
  }

  async cancelarIncidencia(req, res) {
    const incidencia = await empleadoService.cancelarIncidencia(req.params.id, req.usuario.id_usuario);
    res.status(200).json({ mensaje: 'Incidencia cancelada correctamente', incidencia });
  }
}

export default wrapController(new EmpleadoController());
