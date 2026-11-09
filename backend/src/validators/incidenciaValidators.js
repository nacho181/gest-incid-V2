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

export const validarActualizarIncidencia = [
  idParam,
  // Debe venir exactamente uno de los dos: id_estado o asignado_a
  body('id_estado').custom((_, { req }) => {
    const tieneEstado = req.body.id_estado !== undefined;
    const tieneAsignado = req.body.asignado_a !== undefined;
    if (tieneEstado === tieneAsignado) {
      throw new Error('Indicá id_estado (2, 3 o 4) o asignado_a, pero no ambos ni ninguno');
    }
    return true;
  }),
  body('id_estado')
    .optional()
    .isIn([2, 3, 4]).withMessage('id_estado solo puede ser 2 (en proceso), 3 (finalizada) o 4 (cancelada)')
    .toInt(),
  body('asignado_a')
    .optional()
    .isInt({ min: 1 }).withMessage('asignado_a debe ser un número entero positivo')
    .toInt(),
  body('descripcion_resolucion')
    .if((_, { req }) => Number(req.body.id_estado) === 3)
    .trim()
    .notEmpty().withMessage('Debes proporcionar la descripción de la resolución técnica')
    .isLength({ max: 250 }).withMessage('La resolución no puede superar los 250 caracteres'),
  validarCampos
];

export const validarIniciarAtencion = [
  idParam,
  validarCampos
];

export const validarFinalizarIncidencia = [
  idParam,
  body('descripcion_resolucion')
    .trim()
    .notEmpty().withMessage('Debes proporcionar la descripción de la resolución técnica')
    .isLength({ max: 250 }).withMessage('La resolución no puede superar los 250 caracteres'),
  validarCampos
];
