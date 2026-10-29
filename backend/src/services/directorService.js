/**
 * ============================================================================
 * SERVICIO DEL DIRECTOR DE SISTEMAS
 * Lógica de negocio para dashboard, asignaciones, cancelación y reportes
 * ============================================================================
 */

const incidenciaRepository = require('../repositories/incidenciaRepository');
const usuarioRepository = require('../repositories/usuarioRepository');
const emailService = require('../utils/emailService');
const db = require('../config/db');

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
    if (!id_usuario_sistemas) {
      const error = new Error('Debe especificar el id_usuario_sistemas al cual asignar la incidencia');
      error.statusCode = 400;
      throw error;
    }

    const incidencia = await incidenciaRepository.updateAsignado(idIncidencia, id_usuario_sistemas);

    if (!incidencia) {
      const error = new Error('Incidencia no encontrada');
      error.statusCode = 404;
      throw error;
    }

    return incidencia;
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

module.exports = new DirectorService();
