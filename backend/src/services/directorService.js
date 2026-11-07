/**
 * ============================================================================
 * SERVICIO DEL DIRECTOR DE SISTEMAS
 * Lógica de negocio para dashboard, asignaciones, cancelación y reportes
 * ============================================================================
 */

import incidenciaRepository from '../repositories/incidenciaRepository.js';
import usuarioRepository from '../repositories/usuarioRepository.js';
import emailService from '../utils/emailService.js';
import db from '../config/db.js';

class DirectorService {
  async getDashboardSummary() {
    return await incidenciaRepository.getDashboardSummary();
  }

  async getEmpleadosSistemas() {
    return await usuarioRepository.findEmpleadosSistemas();
  }

  async getTodasIncidencias() {
    return await incidenciaRepository.findAll();
  }

  async asignarIncidencia(idIncidencia, id_usuario_sistemas) {
    const idInc = parseInt(idIncidencia, 10);
    const idTec = parseInt(id_usuario_sistemas, 10);

    if (isNaN(idInc) || isNaN(idTec) || idTec <= 0) {
      const error = new Error('Debe indicar una incidencia y un técnico válidos');
      error.statusCode = 400;
      throw error;
    }

    let client;
    try {
      client = await incidenciaRepository.getClient();
      await client.query('BEGIN');

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

      await client.query('COMMIT');
      return actualizada;
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async cancelarIncidenciaDirector(idIncidencia) {
    const id_estado_cancelada = 4;
    let client;

    try {
      client = await incidenciaRepository.getClient();
      await client.query('BEGIN');

      const checkResult = await client.query('SELECT * FROM public.incidencias WHERE id_incidencia = $1 FOR UPDATE', [idIncidencia]);

      if (checkResult.rows.length === 0) {
        const error = new Error('Incidencia no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (checkResult.rows[0].id_estado !== 1) {
        const error = new Error('Solo se pueden cancelar incidencias Pendientes');
        error.statusCode = 400;
        throw error;
      }

      const updateResult = await incidenciaRepository.updateEstado(idIncidencia, id_estado_cancelada, client);
      await incidenciaRepository.addHistorialEstado(idIncidencia, id_estado_cancelada, client);

      await client.query('COMMIT');

      // Enviar email
      try {
        const uRes = await db.query(
          `SELECT u.nombres, u.apellidos, u.usuario AS email, art.descripcion AS articulo_desc
           FROM public.usuarios u
           JOIN public.incidencias inc ON inc.creado_por = u.id_usuario
           JOIN public.articulos art ON inc.id_articulo = art.id_articulo
           WHERE inc.id_incidencia = $1`,
          [idIncidencia]
        );
        if (uRes.rows.length > 0) {
          const u = uRes.rows[0];
          await emailService.notificarIncidenciaCancelada({
            incidencia: updateResult,
            destinatarioEmail: u.email,
            destinatarioNombre: `${u.nombres} ${u.apellidos}`,
            canceladoPorNombre: 'Director de Sistemas',
            articuloDescripcion: u.articulo_desc
          });
        }
      } catch (mailErr) {
        console.error('[EMAIL ERROR]:', mailErr.message);
      }

      return updateResult;

    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async getReportesEstadisticos() {
    return await incidenciaRepository.getReportesEstadisticos();
  }
}

export default new DirectorService();
