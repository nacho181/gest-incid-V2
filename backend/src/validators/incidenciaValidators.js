import { body, param } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';

const idParam = param('id')
  .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo')
  .toInt();

export const validarId = [idParam, validarCampos];

export const validarCrearIncidencia = [
  body('id_articulo')
    .isInt({ min: 1 }).withMessage('id_articulo debe ser un número entero positivo')
    .toInt(),
  body('prioridad')
    .optional()
    .isInt({ min: 1, max: 3 }).withMessage('La prioridad debe ser 1 (alta), 2 (media) o 3 (baja)')
    .toInt(),
  body('descripcion_pedido')
    .trim()
    .notEmpty().withMessage('La descripción del pedido es obligatoria')
    .isLength({ max: 250 }).withMessage('La descripción del pedido no puede superar los 250 caracteres'),
  validarCampos
];

export const validarAsignar = [
  idParam,
  body('id_usuario_sistemas')
    .isInt({ min: 1 }).withMessage('id_usuario_sistemas debe ser un número entero positivo')
    .toInt(),
  validarCampos
];

export const validarFinalizar = [
  idParam,
  body('descripcion_resolucion')
    .trim()
    .notEmpty().withMessage('Debes proporcionar la descripción de la resolución técnica')
    .isLength({ max: 250 }).withMessage('La resolución no puede superar los 250 caracteres'),
  validarCampos
];