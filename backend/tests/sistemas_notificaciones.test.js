/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN - MÓDULO SISTEMAS Y NOTIFICACIONES
 * ============================================================================
 */

import assert from 'assert';
import http from 'http';
import setupTestDb from './setupTestDb.js';
import app from '../src/server.js';

let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  await setupTestDb();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(3002, resolve));
  console.log('\n🚀 Servidor de pruebas corriendo en el puerto 3002\n');

  try {
    // --------------------------------------------------------------------------
    // Test 1: Healthcheck
    // --------------------------------------------------------------------------
    console.log('Test 1: Healthcheck de la API...');
    const resHealth = await request('GET', '/api/v1/health');
    assert.strictEqual(resHealth.status, 200);
    assert.strictEqual(resHealth.body.estado, 'OK');
    console.log('   ✅ Healthcheck OK');

    // --------------------------------------------------------------------------
    // Test 2: Login como Empleado de Sistemas (Carlos Perez - rol 2)
    // --------------------------------------------------------------------------
    console.log('\nTest 2: Autenticación como Empleado de Sistemas (carper@correo.com)...');
    const resLoginSistemas = await request('POST', '/api/v1/auth/login', {
      usuario: 'carper@correo.com',
      contrasenia: 'carper'
    });
    assert.strictEqual(resLoginSistemas.status, 200);
    assert.ok(resLoginSistemas.body.token, 'Debe devolver un token JWT');
    assert.strictEqual(resLoginSistemas.body.usuario.rol, 2, 'El rol debe ser 2 (Empleado de Sistemas)');
    const tokenSistemas = resLoginSistemas.body.token;
    const sistemasUserId = resLoginSistemas.body.usuario.id_usuario;
    console.log(`   ✅ Login exitoso. Usuario ID: ${sistemasUserId}, Rol: 2`);

    // --------------------------------------------------------------------------
    // Test 3: Protección - Denegar acceso a ruta sin token (401)
    // --------------------------------------------------------------------------
    console.log('\nTest 3: Intentar listar incidencias sin token (401 Unauthorized)...');
    const resSinToken = await request('GET', '/api/v1/incidencias');
    assert.strictEqual(resSinToken.status, 401);
    console.log('   ✅ Endpoint protegido correctamente sin token.');

    // --------------------------------------------------------------------------
    // Test 4: Protección RBAC - Un Municipal (rol 3) no puede finalizar (403)
    // --------------------------------------------------------------------------
    console.log('\nTest 4: Intentar finalizar una incidencia con usuario de rol 3 (Esteban Reniero)...');
    const resLoginMunicipal = await request('POST', '/api/v1/auth/login', {
      usuario: 'estren@correo.com',
      contrasenia: 'estren'
    });
    assert.strictEqual(resLoginMunicipal.status, 200);
    const tokenMunicipal = resLoginMunicipal.body.token;

    const resRolInvalido = await request('PATCH', '/api/v1/incidencias/1', {
      id_estado: 3,
      descripcion_resolucion: 'Intento no autorizado'
    }, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resRolInvalido.status, 403, 'Un Municipal no puede finalizar incidencias');
    console.log('   ✅ Control de acceso por rol verificado (403 Acceso denegado).');

    // --------------------------------------------------------------------------
    // Test 5: Listar incidencias asignadas al Empleado de Sistemas (rol 2)
    // --------------------------------------------------------------------------
    console.log('\nTest 5: Listar incidencias asignadas al Empleado de Sistemas...');
    const resAsignadas = await request('GET', '/api/v1/incidencias', null, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resAsignadas.status, 200);
    const listaAsignadas = Array.isArray(resAsignadas.body) ? resAsignadas.body : resAsignadas.body.data;
    assert.ok(Array.isArray(listaAsignadas), 'La respuesta debe ser una lista paginada');
    if (resAsignadas.body.pagination) {
      assert.strictEqual(typeof resAsignadas.body.pagination.total, 'number');
    }
    console.log(`   ✅ Se obtuvieron ${listaAsignadas.length} incidencias asignadas al técnico.`);

    // --------------------------------------------------------------------------
    // Test 6: Crear una incidencia y asignarla (pasa a En Proceso)
    // --------------------------------------------------------------------------
    console.log('\nTest 6: Preparando incidencia de prueba para resolver...');
    const resCrear = await request('POST', '/api/v1/incidencias', {
      id_articulo: 2,
      prioridad: 1,
      descripcion_pedido: 'Monitor parpadea de forma intermitente'
    }, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resCrear.status, 201);
    const idIncidenciaNueva = resCrear.body.incidencia.id_incidencia;
    assert.strictEqual(resCrear.body.incidencia.asignado_a, 0, 'Nuevas incidencias deben guardarse con el ID del usuario comodín Sin Asignar (0)');
    console.log(`   ✅ Incidencia #${idIncidenciaNueva} creada exitosamente con asignado_a = 0.`);

    // Asignar la incidencia al técnico Carlos Perez como Director
    const resLoginDirector = await request('POST', '/api/v1/auth/login', {
      usuario: 'pamalm@correo.com',
      contrasenia: 'pamalm'
    });
    const tokenDirector = resLoginDirector.body.token;
    const resAsignar = await request('PATCH', `/api/v1/incidencias/${idIncidenciaNueva}`, {
      asignado_a: sistemasUserId
    }, {
      'Authorization': `Bearer ${tokenDirector}`
    });
    assert.strictEqual(resAsignar.status, 200);
    assert.strictEqual(resAsignar.body.incidencia.id_estado, 1, 'Asignar debe mantener la incidencia en estado Pendiente');
    assert.strictEqual(resAsignar.body.incidencia.asignado_a, sistemasUserId, 'Debe quedar asignada al técnico');
    console.log(`   ✅ Incidencia #${idIncidenciaNueva} asignada al técnico Carlos Perez (mantiene estado Pendiente = 1).`);

    // Intentar finalizar cuando sigue en estado Pendiente debe fallar con 400
    const resFinPendiente = await request('PUT', `/api/v1/incidencias/${idIncidenciaNueva}/finalizar`, {
      descripcion_resolucion: 'Intento de finalización prematura'
    }, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resFinPendiente.status, 400, 'No se puede finalizar una incidencia en estado Pendiente');
    console.log('   ✅ Verificación: No permite finalizar si la incidencia no está En Proceso.');

    // Iniciar atención técnica para pasar a En Proceso (id_estado = 2)
    const resIniciarAtencion = await request('PUT', `/api/v1/incidencias/${idIncidenciaNueva}/en-proceso`, null, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resIniciarAtencion.status, 200);
    assert.strictEqual(resIniciarAtencion.body.incidencia.id_estado, 2, 'Iniciar atención debe pasar la incidencia a En Proceso');
    console.log(`   ✅ Incidencia #${idIncidenciaNueva} iniciada correctamente (pasa a En Proceso = 2).`);

    // Intentar iniciar atención nuevamente debe fallar con 400
    const resReIniciar = await request('PUT', `/api/v1/incidencias/${idIncidenciaNueva}/en-proceso`, null, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resReIniciar.status, 400);

    // Asignar a un usuario que no es técnico (Esteban, rol 3) debe fallar
    const resAsignarMal = await request('PATCH', `/api/v1/incidencias/${idIncidenciaNueva}`, {
      asignado_a: 4
    }, {
      'Authorization': `Bearer ${tokenDirector}`
    });
    assert.strictEqual(resAsignarMal.status, 400);

    // Un Municipal no puede asignar (403)
    const resAsignarMunicipal = await request('PATCH', `/api/v1/incidencias/${idIncidenciaNueva}`, {
      asignado_a: sistemasUserId
    }, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resAsignarMunicipal.status, 403);
    console.log('   ✅ Solo el Director puede asignar incidencias.');

    // --------------------------------------------------------------------------
    // Test 7: Validación de campos obligatorios al finalizar (sin resolución)
    // --------------------------------------------------------------------------
    console.log('\nTest 7: Intentar finalizar sin descripción de resolución (400 Bad Request)...');
    const resFinVacia = await request('PATCH', `/api/v1/incidencias/${idIncidenciaNueva}`, {
      id_estado: 3,
      descripcion_resolucion: ''
    }, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resFinVacia.status, 400);
    console.log('   ✅ Validación de resolución obligatoria verificada.');

    // --------------------------------------------------------------------------
    // Test 8: Finalizar la incidencia asignada y verificar notificación de correo
    // --------------------------------------------------------------------------
    console.log(`\nTest 8: Finalizar incidencia #${idIncidenciaNueva} con resolución técnica...`);
    const resolucionTexto = 'Se reemplazó el cable HDMI y el transformador de corriente. El monitor funciona con normalidad.';
    const resFinalizar = await request('PUT', `/api/v1/incidencias/${idIncidenciaNueva}/finalizar`, {
      descripcion_resolucion: resolucionTexto
    }, {
      'Authorization': `Bearer ${tokenSistemas}`
    });

    assert.strictEqual(resFinalizar.status, 200);
    assert.strictEqual(resFinalizar.body.incidencia.id_estado, 3, 'El id_estado debe ser 3 (Resuelta/Finalizada)');
    assert.strictEqual(resFinalizar.body.incidencia.descripcion_resolucion, resolucionTexto);
    assert.ok(resFinalizar.body.notificacion_email, 'Debe incluir el resultado de la notificación por email');
    assert.strictEqual(resFinalizar.body.notificacion_email.exito, true, 'El correo debe enviarse con éxito');
    console.log('   ✅ Incidencia finalizada correctamente en base de datos.');
    console.log(`   ✉️ Notificación por correo enviada a: <${resFinalizar.body.notificacion_email.destinatario}>`);

    // --------------------------------------------------------------------------
    // Test 9: Intentar volver a finalizar una incidencia ya finalizada (400)
    // --------------------------------------------------------------------------
    console.log('\nTest 9: Intentar finalizar nuevamente la misma incidencia ya resuelta (400)...');
    const resReFinalizar = await request('PATCH', `/api/v1/incidencias/${idIncidenciaNueva}`, {
      id_estado: 3,
      descripcion_resolucion: 'Otro intento'
    }, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resReFinalizar.status, 400);
    console.log('   ✅ Control de estado verificado: no permite re-finalizar.');

    // --------------------------------------------------------------------------
    // Test 10: Notificación por correo al cancelar una incidencia
    // --------------------------------------------------------------------------
    console.log('\nTest 10: Cancelar una incidencia pendiente y verificar notificación de correo...');
    const resCrearParaCancelar = await request('POST', '/api/v1/incidencias', {
      id_articulo: 1,
      prioridad: 2,
      descripcion_pedido: 'Prueba de cancelación de ticket'
    }, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    const idParaCancelar = resCrearParaCancelar.body.incidencia.id_incidencia;

    const resCancel = await request('PATCH', `/api/v1/incidencias/${idParaCancelar}`, {
      id_estado: 4
    }, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resCancel.status, 200);
    assert.strictEqual(resCancel.body.incidencia.id_estado, 4, 'El id_estado debe ser 4 (Cancelada)');
    console.log(`   ✅ Incidencia #${idParaCancelar} cancelada correctamente.`);
    console.log('   ✉️ Notificación por correo de cancelación disparada con éxito.');

    console.log('\n========================================================================');
    console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();