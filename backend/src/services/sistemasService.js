/**
 * ============================================================================
 * SERVICIO DEL EMPLEADO DE SISTEMAS
 * Lógica de negocio para incidencias asignadas y finalización con notificaciones
 * ============================================================================
 */

const incidenciaRepository = require('../repositories/incidenciaRepository');
const emailService = require('../utils/emailService');
const ROLES = require('../utils/roles');

class SistemasService {
  async getIncidenciasAsignadas(idUsuario) {
    return await incidenciaRepository.findAsignadasATecnico(idUsuario);
  }

  async finalizarIncidencia({ idIncidencia, descripcion_resolucion, usuarioAutenticado }) {
    if (!descripcion_resolucion || typeof descripcion_resolucion !== 'string' || descripcion_resolucion.trim() === '') {
      const error = new Error('Debes proporcionar una descripción detallada de la resolución técnica para finalizar la incidencia.');
      error.statusCode = 400;
      throw error;
    }

    const resolucionLimpia = descripcion_resolucion.trim();
    const id_estado_resuelta = 3;

    const incidencia = await incidenciaRepository.findByIdWithDetails(idIncidencia);

    if (!incidencia) {
      const error = new Error(`La incidencia #${idIncidencia} no existe en el sistema.`);
      error.statusCode = 404;
      throw error;
    }

    if (incidencia.asignado_a !== usuarioAutenticado.id_usuario && usuarioAutenticado.rol !== ROLES.DIRECTOR) {
      const error = new Error('No tienes autorización para finalizar esta incidencia ya que no está asignada a tu cargo.');
      error.statusCode = 403;
      throw error;
    }

    if (incidencia.id_estado === 3) {
      const error = new Error('Esta incidencia ya se encuentra finalizada.');
      error.statusCode = 400;
      throw error;
    }

    if (incidencia.id_estado === 4) {
      const error = new Error('No es posible finalizar una incidencia que ha sido cancelada.');
      error.statusCode = 400;
      throw error;
    }

    const incidenciaActualizada = await incidenciaRepository.updateEstadoAndResolucion(
      idIncidencia,
      id_estado_resuelta,
      resolucionLimpia
    );

    await incidenciaRepository.addHistorialEstado(idIncidencia, id_estado_resuelta);

    const nombreTecnico = `${usuarioAutenticado.nombres} ${usuarioAutenticado.apellidos}`;

    const notificacionEmail = await emailService.notificarIncidenciaFinalizada({
      incidencia: incidenciaActualizada,
      descripcionResolucion: resolucionLimpia,
      tecnicoNombre: nombreTecnico,
      destinatarioEmail: incidencia.creador_email,
      destinatarioNombre: `${incidencia.creador_nombres} ${incidencia.creador_apellidos}`,
      articuloDescripcion: incidencia.articulo_descripcion
    });

    return {
      incidencia: {
        ...incidenciaActualizada,
        estado_descripcion: 'Resuelta'
      },
      notificacion_email: notificacionEmail
    };
  }
}

module.exports = new SistemasService();
