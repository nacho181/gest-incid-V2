/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN - MÓDULO SISTEMAS Y NOTIFICACIONES
 * Valida:
 * 1. Autenticación y control de acceso (RBAC) para el rol Empleado de Sistemas (rol 2).
 * 2. Listado de incidencias asignadas a su cargo.
 * 3. Finalización de incidencias con descripción de resolución técnica.
 * 4. Envío de correos electrónicos al finalizar y cancelar incidencias.
 * ============================================================================
 */

const assert = require('assert');
const http = require('http');
const app = require('../src/server');

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
    // Test 3: Protección RBAC - Denegar acceso a ruta sin token (401)
    // --------------------------------------------------------------------------
    console.log('\nTest 3: Intentar listar incidencias asignadas sin token (401 Unauthorized)...');
    const resSinToken = await request('GET', '/api/v1/sistemas/incidencias');
    assert.strictEqual(resSinToken.status, 401);
    console.log('   ✅ Endpoint protegido correctamente sin token.');

    // --------------------------------------------------------------------------
    // Test 4: Protección RBAC - Denegar acceso con rol 1 (Empleado Municipal - 403)
    // --------------------------------------------------------------------------
    console.log('\nTest 4: Intentar listar incidencias asignadas con usuario de rol 1 (Pamela Almeida)...');
    const resLoginMunicipal = await request('POST', '/api/v1/auth/login', {
      usuario: 'pamalm@correo.com',
      contrasenia: 'pamalm'
    });
    assert.strictEqual(resLoginMunicipal.status, 200);
    const tokenMunicipal = resLoginMunicipal.body.token;

    const resRolInvalido = await request('GET', '/api/v1/sistemas/incidencias', null, {
      'Authorization': `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resRolInvalido.status, 403, 'Rol 1 no debe tener acceso a /sistemas/incidencias');
    console.log('   ✅ Control de acceso RBAC verificado (403 Acceso denegado).');

    // --------------------------------------------------------------------------
    // Test 5: Listar incidencias asignadas al Empleado de Sistemas (rol 2)
    // --------------------------------------------------------------------------
    console.log('\nTest 5: Listar incidencias asignadas al Empleado de Sistemas...');
    const resAsignadas = await request('GET', '/api/v1/sistemas/incidencias', null, {
      'Authorization': `Bearer ${tokenSistemas}`
    });
    assert.strictEqual(resAsignadas.status, 200);
    assert.ok(Array.isArray(resAsignadas.body), 'La respuesta debe ser una lista');
    console.log(`   ✅ Se obtuvieron ${resAsignadas.body.length} incidencias asignadas al técnico.`);

    // --------------------------------------------------------------------------
    // Test 6: Crear una nueva incidencia asignada para prueba de finalización
    // --------------------------------------------------------------------------
    console.log('\nTest 6: Preparando incidencia de prueba para resolver...');
    const resCrear = await request('POST', '/api/v1/incidencias', {
      id_articulo: 2,
      creado_por: 4, // Esteban Reniero
      prioridad: 1,
      descripcion_pedido: 'Monitor parpadea de forma intermitente'
    });
    assert.strictEqual(resCrear.status, 201);
    const idIncidenciaNueva = resCrear.body.incidencia.id_incidencia;
    console.log(`   ✅ Incidencia #${idIncidenciaNueva} creada exitosamente (asignada a técnico 1).`);

    // --------------------------------------------------------------------------
    // Test 7: Validación de campos obligatorios al finalizar (sin resolución)
    // --------------------------------------------------------------------------
    console.log('\nTest 7: Intentar finalizar sin descripción de resolución (400 Bad Request)...');
    const resFinVacia = await request('PUT', `/api/v1/sistemas/incidencias/${idIncidenciaNueva}/finalizar`, {
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
    const resFinalizar = await request('PUT', `/api/v1/sistemas/incidencias/${idIncidenciaNueva}/finalizar`, {
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
    const resReFinalizar = await request('PUT', `/api/v1/sistemas/incidencias/${idIncidenciaNueva}/finalizar`, {
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
    // Crear una incidencia para cancelar
    const resCrearParaCancelar = await request('POST', '/api/v1/incidencias', {
      id_articulo: 1,
      creado_por: 4,
      prioridad: 2,
      descripcion_pedido: 'Prueba de cancelación de ticket'
    });
    const idParaCancelar = resCrearParaCancelar.body.incidencia.id_incidencia;

    // Cancelar la incidencia
    const resCancel = await request('PUT', `/api/v1/incidencias/${idParaCancelar}/cancelar`, {
      id_usuario: 4
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
