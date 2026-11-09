import incidenciaService from '../services/incidenciaService.js';
import { wrapController } from '../utils/asyncHandler.js';

class IncidenciaController {
  async listar(req, res) {
    res.status(200).json(await incidenciaService.listar(req.usuario, req.query));
  }

  async listarMisIncidencias(req, res) {
    const query = { ...req.query, creado_por: req.usuario.id_usuario };
    res.status(200).json(await incidenciaService.listar(req.usuario, query));
  }

  async listarAsignadas(req, res) {
    res.status(200).json(await incidenciaService.listar(req.usuario, req.query));
  }

  async crear(req, res) {
    const incidencia = await incidenciaService.crear(req.body, req.usuario);
    res.status(201).json({ mensaje: 'Incidencia creada correctamente', incidencia });
  }

  async actualizar(req, res) {
    const resultado = await incidenciaService.actualizar(req.params.id, req.body, req.usuario);
    res.status(200).json(resultado);
  }

  async iniciarAtencion(req, res) {
    const incidencia = await incidenciaService.iniciarAtencion(req.params.id, req.usuario);
    res.status(200).json({ mensaje: `Incidencia #${req.params.id} iniciada y en proceso de atención`, incidencia });
  }

  async finalizar(req, res) {
    const resultado = await incidenciaService.finalizar(req.params.id, req.body, req.usuario);
    res.status(200).json({ mensaje: `Incidencia #${req.params.id} finalizada exitosamente`, ...resultado });
  }
}

export default wrapController(new IncidenciaController());