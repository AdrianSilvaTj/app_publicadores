const mesesServicioAnalisis = [
  { nombre: "Septiembre", mes: 9, anioOffset: -1 }, { nombre: "Octubre", mes: 10, anioOffset: -1 },
  { nombre: "Noviembre", mes: 11, anioOffset: -1 }, { nombre: "Diciembre", mes: 12, anioOffset: -1 },
  { nombre: "Enero", mes: 1, anioOffset: 0 }, { nombre: "Febrero", mes: 2, anioOffset: 0 },
  { nombre: "Marzo", mes: 3, anioOffset: 0 }, { nombre: "Abril", mes: 4, anioOffset: 0 },
  { nombre: "Mayo", mes: 5, anioOffset: 0 }, { nombre: "Junio", mes: 6, anioOffset: 0 },
  { nombre: "Julio", mes: 7, anioOffset: 0 }, { nombre: "Agosto", mes: 8, anioOffset: 0 },
];
const coleccionAsistenciaAnalisis = "asistenciaReuniones";
let asistenciasAnalisis = [];
let congregacionNombreAnalisis = "";
let mesActualModalAsistencia = null;
let publicadoresAnalisis = [];
let servicioAnalisis = [];
const categoriasTotalesAnalisis = {
  regulares: { titulo: "PRECURSORES REGULARES", tbody: "listaTotalesRegulares", horas: true, incluye: (privilegio) => privilegio === "regular" },
  auxiliares: { titulo: "PRECURSORES AUXILIARES", tbody: "listaTotalesAuxiliares", horas: true, incluye: (privilegio) => privilegio === "auxiliar" || privilegio === "auxiliar_mes" },
  publicadores: { titulo: "PUBLICADORES", tbody: "listaTotalesPublicadores", horas: false, incluye: (privilegio) => !privilegio },
};

async function iniciarAnalisisCongregacion() {
  const tbody = document.getElementById("listaPrecursoresRegulares");
  const tbodyAsistencia = document.getElementById("listaAsistenciaReuniones");
  const selector = document.getElementById("anioServicioAnalisis");
  mostrarBanner("Cargando...", "info", true);
  try {
    const [publicadores, servicio, configuracion, snapshotAsistencia] = await Promise.all([
      consultarFirebase("publicadores"),
      consultarFirebase("servicio"),
      cargarConfiguracionGlobal(),
      db.collection(coleccionAsistenciaAnalisis).get(),
    ]);
    asistenciasAnalisis = snapshotAsistencia.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    congregacionNombreAnalisis = configuracion?.nombreCongregacion || "";
    publicadoresAnalisis = publicadores;
    servicioAnalisis = servicio;
    localStorage.setItem("firebase_publicadores", JSON.stringify(publicadores));
    selector.replaceChildren();
    const regulares = publicadores
      .filter((pub) => (pub.estadoEspiritual || []).includes("Precursor regular"))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const hoy = new Date();
    const anioActualServicio = hoy.getMonth() >= 8 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    const aniosServicioRegistrados = servicio
      .map((registro) => {
        const anio = parseInt(registro.anio, 10);
        const mes = parseInt(registro.mes, 10);
        if (!Number.isFinite(anio) || mes < 1 || mes > 12) return null;
        return obtenerAnioServicio(mes, anio);
      })
      .filter(Number.isFinite);
    const anioMinimo = Math.min(anioActualServicio - 5, ...aniosServicioRegistrados, anioActualServicio);
    const anioMaximo = Math.max(anioActualServicio + 1, ...aniosServicioRegistrados, anioActualServicio);
    for (let anio = anioMaximo; anio >= anioMinimo; anio--) {
      selector.add(new Option(`${anio} (sep. ${anio - 1} – ago. ${anio})`, String(anio)));
    }
    selector.value = String(anioActualServicio);
    const objetivoAnual = (Number(configuracion?.horasMensualesPrecursoresRegulares) || 0) * 12;
    const umbralAlerta = objetivoAnual * 0.95;

    function render() {
      const anioServicio = Number(selector.value);
      const totales = new Map(regulares.map((pub) => [String(pub.id), 0]));
      servicio.forEach((registro) => {
        const anio = parseInt(registro.anio, 10);
        const mes = parseInt(registro.mes, 10);
        const perteneceAlAnio = obtenerAnioServicio(mes, anio) === anioServicio;
        const id = String(registro.publicadorId ?? "");
        if (perteneceAlAnio && totales.has(id)) {
          totales.set(id, totales.get(id) + (Number(registro.horas) || 0));
        }
      });

      tbody.replaceChildren();
      if (!regulares.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay precursores regulares registrados.</td></tr>';
      } else {
        regulares.forEach((pub) => {
          const fila = document.createElement("tr");
          const nombre = document.createElement("td");
          nombre.textContent = pub.nombre || "Sin nombre";
          const horas = document.createElement("td");
          horas.className = "text-end";
          const totalPublicador = totales.get(String(pub.id)) || 0;
          horas.textContent = `${totalPublicador} h`;
          if (objetivoAnual > 0 && totalPublicador < umbralAlerta) {
            horas.style.color = "darkred";
          }
          const acciones = document.createElement("td");
          acciones.className = "text-end";
          const botonTarjeta = document.createElement("button");
          botonTarjeta.type = "button";
          botonTarjeta.className = "btn btn-sm btn-outline-primary";
          botonTarjeta.textContent = "👁 Ver tarjeta";
          botonTarjeta.addEventListener("click", () =>
            verTarjetaPublicador(pub.id, Number(selector.value)),
          );
          acciones.appendChild(botonTarjeta);
          fila.append(nombre, horas, acciones);
          tbody.appendChild(fila);
        });
      }
      const totalHoras = [...totales.values()].reduce((suma, horas) => suma + horas, 0);
      document.getElementById("totalHorasRegulares").textContent =
        `Total: ${totalHoras} horas${objetivoAnual > 0 ? ` · Objetivo anual: ${objetivoAnual} h` : ""}`;
      renderizarAsistencias(anioServicio);
      Object.entries(categoriasTotalesAnalisis).forEach(([categoria, config]) => {
        const meses = calcularTotalesServicio(anioServicio, categoria);
        const columnas = config.horas ? 4 : 3;
        const filas = meses.map((item) => {
          const fila = document.createElement("tr");
          fila.innerHTML = `<th scope="row">${item.nombre}</th><td class="text-end">${item.registros ? item.informaron : "—"}</td><td class="text-end">${item.registros ? item.cursos : "—"}</td>${config.horas ? `<td class="text-end">${item.registros ? item.horas : "—"}</td>` : ""}`;
          return fila;
        });
        const total = document.createElement("tr");
        total.className = "fw-semibold";
        total.innerHTML = `<th scope="row">Total</th><td></td><td class="text-end">${meses.reduce((suma, item) => suma + item.cursos, 0)}</td>${config.horas ? `<td class="text-end">${meses.reduce((suma, item) => suma + item.horas, 0)}</td>` : ""}`;
        const tbodyTotales = document.getElementById(config.tbody);
        if (meses.some((item) => item.registros)) tbodyTotales.replaceChildren(...filas, total);
        else tbodyTotales.innerHTML = `<tr><td colspan="${columnas}" class="text-center text-muted">No hay informes en este año de servicio.</td></tr>`;
      });
    };
    selector.addEventListener("change", render);
    document.getElementById("formAsistenciaReuniones").addEventListener("submit", guardarAsistencia);
    tbodyAsistencia.addEventListener("click", gestionarAccionAsistencia);
    document.querySelectorAll("[data-tarjeta-totales]").forEach((boton) =>
      boton.addEventListener("click", () => verTarjetaTotales(Number(selector.value), boton.dataset.tarjetaTotales)),
    );
    document.querySelectorAll(".asistencia-valor").forEach((entrada) => entrada.addEventListener("input", actualizarTotalesAsistencia));
    document.getElementById("modalAsistenciaReuniones").addEventListener("hidden.bs.modal", () => { mesActualModalAsistencia = null; });
    render();
    cerrarBanner();
  } catch (error) {
    console.error("Error al cargar el análisis de congregación:", error);
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">No se pudo cargar el análisis.</td></tr>';
    cerrarBanner();
    mostrarBanner("❌ Error al cargar el análisis de la congregación", "danger");
  }
}

/**
 * Sums monthly field service reports of a category (regulares, auxiliares or publicadores),
 * using the same active/privilege rules as the monthly totals of the service page.
 * Reports of deleted publishers are included: they have no saved privilege, so it is
 * inferred from the report (auxiliary flag, or hours without it for regular pioneers).
 */
function calcularTotalesServicio(anioServicio, categoria) {
  const config = categoriasTotalesAnalisis[categoria];
  const publicadorPorId = new Map(publicadoresAnalisis.map((pub) => [String(pub.id), pub]));
  return mesesServicioAnalisis.map((item) => {
    const anio = anioServicio + item.anioOffset;
    const registros = servicioAnalisis.filter((registro) => {
      if (Number(registro.mes) !== item.mes || Number(registro.anio) !== anio) return false;
      const publicador = publicadorPorId.get(String(registro.publicadorId));
      if (publicador) {
        return Number(publicador.grupo) > 0 && obtenerActivoRegistro(publicador, registro) && config.incluye(obtenerPrivilegioRegistro(publicador, registro, item.mes, anio));
      }
      const privilegio = registro.privilegio || (registro.auxiliar ? "auxiliar" : Number(registro.horas) > 0 ? "regular" : null);
      return Number(registro.grupo) > 0 && registro.activo !== false && config.incluye(privilegio);
    });
    return {
      ...item,
      registros: registros.length,
      informaron: registros.filter((registro) => registro.participo).length,
      cursos: registros.reduce((suma, registro) => suma + (Number(registro.cursos) || 0), 0),
      horas: config.horas ? registros.reduce((suma, registro) => suma + (Number(registro.horas) || 0), 0) : 0,
    };
  });
}

function verTarjetaTotales(anioServicio, categoria) {
  const config = categoriasTotalesAnalisis[categoria];
  const meses = calcularTotalesServicio(anioServicio, categoria);
  const width = 900;
  const height = 900;
  const ventana = window.open("", "tarjetaTotales", `width=${width},height=${height},left=${(screen.width - width) / 2},top=${(screen.height - height) / 2},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`);
  if (!ventana) {
    alert("Permite las ventanas emergentes para ver la tarjeta");
    return;
  }
  const casilla = '<input type="checkbox">';
  const nombre = `${config.titulo} CONGREGACIÓN ${congregacionNombreAnalisis}`.toUpperCase();
  const filas = meses.map((item) => `<tr><td>${item.nombre}</td><td>${casilla}</td><td>${item.registros ? item.cursos : ""}</td><td>${casilla}</td><td>${item.registros && config.horas ? item.horas.toLocaleString("en-US") : ""}</td><td style="text-align:left">${item.registros ? `INFORMARON ${item.informaron}` : ""}</td></tr>`).join("");
  const totalHoras = config.horas ? meses.reduce((suma, item) => suma + item.horas, 0).toLocaleString("en-US") : "";
  const nombreArchivo = `Registro ${config.titulo.toLowerCase()} ${anioServicio}.pdf`;
  ventana.document.open();
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8" /><title>Registro de Publicador</title><link rel="stylesheet" href="../styles/tarjeta.css"><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script></head><body>
    <div class="acciones"><button class="btn" onclick="descargar()">⬇ Descargar</button> <button class="btn" onclick="window.close()">❌ Cerrar</button></div>
    <div id="contenidoTarjeta"><div class="tarjeta-servicio">
      <h3 class="titulo">REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN</h3>
      <div class="datos-publicador">
        <div class="fila nombre"><span class="label">Nombre:</span><span class="valor">${escaparHtmlAsistencia(nombre)}</span></div>
        <div class="fila doble">
          <div class="col"><div class="linea"><span class="label">Fecha de nacimiento:</span></div><div class="linea"><span class="label">Fecha de bautismo:</span></div></div>
          <div class="col checks"><div class="grupo-checks"><label>${casilla} Hombre</label> <label>${casilla} Mujer</label></div><div class="grupo-checks"><label>${casilla} Otras ovejas</label> <label>${casilla} Ungido</label></div></div>
        </div>
        <div class="fila checks-full"><label>${casilla} Anciano</label><label>${casilla} Siervo ministerial</label><label>${casilla} Precursor regular</label><label>${casilla} Precursor especial</label><label>${casilla} Misionero que sirve<br>en el campo</label></div>
      </div>
      <table class="tabla-servicio">
        <thead><tr><th style="width:170px">Año de servicio<br>${anioServicio}</th><th style="width:70px">Participación<br>en el ministerio</th><th style="width:70px">Cursos<br>bíblicos</th><th style="width:70px">Precursor<br>auxiliar</th><th style="width:110px">Horas<small>Si es precursor o<br>misionero que sirve<br>en el campo</small></th><th style="width:260px">Notas</th></tr></thead>
        <tbody>${filas}<tr class="total"><td style="border:none"></td><td style="border:none"></td><td style="border:none"></td><td style="text-align:right">Total</td><td>${totalHoras}</td><td></td></tr></tbody>
      </table>
    </div></div>
    <script>function descargar(){html2pdf().set({margin:10,filename:${JSON.stringify(nombreArchivo)},image:{type:"jpeg",quality:0.98},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"b5",orientation:"landscape"}}).from(document.getElementById("contenidoTarjeta")).save()}</script>
  </body></html>`);
  ventana.document.close();
}

function buscarAsistencia(anioServicio, mes) {
  return asistenciasAnalisis.find((item) => Number(item.anioServicio) === Number(anioServicio) && Number(item.mes) === Number(mes));
}

function renderizarAsistencias(anioServicio) {
  const tbody = document.getElementById("listaAsistenciaReuniones");
  tbody.replaceChildren(...mesesServicioAnalisis.map((item) => {
    const registro = buscarAsistencia(anioServicio, item.mes);
    const promedio = (valores) => {
      const registrados = (Array.isArray(valores) ? valores : []).filter((valor) => valor !== null && valor !== "" && Number.isFinite(Number(valor)));
      return registrados.length ? Math.round(registrados.reduce((total, valor) => total + Number(valor), 0) / registrados.length) : "—";
    };
    const fila = document.createElement("tr");
    fila.innerHTML = `<th scope="row">${item.nombre}</th><td class="text-end">${promedio(registro?.entreSemana)}</td><td class="text-end">${promedio(registro?.finSemana)}</td><td class="text-end"><div class="asistencia-acciones"><button class="btn btn-sm btn-outline-secondary" type="button" data-accion-asistencia="ver" data-mes="${item.mes}" aria-label="Ver asistencia de ${item.nombre}" title="Ver asistencia"><span aria-hidden="true">👁</span><span class="visually-hidden">Ver</span></button><button class="btn btn-sm btn-outline-secondary" type="button" data-accion-asistencia="descargar" data-mes="${item.mes}" aria-label="Descargar PDF de ${item.nombre}" title="Descargar PDF"><span aria-hidden="true">&#128196;</span><span class="visually-hidden">PDF</span></button><button class="btn btn-sm btn-outline-danger" type="button" data-accion-asistencia="eliminar" data-mes="${item.mes}" aria-label="Eliminar asistencia de ${item.nombre}" title="Eliminar asistencia"${registro ? "" : " disabled"}><span aria-hidden="true">&#128465;</span><span class="visually-hidden">Eliminar</span></button></div></td>`;
    return fila;
  }));
}

function gestionarAccionAsistencia(evento) {
  const boton = evento.target.closest("[data-accion-asistencia]");
  if (!boton) return;
  const mes = Number(boton.dataset.mes);
  const anioServicio = Number(document.getElementById("anioServicioAnalisis").value);
  const item = mesesServicioAnalisis.find((mesServicio) => mesServicio.mes === mes);
  const registro = buscarAsistencia(anioServicio, mes);
  if (boton.dataset.accionAsistencia === "ver") abrirModalAsistencia(anioServicio, item, registro);
  else if (boton.dataset.accionAsistencia === "descargar") verInformeAsistencia(anioServicio, item, registro);
  else eliminarAsistencia(anioServicio, item, registro);
}

async function eliminarAsistencia(anioServicio, item, registro) {
  if (!registro) return;
  const confirmado = await confirmarAccion(
    `Se eliminará el registro de asistencia de ${item.nombre} ${anioServicio + item.anioOffset}. Esta acción no se puede deshacer.`,
    { titulo: "Eliminar asistencia", textoConfirmar: "Eliminar", claseConfirmar: "btn-danger" },
  );
  if (!confirmado) return;
  try {
    await db.collection(coleccionAsistenciaAnalisis).doc(registro.id).delete();
    asistenciasAnalisis = asistenciasAnalisis.filter((fila) => fila.id !== registro.id);
    renderizarAsistencias(anioServicio);
    mostrarBanner("Registro de asistencia eliminado.", "success", false, 2500);
  } catch (error) {
    console.error("Error al eliminar la asistencia:", error);
    mostrarBanner("No se pudo eliminar el registro de asistencia.", "danger", false, 4500);
  }
}

function abrirModalAsistencia(anioServicio, item, registro) {
  mesActualModalAsistencia = { anioServicio, mes: item.mes, anio: anioServicio + item.anioOffset, nombre: item.nombre, id: registro?.id || null };
  document.getElementById("tituloModalAsistencia").textContent = `Asistencia a las reuniones · ${item.nombre}`;
  document.getElementById("mesAsistencia").value = `${item.nombre} ${anioServicio + item.anioOffset}`;
  const formulario = document.getElementById("formAsistenciaReuniones");
  formulario.querySelectorAll("input").forEach((entrada) => { entrada.disabled = false; });
  document.getElementById("guardarAsistenciaReuniones").disabled = false;
  document.querySelectorAll(".asistencia-valor").forEach((entrada) => {
    const valores = registro?.[entrada.dataset.tipo] || [];
    entrada.value = valores[Number(entrada.dataset.semana)] ?? "";
  });
  actualizarTotalesAsistencia();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAsistenciaReuniones")).show();
}

function leerValoresAsistencia(tipo) {
  return [...document.querySelectorAll(`.asistencia-valor[data-tipo="${tipo}"]`)].map((entrada) => entrada.value === "" ? null : Math.max(0, Math.floor(Number(entrada.value))));
}

function actualizarTotalesAsistencia() {
  ["entreSemana", "finSemana"].forEach((tipo) => {
    const valores = leerValoresAsistencia(tipo).filter((valor) => valor !== null && Number.isFinite(valor));
    const total = valores.reduce((suma, valor) => suma + valor, 0);
    document.querySelector(`[data-total="${tipo}"]`).textContent = String(total);
    document.querySelector(`[data-promedio="${tipo}"]`).textContent = valores.length ? (total / valores.length).toFixed(1).replace(/\.0$/, "") : "0";
  });
}

async function guardarAsistencia(evento) {
  evento.preventDefault();
  if (!mesActualModalAsistencia) return;
  const boton = document.getElementById("guardarAsistenciaReuniones");
  boton.disabled = true;
  boton.textContent = "Guardando...";
  const datos = {
    anioServicio: mesActualModalAsistencia.anioServicio, anio: mesActualModalAsistencia.anio, mes: mesActualModalAsistencia.mes,
    congregacion: congregacionNombreAnalisis,
    entreSemana: leerValoresAsistencia("entreSemana"), finSemana: leerValoresAsistencia("finSemana"),
    actualizadoEn: new Date().toISOString(), actualizadoPor: auth.currentUser?.uid || null,
  };
  try {
    let id = mesActualModalAsistencia.id;
    if (id) await db.collection(coleccionAsistenciaAnalisis).doc(id).set(datos, { merge: true });
    else {
      const existente = buscarAsistencia(datos.anioServicio, datos.mes);
      if (existente) { id = existente.id; await db.collection(coleccionAsistenciaAnalisis).doc(id).set(datos, { merge: true }); }
      else id = (await db.collection(coleccionAsistenciaAnalisis).add(datos)).id;
    }
    const anterior = asistenciasAnalisis.findIndex((item) => item.id === id);
    const actualizado = { id, ...datos };
    if (anterior >= 0) asistenciasAnalisis[anterior] = actualizado; else asistenciasAnalisis.push(actualizado);
    congregacionNombreAnalisis = datos.congregacion;
    renderizarAsistencias(mesActualModalAsistencia.anioServicio);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAsistenciaReuniones")).hide();
    mostrarBanner("Asistencia guardada.", "success", false, 2500);
  } catch (error) {
    console.error("Error al guardar la asistencia:", error);
    mostrarBanner("No se pudo guardar la asistencia. Intenta de nuevo.", "danger", false, 5000);
  } finally {
    boton.disabled = false;
    boton.textContent = "💾 Guardar";
  }
}

function crearInformeAsistencia(anioServicio, item, registro) {
  const snapshot = registro || { entreSemana: [], finSemana: [] };
  const semana = (tipo) => {
    const valores = snapshot[tipo] || [];
    return Array.from({ length: 5 }, (_, indice) => valores[indice] ?? "");
  };
  const filas = [{ nombre: "Reunión de entre semana", tipo: "entreSemana" }, { nombre: "Reunión del fin de semana", tipo: "finSemana" }].map((fila) => {
    const valores = semana(fila.tipo);
    const registrados = valores.filter((valor) => valor !== null && valor !== "" && Number.isFinite(Number(valor))).map(Number);
    const total = registrados.reduce((suma, valor) => suma + valor, 0);
    const promedio = registrados.length ? (total / registrados.length).toFixed(1).replace(/\.0$/, "") : "";
    return `<tr><th>${fila.nombre}</th>${valores.map((valor) => `<td>${valor}</td>`).join("")}<td>${registrados.length ? total : ""}</td><td>${promedio}</td></tr>`;
  }).join("");
  const elemento = document.createElement("div");
  elemento.className = "asistencia-pdf";
  elemento.innerHTML = `<h2>INFORME DE ASISTENCIA A LAS REUNIONES</h2><p class="nota">(La asistencia se contará una sola vez a mitad de cada reunión. Recuerden contar también a las personas aisladas o confinadas en casa que estén conectadas.)</p><div class="datos"><span><b>Nombre de la congregación:</b> ${escaparHtmlAsistencia(congregacionNombreAnalisis)}</span><span><b>Mes:</b> ${item.nombre} ${anioServicio + item.anioOffset}</span></div><table><thead><tr><th></th><th>Primera<br>semana</th><th>Segunda<br>semana</th><th>Tercera<br>semana</th><th>Cuarta<br>semana</th><th>Quinta<br>semana</th><th>Total</th><th>Promedio</th></tr></thead><tbody>${filas}</tbody></table>`;
  return elemento;
}

function verInformeAsistencia(anioServicio, item, registro) {
  const width = 1000;
  const height = 760;
  const left = Math.max(0, (screen.width - width) / 2);
  const top = Math.max(0, (screen.height - height) / 2);
  const ventana = window.open("", "informeAsistenciaReuniones", `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`);
  if (!ventana) {
    alert("Permite las ventanas emergentes para ver el informe de asistencia.");
    return;
  }
  const informe = crearInformeAsistencia(anioServicio, item, registro).outerHTML;
  const nombreArchivo = `Asistencia-${item.nombre}-${anioServicio}.pdf`;
  ventana.document.open();
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Informe de asistencia a las reuniones</title><link rel="stylesheet" href="../styles/analisis-congregacion.css"><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><style>body{margin:0;padding:1rem;background:#f1f3f5}.acciones{position:sticky;top:0;display:flex;justify-content:flex-end;gap:.5rem;padding:.75rem;background:#fff;border-bottom:1px solid #dee2e6;z-index:1}.asistencia-pdf{margin:1rem auto;box-shadow:0 2px 12px #0002}@media(max-width:700px){body{overflow-x:auto}.acciones{position:sticky;left:0;width:max-content;min-width:100%;box-sizing:border-box}}</style></head><body><div class="acciones"><button type="button" onclick="descargar()">⬇ Descargar</button><button type="button" onclick="window.close()">❌ Cerrar</button></div><main id="contenidoInforme">${informe}</main><script>function descargar(){if(typeof html2pdf!=="function"){alert("No se pudo cargar el generador de PDF.");return}const informe=document.querySelector("#contenidoInforme .asistencia-pdf");informe.style.width="277mm";informe.style.margin="0";html2pdf().set({margin:12,filename:${JSON.stringify(nombreArchivo)},image:{type:"jpeg",quality:.98},html2canvas:{scale:2,backgroundColor:"#fff"},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"}}).from(informe).save()}</script></body></html>`);
  ventana.document.close();
}

async function descargarAsistencia(anioServicio, item, registro) {
  if (typeof html2pdf !== "function") {
    mostrarBanner("No se pudo cargar el generador de PDF.", "danger", false, 4000);
    return;
  }
  const elemento = crearInformeAsistencia(anioServicio, item, registro);
  const raiz = document.createElement("div"); raiz.append(elemento); document.body.append(raiz); raiz.style.cssText = "position:fixed;left:-10000px;top:0;width:277mm;background:#fff";
  try {
    const nombre = `Asistencia-${item.nombre}-${anioServicio}.pdf`;
    await html2pdf().set({ margin: 12, filename: nombre, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "landscape" } }).from(elemento).save();
  } catch (error) {
    console.error("Error al descargar el informe de asistencia:", error);
    mostrarBanner("No se pudo generar el PDF.", "danger", false, 4000);
  } finally { raiz.remove(); }
}

function escaparHtmlAsistencia(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
}

iniciarAnalisisCongregacion();
