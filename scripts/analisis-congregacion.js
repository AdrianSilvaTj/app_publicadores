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
    const aniosCompletadosConRegistros = aniosServicioRegistrados.filter(
      (anio) => anio < anioActualServicio,
    );
    const anioInicial = aniosCompletadosConRegistros.length
      ? Math.max(...aniosCompletadosConRegistros)
      : anioActualServicio;
    selector.value = String(anioInicial);
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
    };
    selector.addEventListener("change", render);
    document.getElementById("formAsistenciaReuniones").addEventListener("submit", guardarAsistencia);
    tbodyAsistencia.addEventListener("click", gestionarAccionAsistencia);
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

function buscarAsistencia(anioServicio, mes) {
  return asistenciasAnalisis.find((item) => Number(item.anioServicio) === Number(anioServicio) && Number(item.mes) === Number(mes));
}

function renderizarAsistencias(anioServicio) {
  const tbody = document.getElementById("listaAsistenciaReuniones");
  tbody.replaceChildren(...mesesServicioAnalisis.map((item) => {
    const registro = buscarAsistencia(anioServicio, item.mes);
    const promedio = (valores) => {
      const registrados = (Array.isArray(valores) ? valores : []).filter((valor) => valor !== null && valor !== "" && Number.isFinite(Number(valor)));
      return registrados.length ? (registrados.reduce((total, valor) => total + Number(valor), 0) / registrados.length).toFixed(1).replace(/\.0$/, "") : "—";
    };
    const fila = document.createElement("tr");
    fila.innerHTML = `<th scope="row">${item.nombre}</th><td class="text-end">${promedio(registro?.entreSemana)}</td><td class="text-end">${promedio(registro?.finSemana)}</td><td class="text-end"><div class="asistencia-acciones"><button class="btn btn-sm btn-outline-primary" type="button" data-accion-asistencia="ver" data-mes="${item.mes}" data-nombre-mes="${item.nombre}">Ver</button><button class="btn btn-sm btn-outline-secondary" type="button" data-accion-asistencia="descargar" data-mes="${item.mes}" data-nombre-mes="${item.nombre}">Descargar</button><button class="btn btn-sm btn-outline-danger" type="button" data-accion-asistencia="eliminar" data-mes="${item.mes}" data-nombre-mes="${item.nombre}"${registro ? "" : " disabled"}>Eliminar</button></div></td>`;
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
