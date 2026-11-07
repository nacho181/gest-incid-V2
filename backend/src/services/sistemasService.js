/**
 * ============================================================================
 * SERVICIO DEL EMPLEADO DE SISTEMAS
 * Lógica de negocio para incidencias asignadas y finalización con notificaciones
 * ============================================================================
 */

import incidenciaRepository from '../repositories/incidenciaRepository.js';
import emailService from '../utils/emailService.js';
import ROLES from '../utils/roles.js';

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
    if (resolucionLimpia.length > 250) {
      const error = new Error('La resolución no puede superar los 250 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const idInc = parseInt(idIncidencia, 10);
    if (isNaN(idInc)) {
      const error = new Error('El ID de la incidencia debe ser un número entero');
      error.statusCode = 400;
      throw error;
    }

    let client;
    let incidenciaActualizada;
    try {
      client = await incidenciaRepository.getClient();
      await client.query('BEGIN');

      const incidencia = await incidenciaRepository.findByIdForUpdate(idInc, client);
      if (!incidencia) {
        const error = new Error(`La incidencia #${idInc} no existe en el sistema.`);
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

      incidenciaActualizada = await incidenciaRepository.finalizar(idInc, resolucionLimpia, client);
      if (!incidenciaActualizada) {
        const error = new Error('La incidencia cambió de estado y ya no puede finalizarse.');
        error.statusCode = 409;
        throw error;
      }

      await incidenciaRepository.addHistorialEstado(idInc, 3, client);
      await client.query('COMMIT');
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client) client.release();
    }

    // Datos para el correo (fuera de la transacción)
    const detalle = await incidenciaRepository.findByIdWithDetails(idInc);
    const nombreTecnico = `${usuarioAutenticado.nombres} ${usuarioAutenticado.apellidos}`;

    const notificacionEmail = await emailService.notificarIncidenciaFinalizada({
      incidencia: incidenciaActualizada,
      descripcionResolucion: resolucionLimpia,
      tecnicoNombre: nombreTecnico,
      destinatarioEmail: detalle.creador_email,
      destinatarioNombre: `${detalle.creador_nombres} ${detalle.creador_apellidos}`,
      articuloDescripcion: detalle.articulo_descripcion
    });

    return {
      incidencia: { ...incidenciaActualizada, estado_descripcion: 'Resuelta' },
      notificacion_email: notificacionEmail
    };
  }
}

export default new SistemasService();
