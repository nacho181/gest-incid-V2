/**
 * ============================================================================
 * SERVICIO DE EMPLEADOS MUNICIPALES
 * Lógica de negocio para consulta de empleados, artículos e incidencias
 * ============================================================================
 */

import articuloRepository from '../repositories/articuloRepository.js';
import incidenciaRepository from '../repositories/incidenciaRepository.js';
import emailService from '../utils/emailService.js';

class EmpleadoService {
  async crearIncidencia({ id_articulo, prioridad, descripcion_pedido, idUsuario, asignado_a = 0 }) {
    if (!id_articulo || !descripcion_pedido) {
      const error = new Error('Faltan campos obligatorios: id_articulo y descripcion_pedido');
      error.statusCode = 400;
      throw error;
    }

    const ID_PENDIENTE = 1;

    return await incidenciaRepository.transaction(async (client) => {
      if (!(await articuloRepository.existeActivo(id_articulo, client))) {
        const error = new Error('El artículo no existe o está inactivo');
        error.statusCode = 400;
        throw error;
      }

      const nueva = await incidenciaRepository.create({
        id_articulo,
        id_estado: ID_PENDIENTE,
        creado_por: idUsuario,
        asignado_a: asignado_a ?? 0,
        prioridad: prioridad || 1,
        descripcion_pedido
      }, client);

      await incidenciaRepository.addHistorialEstado(nueva.id_incidencia, ID_PENDIENTE, client);
      return nueva;
    });
  }

  async cancelarIncidencia(idIncidencia, idUsuario) {
    const ID_CANCELADA = 4;

    const cancelada = await incidenciaRepository.transaction(async (client) => {
      const incidencia = await incidenciaRepository.findByIdForUpdate(idIncidencia, client);

      if (!incidencia) {
        const error = new Error('Incidencia no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (incidencia.creado_por !== idUsuario) {
        const error = new Error('No tiene permiso para cancelar esta incidencia');
        error.statusCode = 403;
        throw error;
      }

      if (incidencia.id_estado !== 1) {
        const error = new Error('Solo se pueden cancelar incidencias Pendientes');
        error.statusCode = 400;
        throw error;
      }

      const actualizada = await incidenciaRepository.updateEstado(idIncidencia, ID_CANCELADA, client);
      await incidenciaRepository.addHistorialEstado(idIncidencia, ID_CANCELADA, client);
      return actualizada;
    });

    // Notificación fuera de la transacción: si el mail falla, la cancelación igual queda hecha
    try {
      const detalle = await incidenciaRepository.findByIdWithDetails(cancelada.id_incidencia);
      if (detalle) {
        const nombre = `${detalle.creador_nombres} ${detalle.creador_apellidos}`;
        await emailService.notificarIncidenciaCancelada({
          incidencia: cancelada,
          destinatarioEmail: detalle.creador_email,
          destinatarioNombre: nombre,
          canceladoPorNombre: `${nombre} (Solicitante)`,
          articuloDescripcion: detalle.articulo_descripcion
        });
      }
    } catch (mailErr) {
      console.error('[EMAIL ERROR]:', mailErr.message);
    }

    return cancelada;
  }
}

export default new EmpleadoService();
