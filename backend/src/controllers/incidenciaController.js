import incidenciaService from '../services/incidenciaService.js';
import { wrapController } from '../utils/asyncHandler.js';

class IncidenciaController {
  async listar(req, res) {
    res.status(200).json(await incidenciaService.listar(req.usuario));
  }

  async crear(req, res) {
    const incidencia = await incidenciaService.crear(req.body, req.usuario);
    res.status(201).json({ mensaje: 'Incidencia creada correctamente', incidencia });
  }

  async actualizar(req, res) {
    const resultado = await incidenciaService.actualizar(req.params.id, req.body, req.usuario);
    res.status(200).json(resultado);
  }
}

export default wrapController(new IncidenciaController());