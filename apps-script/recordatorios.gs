const FIRESTORE_PROJECT_ID = "app-congregacion";
const FIRESTORE_COLLECTION = "tareas";
const TZ_RECORDATORIOS = "America/Bogota";
const PAGINA_TAREAS = "tareas.html";
const MAX_CORREOS_POR_EJECUCION = 5;
const MAX_CORREOS_POR_DIA = 20;
const CLAVE_CUOTA_CORREO = "digitCongCorreosEnviados";
var iconoEmailCache;

/** Revisa los recordatorios vencidos y envía un correo a cada destinatario. */
function procesarRecordatoriosCorreo() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    if (!estanActivadosRecordatoriosCorreo()) {
      console.log("Envío pausado desde la configuración de DigitCong.");
      return;
    }

    const enviadosHoy = obtenerCorreosEnviadosHoy();
    const cuotaGoogle = MailApp.getRemainingDailyQuota();
    const limiteEjecucion = Math.max(0, Math.min(MAX_CORREOS_POR_EJECUCION, MAX_CORREOS_POR_DIA - enviadosHoy, cuotaGoogle));
    if (!limiteEjecucion) {
      console.log("No se enviaron correos: se alcanzó el límite diario o la cuota disponible de Google.");
      return;
    }

    const documentos = listarDocumentosTareas();
    let enviados = 0;
    let limiteAlcanzado = false;

    documentos.forEach(function(documento) {
      if (limiteAlcanzado) return;
      const tarea = documento.datos;
      if (["realizada", "cancelada"].includes(String(tarea.estado || "").toLowerCase())) return;

      const recordatorios = Array.isArray(tarea.recordatorios) ? tarea.recordatorios : [];
      let cambio = false;

      recordatorios.forEach(function(recordatorio) {
        if (limiteAlcanzado) return;
        const fecha = Date.parse(recordatorio.fechaHora || "");
        if (!Number.isFinite(fecha) || fecha > Date.now() || recordatorio.emailEnviadoEn) return;

        const destinatarios = normalizarCorreos(tarea.correosResponsables);
        if (!destinatarios.length) return;

        const correosEnviados = new Set(normalizarCorreos(recordatorio.correosEnviados));
        const pendientes = destinatarios.filter(function(correo) { return !correosEnviados.has(correo); });
        if (!pendientes.length) {
          recordatorio.emailEnviadoEn = new Date().toISOString();
          cambio = true;
          return;
        }

        pendientes.forEach(function(correo) {
          if (limiteAlcanzado) return;
          if (enviados >= limiteEjecucion || obtenerCorreosEnviadosHoy() >= MAX_CORREOS_POR_DIA || MailApp.getRemainingDailyQuota() <= 0) {
            limiteAlcanzado = true;
            return;
          }
          const contenido = crearContenidoCorreo(tarea, recordatorio, documento.id);
          const mensaje = {
            to: correo,
            name: "DigitCong",
            subject: crearAsunto(tarea),
            body: contenido.texto,
            htmlBody: contenido.html
          };
          if (contenido.logo) mensaje.inlineImages = { digitCongLogo: contenido.logo };
          MailApp.sendEmail(mensaje);
          registrarCorreoEnviadoHoy();
          correosEnviados.add(correo);
          recordatorio.correosEnviados = Array.from(correosEnviados);
          recordatorio.correoUltimoEnvioEn = new Date().toISOString();
          if (destinatarios.every(function(item) { return correosEnviados.has(item); })) {
            recordatorio.emailEnviadoEn = new Date().toISOString();
          }
          guardarRecordatorios(documento.nombre, recordatorios);
          cambio = false;
          enviados += 1;
          if (enviados >= limiteEjecucion || obtenerCorreosEnviadosHoy() >= MAX_CORREOS_POR_DIA) limiteAlcanzado = true;
        });
      });

      if (cambio) guardarRecordatorios(documento.nombre, recordatorios);
    });

    console.log("Correos enviados en esta ejecución: " + enviados + "; tareas revisadas: " + documentos.length + "; límite propio diario: " + MAX_CORREOS_POR_DIA + ".");
  } finally {
    lock.releaseLock();
  }
}

function estanActivadosRecordatoriosCorreo() {
  const url = "https://firestore.googleapis.com/v1/projects/" + FIRESTORE_PROJECT_ID +
    "/databases/(default)/documents/configuracion/global";
  const respuesta = llamarFirestore(url, "get", "leer la configuración de correo");
  const documento = JSON.parse(respuesta.getContentText() || "{}");
  const configuracion = decodificarMapaFirestore(documento.fields || {});
  return configuracion.envioRecordatoriosCorreo !== false;
}

function obtenerCorreosEnviadosHoy() {
  const hoy = Utilities.formatDate(new Date(), TZ_RECORDATORIOS, "yyyy-MM-dd");
  const propiedades = PropertiesService.getScriptProperties();
  const registro = JSON.parse(propiedades.getProperty(CLAVE_CUOTA_CORREO) || "{}");
  return registro.fecha === hoy ? Number(registro.cantidad) || 0 : 0;
}

function registrarCorreoEnviadoHoy() {
  const hoy = Utilities.formatDate(new Date(), TZ_RECORDATORIOS, "yyyy-MM-dd");
  const propiedades = PropertiesService.getScriptProperties();
  const registro = JSON.parse(propiedades.getProperty(CLAVE_CUOTA_CORREO) || "{}");
  const cantidad = registro.fecha === hoy ? Number(registro.cantidad) || 0 : 0;
  propiedades.setProperty(CLAVE_CUOTA_CORREO, JSON.stringify({ fecha: hoy, cantidad: cantidad + 1 }));
}

/** Ejecutar una vez para instalar el activador automático cada cinco minutos. */
function instalarActivadorRecordatorios() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) { return trigger.getHandlerFunction() === "procesarRecordatoriosCorreo"; })
    .forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger("procesarRecordatoriosCorreo")
    .timeBased()
    .everyMinutes(5)
    .create();
  console.log("Activador instalado: cada cinco minutos.");
}

/** Comprobar que la cuenta autorizada puede leer Firestore sin enviar correos. */
function probarConexionFirestore() {
  const documentos = listarDocumentosTareas();
  console.log("Conexión correcta. Tareas visibles: " + documentos.length);
  return documentos.length;
}

function listarDocumentosTareas() {
  const raiz = "https://firestore.googleapis.com/v1/projects/" + FIRESTORE_PROJECT_ID +
    "/databases/(default)/documents/" + FIRESTORE_COLLECTION;
  const documentos = [];
  let tokenPagina = "";

  do {
    const separador = raiz.indexOf("?") === -1 ? "?" : "&";
    const url = raiz + separador + "pageSize=500" +
      (tokenPagina ? "&pageToken=" + encodeURIComponent(tokenPagina) : "");
    const respuesta = llamarFirestore(url, "get");
    const datos = JSON.parse(respuesta.getContentText() || "{}");

    (datos.documents || []).forEach(function(documento) {
      const segmento = documento.name.split("/").pop();
      documentos.push({
        id: segmento,
        nombre: documento.name,
        datos: decodificarMapaFirestore(documento.fields || {})
      });
    });
    tokenPagina = datos.nextPageToken || "";
  } while (tokenPagina);

  return documentos;
}

function guardarRecordatorios(nombreDocumento, recordatorios) {
  const url = "https://firestore.googleapis.com/v1/" + nombreDocumento +
    "?updateMask.fieldPaths=recordatorios";
  const respuesta = UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({
      fields: { recordatorios: codificarValorFirestore(recordatorios) }
    }),
    muteHttpExceptions: true
  });
  verificarRespuestaFirestore(respuesta, "actualizar un recordatorio");
}

function llamarFirestore(url, metodo, operacion) {
  const respuesta = UrlFetchApp.fetch(url, {
    method: metodo,
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  verificarRespuestaFirestore(respuesta, operacion || "leer tareas");
  return respuesta;
}

function verificarRespuestaFirestore(respuesta, operacion) {
  const codigo = respuesta.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    throw new Error("Firestore no pudo " + operacion + " (HTTP " + codigo + "). " +
      respuesta.getContentText().slice(0, 500));
  }
}

function decodificarMapaFirestore(campos) {
  const resultado = {};
  Object.keys(campos).forEach(function(clave) {
    resultado[clave] = decodificarValorFirestore(campos[clave]);
  });
  return resultado;
}

function decodificarValorFirestore(valor) {
  if (Object.prototype.hasOwnProperty.call(valor, "nullValue")) return null;
  if (Object.prototype.hasOwnProperty.call(valor, "stringValue")) return valor.stringValue;
  if (Object.prototype.hasOwnProperty.call(valor, "booleanValue")) return valor.booleanValue;
  if (Object.prototype.hasOwnProperty.call(valor, "integerValue")) return Number(valor.integerValue);
  if (Object.prototype.hasOwnProperty.call(valor, "doubleValue")) return Number(valor.doubleValue);
  if (Object.prototype.hasOwnProperty.call(valor, "timestampValue")) return valor.timestampValue;
  if (Object.prototype.hasOwnProperty.call(valor, "arrayValue")) {
    return (valor.arrayValue.values || []).map(decodificarValorFirestore);
  }
  if (Object.prototype.hasOwnProperty.call(valor, "mapValue")) {
    return decodificarMapaFirestore(valor.mapValue.fields || {});
  }
  return null;
}

function codificarValorFirestore(valor) {
  if (valor === null || typeof valor === "undefined") return { nullValue: null };
  if (typeof valor === "string") return { stringValue: valor };
  if (typeof valor === "boolean") return { booleanValue: valor };
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? { integerValue: String(valor) } : { doubleValue: valor };
  }
  if (Array.isArray(valor)) {
    return { arrayValue: { values: valor.map(codificarValorFirestore) } };
  }
  const campos = {};
  Object.keys(valor).forEach(function(clave) {
    if (typeof valor[clave] !== "undefined") campos[clave] = codificarValorFirestore(valor[clave]);
  });
  return { mapValue: { fields: campos } };
}

function normalizarCorreos(valor) {
  const elementos = Array.isArray(valor) ? valor : (typeof valor === "string" ? valor.split(/[;,]/) : []);
  return Array.from(new Set(elementos.map(function(item) {
    return String(item || "").trim().toLowerCase();
  }).filter(function(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  })));
}

function crearAsunto(tarea) {
  const titulo = String(tarea.titulo || "Tarea").replace(/[\r\n]+/g, " ").slice(0, 120);
  return "DigitCong | Recordatorio: " + titulo;
}

function crearContenidoCorreo(tarea, recordatorio, idTarea) {
  const fecha = new Date(recordatorio.fechaHora);
  const fechaTexto = Utilities.formatDate(fecha, TZ_RECORDATORIOS, "dd/MM/yyyy 'a las' HH:mm");
  const titulo = String(tarea.titulo || "Sin título");
  const responsables = Array.isArray(tarea.responsables) ? tarea.responsables.join(", ") : "Sin asignar";
  const descripcion = String(tarea.descripcion || "").slice(0, 1500);
  const appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
  const enlace = appUrl
    ? appUrl.replace(/\/+$/, "") + "/" + PAGINA_TAREAS + "?task=" + encodeURIComponent(idTarea)
    : "";
  const logo = obtenerIconoEmail();
  const bloqueLogo = logo
    ? '<img src="cid:digitCongLogo" width="46" height="46" alt="DigitCong" style="display:block;width:46px;height:46px;border:0;border-radius:10px">'
    : '<span style="display:inline-block;padding:12px 10px;border-radius:10px;background:#0d6efd;color:#ffffff;font:bold 16px Arial,sans-serif">DC</span>';

  const descripcionHtml = descripcion
    ? '<tr><td style="padding:0 0 18px;color:#495057;font:14px/1.6 Arial,sans-serif"><strong>Descripción</strong><br>' + escaparHtmlCorreo(descripcion).replace(/\n/g, "<br>") + '</td></tr>'
    : "";
  const botonHtml = enlace
    ? '<tr><td style="padding:8px 0 4px"><a href="' + escaparHtmlCorreo(enlace) + '" style="display:inline-block;padding:12px 20px;border-radius:6px;background:#0d6efd;color:#ffffff;text-decoration:none;font:bold 14px Arial,sans-serif">Abrir tarea</a></td></tr>'
    : "";
  const logoInline = logo ? logo : null;
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f1f4f8;font-family:Arial,Helvetica,sans-serif;color:#212529">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Tienes un recordatorio de tarea en DigitCong.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f4f8">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dee2e6;border-radius:12px;overflow:hidden">
        <tr><td style="padding:18px 24px;background:#212529">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:14px;vertical-align:middle">${bloqueLogo}</td>
            <td style="vertical-align:middle;color:#ffffff"><div style="font:bold 20px Arial,sans-serif">DigitCong</div><div style="margin-top:4px;color:#ced4da;font:13px Arial,sans-serif">Tareas y recordatorios</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 24px 30px">
          <div style="margin-bottom:8px;color:#0d6efd;font:bold 12px Arial,sans-serif;letter-spacing:1px">RECORDATORIO</div>
          <h1 style="margin:0 0 20px;color:#212529;font:bold 24px/1.3 Arial,sans-serif">${escaparHtmlCorreo(titulo)}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#f8f9fa;border-left:4px solid #0d6efd">
            <tr><td style="padding:14px 16px;color:#212529;font:15px/1.5 Arial,sans-serif"><strong>Fecha del recordatorio</strong><br>${escaparHtmlCorreo(fechaTexto)}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:0 0 18px;color:#495057;font:14px/1.6 Arial,sans-serif"><strong>Responsable(s)</strong><br>${escaparHtmlCorreo(responsables)}</td></tr>
            ${descripcionHtml}
            ${botonHtml}
          </table>
        </td></tr>
        <tr><td style="padding:14px 24px;background:#f8f9fa;border-top:1px solid #dee2e6;color:#6c757d;font:12px/1.5 Arial,sans-serif">Aviso automático de DigitCong. Este correo corresponde a un recordatorio de tarea.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const partesTexto = [
    "DigitCong | Recordatorio de tarea",
    "",
    "Tarea: " + titulo,
    "Fecha: " + fechaTexto,
    "Responsable(s): " + responsables,
    descripcion ? "" : null,
    descripcion ? "Descripción: " + descripcion : null,
    enlace ? "" : null,
    enlace ? "Abrir tarea: " + enlace : null,
    "",
    "Aviso automático de DigitCong."
  ].filter(function(parte) { return parte !== null; });

  return { texto: partesTexto.join("\n"), html: html, logo: logoInline };
}

function obtenerIconoEmail() {
  if (typeof iconoEmailCache !== "undefined") return iconoEmailCache;
  iconoEmailCache = null;
  const appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
  if (!appUrl) return iconoEmailCache;

  try {
    const respuesta = UrlFetchApp.fetch(appUrl.replace(/\/+$/, "") + "/assets/icon-192.png", {
      followRedirects: true,
      muteHttpExceptions: true
    });
    if (respuesta.getResponseCode() === 200) {
      iconoEmailCache = respuesta.getBlob().setName("digitcong-icon.png");
    } else {
      console.warn("No se pudo cargar el icono de DigitCong para el correo (HTTP " + respuesta.getResponseCode() + ").");
    }
  } catch (error) {
    console.warn("No se pudo cargar el icono de DigitCong para el correo.");
  }
  return iconoEmailCache;
}

function escaparHtmlCorreo(valor) {
  return String(valor == null ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}