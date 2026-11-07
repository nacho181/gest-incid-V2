export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Envuelve todos los métodos de una instancia de controlador
export function wrapController(ctrl) {
  const proto = Object.getPrototypeOf(ctrl);
  return Object.fromEntries(
    Object.getOwnPropertyNames(proto)
      .filter((n) => n !== 'constructor' && typeof proto[n] === 'function')
      .map((n) => [n, asyncHandler(proto[n].bind(ctrl))])
  );
}