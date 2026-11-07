import express from 'express';
import { query } from 'express-validator';
import directorController from '../controllers/directorController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import { validarCampos } from '../middlewares/validar.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

// GET /usuarios?rol=2  -> técnicos del área de Sistemas (solo Director)
router.get(
  '/',
  verificarToken,
  autorizarRol(ROLES.DIRECTOR),
  [
    query('rol').isIn(['2']).withMessage('Por ahora solo se admite el filtro rol=2 (técnicos de Sistemas)'),
    validarCampos
  ],
  directorController.getEmpleadosSistemas
);

export default router;