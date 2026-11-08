/**
 * ============================================================================
 * SERVICIO DEL DIRECTOR DE SISTEMAS
 * Lógica de negocio para dashboard, asignaciones, cancelación y reportes
 * ============================================================================
 */

import incidenciaRepository from '../repositories/incidenciaRepository.js';
import usuarioRepository from '../repositories/usuarioRepository.js';
import emailService from '../utils/emailService.js';
import pdfGenerator from '../utils/pdfGenerator.js';

class DirectorService {
  async getDashboardSummary() {
    return await incidenciaRepository.getDashboardSummary();
  }

  async getEmpleadosSistemas() {
    return await usuarioRepository.findEmpleadosSistemas();
  }

  async asignarIncidencia(idIncidencia, id_usuario_sistemas) {
    const idInc = parseInt(idIncidencia, 10);
    const idTec = parseInt(id_usuario_sistemas, 10);

    if (isNaN(idInc) || isNaN(idTec) || idTec <= 0) {
      const error = new Error('Debe indicar una incidencia y un técnico válidos');
      error.statusCode = 400;
      throw error;
    }

    return await incidenciaRepository.transaction(async (client) => {
      const incidencia = await incidenciaRepository.findByIdForUpdate(idInc, client);
      if (!incidencia) {
        const error = new Error('Incidencia no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (incidencia.id_estado === 3 || incidencia.id_estado === 4) {
        const error = new Error('No se puede asignar una incidencia finalizada o cancelada');
        error.statusCode = 400;
        throw error;
      }

      const tecnico = await usuarioRepository.findTecnicoActivo(idTec, client);
      if (!tecnico) {
        const error = new Error('El técnico indicado no existe, está inactivo o no pertenece a Sistemas');
        error.statusCode = 400;
        throw error;
      }

      const ID_EN_PROCESO = 2;
      const actualizada = await incidenciaRepository.updateAsignacion(
        idInc, idTec, ID_EN_PROCESO, client
      );

      // Solo registramos historial si el estado realmente cambió
      if (incidencia.id_estado !== ID_EN_PROCESO) {
        await incidenciaRepository.addHistorialEstado(idInc, ID_EN_PROCESO, client);
      }

      return actualizada;
    });
  }

  async cancelarIncidenciaDirector(idIncidencia) {
    const ID_CANCELADA = 4;

    const cancelada = await incidenciaRepository.transaction(async (client) => {
      const incidencia = await incidenciaRepository.findByIdForUpdate(idIncidencia, client);

      if (!incidencia) {
        const error = new Error('Incidencia no encontrada');
        error.statusCode = 404;
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

    try {
      const detalle = await incidenciaRepository.findByIdWithDetails(cancelada.id_incidencia);
      if (detalle) {
        await emailService.notificarIncidenciaCancelada({
          incidencia: cancelada,
          destinatarioEmail: detalle.creador_email,
          destinatarioNombre: `${detalle.creador_nombres} ${detalle.creador_apellidos}`,
          canceladoPorNombre: 'Director de Sistemas',
          articuloDescripcion: detalle.articulo_descripcion
        });
      }
    } catch (mailErr) {
      console.error('[EMAIL ERROR]:', mailErr.message);
    }

    return cancelada;
  }

  async getReportesEstadisticos() {
    return await incidenciaRepository.getReportesEstadisticos();
  }

  async generarReportePdf({ desde, hasta, id_estado, asignado_a }, outputStream) {
    const incidencias = await incidenciaRepository.getReporteIncidencias({
      desde,
      hasta,
      id_estado,
      asignado_a
    });

    let estadoEtiqueta = 'Todos';
    if (id_estado && !isNaN(parseInt(id_estado, 10)) && parseInt(id_estado, 10) > 0) {
      const idEst = parseInt(id_estado, 10);
      const estMap = { 1: 'Pendiente', 2: 'En Proceso', 3: 'Resuelta', 4: 'Cancelada' };
      estadoEtiqueta = estMap[idEst] || `Estado #${idEst}`;
    }

    let tecnicoEtiqueta = 'Todos';
    if (asignado_a !== undefined && asignado_a !== null && String(asignado_a).trim() !== '') {
      const idTec = parseInt(asignado_a, 10);
      if (idTec === 0) {
        tecnicoEtiqueta = 'Sin Asignar';
      } else if (!isNaN(idTec)) {
        const tec = await usuarioRepository.findTecnicoActivo(idTec);
        tecnicoEtiqueta = tec ? `${tec.nombres} ${tec.apellidos}` : `Técnico #${idTec}`;
      }
    }

    pdfGenerator.crearReporteIncidenciasPdf({
      incidencias,
      filtros: {
        desde: desde || null,
        hasta: hasta || null,
        estado: estadoEtiqueta,
        tecnico: tecnicoEtiqueta
      }
    }, outputStream);
  }
}

export default new DirectorService();
