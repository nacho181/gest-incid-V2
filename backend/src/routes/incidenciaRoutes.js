import express from 'express';
import incidenciaController from '../controllers/incidenciaController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import { validarCrearIncidencia, validarActualizarIncidencia } from '../validators/incidenciaValidators.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

const verificarEmpleado = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS, ROLES.MUNICIPAL)];
const verificarSoloMunicipal = [verificarToken, autorizarRol(ROLES.MUNICIPAL)];

router.get('/', verificarEmpleado, incidenciaController.listar);
router.post('/', verificarSoloMunicipal, validarCrearIncidencia, incidenciaController.crear);
router.patch('/:id', verificarEmpleado, validarActualizarIncidencia, incidenciaController.actualizar);

export default router;