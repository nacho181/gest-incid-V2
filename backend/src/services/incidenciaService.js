import incidenciaRepository from '../repositories/incidenciaRepository.js';
import empleadoService from './empleadoService.js';
import directorService from './directorService.js';
import sistemasService from './sistemasService.js';
import ROLES from '../utils/roles.js';

function error(mensaje, statusCode) {
  const e = new Error(mensaje);
  e.statusCode = statusCode;
  return e;
}

class IncidenciaService {
  async listar(usuario) {
    switch (usuario.rol) {
      case ROLES.DIRECTOR:
        return await incidenciaRepository.findAll();
      case ROLES.SISTEMAS:
        return await incidenciaRepository.findAsignadasATecnico(usuario.id_usuario);
      default:
        return await incidenciaRepository.findByUsuarioCreador(usuario.id_usuario);
    }
  }

  async crear({ id_articulo, prioridad, descripcion_pedido }, usuario) {
    return await empleadoService.crearIncidencia({
      id_articulo,
      prioridad,
      descripcion_pedido,
      idUsuario: usuario.id_usuario,
      asignado_a: 0 // usuario comodín "Sin Asignar"
    });
  }

  async actualizar(id, cambios, usuario) {
    // Asignar técnico (solo Director)
    if (cambios.asignado_a !== undefined) {
      if (usuario.rol !== ROLES.DIRECTOR) {
        throw error('Solo el Director puede asignar incidencias', 403);
      }
      const incidencia = await directorService.asignarIncidencia(id, cambios.asignado_a);
      return { mensaje: 'Incidencia asignada correctamente', incidencia };
    }

    // Cancelar: el Director cancela cualquiera Pendiente; el resto, solo las propias
    if (cambios.id_estado === 4) {
      const incidencia = usuario.rol === ROLES.DIRECTOR
        ? await directorService.cancelarIncidenciaDirector(id)
        : await empleadoService.cancelarIncidencia(id, usuario.id_usuario);
      return { mensaje: 'Incidencia cancelada correctamente', incidencia };
    }

    // Finalizar (Sistemas o Director)
    if (cambios.id_estado === 3) {
      if (usuario.rol === ROLES.MUNICIPAL) {
        throw error('No posees los permisos necesarios para finalizar incidencias', 403);
      }
      const resultado = await sistemasService.finalizarIncidencia({
        idIncidencia: id,
        descripcion_resolucion: cambios.descripcion_resolucion,
        usuarioAutenticado: usuario
      });
      return {
        mensaje: `Incidencia #${id} finalizada exitosamente`,
        incidencia: resultado.incidencia,
        notificacion_email: resultado.notificacion_email
      };
    }

    throw error('El cambio solicitado no está soportado', 400);
  }
}

export default new IncidenciaService();