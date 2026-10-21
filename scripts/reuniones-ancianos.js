const COLECCION_REUNIONES_ANCIANOS = "reuniones_ancianos";
const TIEMPO_LIMITE_CARGA_REUNIONES = 10000;
const DB_BORRADORES_REUNIONES = "digitCongEditorLocal";
const STORE_BORRADORES_REUNIONES = "borradoresReunionesAncianos";
const reunionesAncianosCargadas = new Map();
let reunionesAncianosActuales = [];
let paginaReunionesAncianosActual = 1;
let cantidadReunionesAncianosPorPagina = null;
let claveBorradorReunionAncianos = null;
let borradorReunionAncianosPendiente = null;
let temporizadorBorradorReunionAncianos = null;
let editorReunionAncianosListo = false;

async function inicializarListaReunionesAncianos() {
  const lista = document.getElementById("listaReunionesAncianos");
  if (!lista) return;
  lista.addEventListener(
    "click",
    gestionarAccionesReunionAncianos
  );
  document.getElementById("controlesPaginacionReunionesAncianos")?.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-pagina-reunion]");
    if (!boton || boton.disabled) return;
    const pagina = Number(boton.dataset.paginaReunion);
    if (!Number.isInteger(pagina) || pagina < 1) return;
    paginaReunionesAncianosActual = pagina;
    renderizarReunionesAncianos();
    lista.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.matchMedia("(max-width: 767.98px)").addEventListener("change", () => {
    paginaReunionesAncianosActual = 1;
    renderizarReunionesAncianos();
  });
  await cargarReunionesAncianos();
}

let cargandoReunionesAncianos = false;
let rangoSeleccionEditorAncianos = null;
let idEdicionReunionAncianos = null;

async function cargarReunionesAncianos() {
  if (cargandoReunionesAncianos) return;
  const lista = document.getElementById("listaReunionesAncianos");
  if (!lista) return;

  cargandoReunionesAncianos = true;
  lista.innerHTML = '<div class="col-12"><p class="text-muted">Cargando reuniones...</p></div>';

  try {
    const resultado = await esperarRespuestaConLimite(db
      .collection(COLECCION_REUNIONES_ANCIANOS)
      .orderBy("fecha", "desc")
      .get(), TIEMPO_LIMITE_CARGA_REUNIONES);
    reunionesAncianosActuales = resultado.docs;
    reunionesAncianosCargadas.clear();
    resultado.docs.forEach((documento) => reunionesAncianosCargadas.set(documento.id, documento.data()));
    renderizarReunionesAncianos();
  } catch (error) {
    console.error("Error al cargar reuniones de ancianos:", error);
    lista.innerHTML = '<div class="col-12"><div class="alert alert-danger mb-0">No se pudieron cargar las reuniones. Intenta de nuevo.</div></div>';
  } finally {
    cargandoReunionesAncianos = false;
  }
}

function renderizarReunionesAncianos() {
  const lista = document.getElementById("listaReunionesAncianos");
  const nav = document.getElementById("paginacionReunionesAncianos");
  const resumen = document.getElementById("resumenPaginacionReunionesAncianos");
  const controles = document.getElementById("controlesPaginacionReunionesAncianos");
  if (!lista || !nav || !resumen || !controles) return;
  if (!reunionesAncianosActuales.length) {
    lista.innerHTML = '<div class="col-12"><div class="alert alert-light border mb-0">Todavía no hay reuniones de ancianos.</div></div>';
    nav.classList.add("d-none");
    return;
  }
  const porPagina = window.matchMedia("(max-width: 767.98px)").matches ? 5 : 10;
  if (cantidadReunionesAncianosPorPagina !== porPagina) {
    cantidadReunionesAncianosPorPagina = porPagina;
    paginaReunionesAncianosActual = 1;
  }
  const paginas = Math.ceil(reunionesAncianosActuales.length / porPagina);
  paginaReunionesAncianosActual = Math.min(Math.max(1, paginaReunionesAncianosActual), paginas);
  const inicio = (paginaReunionesAncianosActual - 1) * porPagina;
  lista.innerHTML = reunionesAncianosActuales.slice(inicio, inicio + porPagina)
    .map(crearTarjetaReunionAncianos).join("");
  nav.classList.toggle("d-none", paginas <= 1);
  resumen.textContent = `Mostrando ${inicio + 1}–${Math.min(inicio + porPagina, reunionesAncianosActuales.length)} de ${reunionesAncianosActuales.length} reuniones`;
  controles.innerHTML = [
    `<li class="page-item${paginaReunionesAncianosActual === 1 ? " disabled" : ""}"><button class="page-link" type="button" data-pagina-reunion="${paginaReunionesAncianosActual - 1}" aria-label="Página anterior"${paginaReunionesAncianosActual === 1 ? " disabled" : ""}>Anterior</button></li>`,
    ...Array.from({ length: paginas }, (_, indice) => {
      const pagina = indice + 1;
      const actual = pagina === paginaReunionesAncianosActual;
      return `<li class="page-item${actual ? " active" : ""}"><button class="page-link" type="button" data-pagina-reunion="${pagina}"${actual ? ' aria-current="page"' : ""}>${pagina}</button></li>`;
    }),
    `<li class="page-item${paginaReunionesAncianosActual === paginas ? " disabled" : ""}"><button class="page-link" type="button" data-pagina-reunion="${paginaReunionesAncianosActual + 1}" aria-label="Página siguiente"${paginaReunionesAncianosActual === paginas ? " disabled" : ""}>Siguiente</button></li>`,
  ].join("");
}

function esperarRespuestaConLimite(promesa, tiempoLimite) {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error("La consulta tardó demasiado.")),
      tiempoLimite
    );
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

function crearTarjetaReunionAncianos(documento) {
  const reunion = documento.data();
  const fecha = formatearFechaReunionAncianos(reunion.fecha);
  const tema = escaparHtmlReunionAncianos(reunion.tema || "Sin tema");
  const contenido = sanitizarContenidoReunionAncianos(reunion.contenido || "");

  return `
    <article class="col-12 col-lg-6">
      <section class="card card-shadow reunion-ancianos-card">
        <div class="card-header group-header-color d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h2 class="h5 mb-1">${tema}</h2>
            <time class="small" datetime="${escaparHtmlReunionAncianos(reunion.fecha || "")}">${fecha}</time>
          </div>
          <div class="d-flex flex-wrap gap-1">
            <button class="btn btn-sm btn-outline-primary" type="button" data-accion-reunion="editar" data-reunion-id="${escaparHtmlReunionAncianos(documento.id)}" aria-label="Editar reunión: ${tema}" title="Editar reunión"><span aria-hidden="true">&#128393;</span><span class="visually-hidden">Editar</span></button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-accion-reunion="eliminar" data-reunion-id="${escaparHtmlReunionAncianos(documento.id)}" data-reunion-tema="${tema}" data-reunion-fecha="${escaparHtmlReunionAncianos(reunion.fecha || "")}" aria-label="Eliminar reunión: ${tema}" title="Eliminar reunión"><span aria-hidden="true">&#128465;</span><span class="visually-hidden">Eliminar</span></button>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-accion-reunion="pdf" data-reunion-id="${escaparHtmlReunionAncianos(documento.id)}" aria-label="Descargar PDF: ${tema}" title="Descargar PDF"><span aria-hidden="true">&#128196;</span><span class="visually-hidden">PDF</span></button>
          </div>
        </div>
        <div class="card-body">
          <div class="reunion-ancianos-contenido">${contenido || '<p class="text-muted mb-0">Sin contenido.</p>'}</div>
        </div>
      </section>
    </article>`;
}

function gestionarAccionesReunionAncianos(evento) {
  const boton = evento.target.closest("[data-accion-reunion]");
  if (!boton) return;

  const id = boton.dataset.reunionId;
  if (!id) return;
  if (boton.dataset.accionReunion === "editar") {
    window.location.href = `crear-reunion-ancianos.html?id=${encodeURIComponent(id)}`;
    return;
  }

  if (boton.dataset.accionReunion === "pdf") {
    descargarPdfReunionAncianos(id, boton);
    return;
  }

  if (boton.dataset.accionReunion === "eliminar") {
    eliminarReunionAncianos(id, boton);
  }
}

async function descargarPdfReunionAncianos(id, boton) {
  const reunion = reunionesAncianosCargadas.get(id);
  if (!reunion) {
    mostrarBanner("No se encontró la reunión para descargar.", "danger", false, 4000);
    return;
  }
  if (typeof html2pdf !== "function") {
    mostrarBanner("No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.", "danger", false, 5000);
    return;
  }

  boton.disabled = true;
  mostrarBanner("Preparando el PDF de la reunión...", "info", true);
  const titulo = reunion.tema || "Sin tema";
  const contenido = sanitizarContenidoReunionAncianos(reunion.contenido || "");
  const documentoPdf = document.createElement("div");
  documentoPdf.style.cssText = "box-sizing:border-box;width:180mm;padding:12mm;background:#fff;color:#212529;font-family:Arial,sans-serif;overflow-wrap:anywhere";
  documentoPdf.innerHTML = `
    <h1 style="font-size:20pt;margin:0 0 4mm">${escaparHtmlReunionAncianos(titulo)}</h1>
    <p style="font-size:11pt;color:#495057;margin:0 0 8mm">${escaparHtmlReunionAncianos(formatearFechaReunionAncianos(reunion.fecha))}</p>
    <div style="font-size:11pt;line-height:1.55;white-space:pre-wrap;tab-size:4">${contenido || "Sin contenido."}</div>
  `;
  document.body.appendChild(documentoPdf);
  const nombreArchivo = `Reunion-${String(titulo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "ancianos"}-${reunion.fecha || "sin-fecha"}.pdf`;

  try {
    await html2pdf().set({
      margin: 0,
      filename: nombreArchivo,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).from(documentoPdf).save();
    cerrarBanner();
    mostrarBanner("PDF descargado.", "success", false, 2500);
  } catch (error) {
    console.error("Error al generar el PDF de la reunión:", error);
    cerrarBanner();
    mostrarBanner("No se pudo generar el PDF. Intenta de nuevo.", "danger", false, 5000);
  } finally {
    documentoPdf.remove();
    boton.disabled = false;
  }
}

async function eliminarReunionAncianos(id, boton) {
  const tema = boton.dataset.reunionTema || "Sin tema";
  const fecha = formatearFechaReunionAncianos(boton.dataset.reunionFecha);
  const confirmar = await confirmarAccion(
    `¿Estás seguro?\n\nSe eliminará la reunión de ancianos:\n${tema} — ${fecha}\n\nEsta acción no se puede deshacer.`,
    {
      titulo: "Eliminar reunión de ancianos",
      textoConfirmar: "Eliminar",
      claseConfirmar: "btn-danger",
    }
  );
  if (!confirmar) return;

  boton.disabled = true;
  boton.textContent = "Eliminando...";
  mostrarBanner("Eliminando reunión...", "info", true);
  try {
    await esperarRespuestaConLimite(
      db.collection(COLECCION_REUNIONES_ANCIANOS).doc(id).delete(),
      TIEMPO_LIMITE_CARGA_REUNIONES
    );
    reunionesAncianosCargadas.delete(id);
    reunionesAncianosActuales = reunionesAncianosActuales.filter((reunion) => reunion.id !== id);
    renderizarReunionesAncianos();
    cerrarBanner();
    mostrarBanner("Reunión eliminada.", "success", false, 3000);
  } catch (error) {
    console.error("Error al eliminar la reunión de ancianos:", error);
    boton.disabled = false;
    boton.textContent = "🗑️ Eliminar";
    cerrarBanner();
    mostrarBanner("No se pudo eliminar la reunión. Intenta de nuevo.", "danger", false, 5000);
  }
}

function formatearFechaReunionAncianos(fecha) {
  if (!fecha) return "Fecha no disponible";
  const valor = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(valor.getTime())) return escaparHtmlReunionAncianos(fecha);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(valor);
}

function escaparHtmlReunionAncianos(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);
}

function sanitizarContenidoReunionAncianos(html) {
  const documento = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const etiquetasPermitidas = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "P", "DIV", "BR", "SPAN", "FONT"]);
  const contenedor = documento.body.firstElementChild;

  function copiarNodoSeguro(nodo) {
    if (nodo.nodeType === Node.TEXT_NODE) return documento.createTextNode(nodo.textContent);
    if (nodo.nodeType !== Node.ELEMENT_NODE) return null;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH", "VIDEO", "AUDIO"].includes(nodo.tagName)) return null;

    const etiqueta = nodo.tagName;
    if (!etiquetasPermitidas.has(etiqueta)) {
      const fragmento = documento.createDocumentFragment();
      Array.from(nodo.childNodes).forEach((hijo) => {
        const seguro = copiarNodoSeguro(hijo);
        if (seguro) fragmento.appendChild(seguro);
      });
      return fragmento;
    }

    const copia = documento.createElement(etiqueta.toLowerCase());
    const color = etiqueta === "FONT" ? nodo.getAttribute("color") : nodo.style?.color;
    if (color && /^(#[\da-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(color)) {
      if (etiqueta === "FONT") copia.setAttribute("color", color);
      else copia.style.color = color;
    }
    Array.from(nodo.childNodes).forEach((hijo) => {
      const seguro = copiarNodoSeguro(hijo);
      if (seguro) copia.appendChild(seguro);
    });
    return copia;
  }

  const resultado = document.createElement("div");
  Array.from(contenedor.childNodes).forEach((nodo) => {
    const seguro = copiarNodoSeguro(nodo);
    if (seguro) resultado.appendChild(seguro);
  });
  return resultado.innerHTML;
}

async function inicializarEditorReunionAncianos() {
  const formulario = document.getElementById("formReunionAncianos");
  const editor = document.getElementById("editorReunionAncianos");
  const paletaColor = document.getElementById("paletaColorAncianos");
  const botonAplicarColor = document.getElementById("aplicarUltimoColorAncianos");
  if (!formulario || !editor || !paletaColor || !botonAplicarColor) return;

  const hoy = new Date();
  const fechaLocal = [hoy.getFullYear(), String(hoy.getMonth() + 1).padStart(2, "0"), String(hoy.getDate()).padStart(2, "0")].join("-");
  document.getElementById("fechaReunionAncianos").value = fechaLocal;
  const guardarRangoSeleccion = () => {
    const seleccion = window.getSelection();
    if (seleccion?.rangeCount && editor.contains(seleccion.anchorNode)) {
      rangoSeleccionEditorAncianos = seleccion.getRangeAt(0).cloneRange();
    }
  };
  const restaurarRangoSeleccion = () => {
    editor.focus();
    const seleccion = window.getSelection();
    if (rangoSeleccionEditorAncianos && seleccion) {
      seleccion.removeAllRanges();
      seleccion.addRange(rangoSeleccionEditorAncianos);
    }
  };
  let ultimoColorTexto = "#212529";
  let nombreUltimoColorTexto = "Negro";
  const aplicarColorTexto = (color) => {
    restaurarRangoSeleccion();
    document.execCommand("foreColor", false, color);
    guardarRangoSeleccion();
  };
  botonAplicarColor.style.setProperty("--color-subrayado", ultimoColorTexto);
  botonAplicarColor.addEventListener("mousedown", (evento) => evento.preventDefault());
  botonAplicarColor.addEventListener("click", () => aplicarColorTexto(ultimoColorTexto));
  ["keyup", "mouseup", "input"].forEach((evento) => editor.addEventListener(evento, guardarRangoSeleccion));
  document.addEventListener("selectionchange", guardarRangoSeleccion);
  document.querySelectorAll("[data-editor-command]").forEach((boton) => {
    boton.addEventListener("mousedown", (evento) => evento.preventDefault());
    boton.addEventListener("click", () => {
      restaurarRangoSeleccion();
      document.execCommand(boton.dataset.editorCommand, false, null);
      guardarRangoSeleccion();
    });
  });
  paletaColor.querySelectorAll("[data-color-texto]").forEach((boton) => {
    boton.addEventListener("mousedown", (evento) => evento.preventDefault());
    boton.addEventListener("click", () => {
      ultimoColorTexto = boton.dataset.colorTexto;
      nombreUltimoColorTexto = boton.getAttribute("aria-label") || "seleccionado";
      botonAplicarColor.style.setProperty("--color-subrayado", ultimoColorTexto);
      botonAplicarColor.title = `Aplicar el último color seleccionado: ${nombreUltimoColorTexto}`;
      botonAplicarColor.setAttribute("aria-label", botonAplicarColor.title);
      aplicarColorTexto(ultimoColorTexto);
      bootstrap.Dropdown.getOrCreateInstance(
        document.getElementById("botonPaletaColorAncianos")
      ).hide();
    });
  });
  document.getElementById("restaurarBorradorAncianos").addEventListener(
    "click",
    restaurarBorradorReunionAncianos
  );
  document.getElementById("descartarBorradorAncianos").addEventListener(
    "click",
    descartarBorradorReunionAncianos
  );
  ["fechaReunionAncianos", "temaReunionAncianos"].forEach((id) => {
    document.getElementById(id).addEventListener("input", programarGuardadoBorradorReunionAncianos);
    document.getElementById(id).addEventListener("change", programarGuardadoBorradorReunionAncianos);
  });
  editor.addEventListener("input", programarGuardadoBorradorReunionAncianos);
  formulario.addEventListener("submit", guardarReunionAncianos);

  idEdicionReunionAncianos = new URLSearchParams(window.location.search).get("id");
  const usuarioId = auth.currentUser?.uid;
  if (usuarioId) {
    claveBorradorReunionAncianos = `${usuarioId}:${idEdicionReunionAncianos || "nueva"}`;
  }

  if (idEdicionReunionAncianos) {
    document.title = "Editar reunión de ancianos";
    document.getElementById("tituloEditorReunionAncianos").textContent = "Editar reunión de ancianos";
    document.getElementById("guardarReunionAncianos").textContent = "💾 Guardar cambios";
    try {
      const documento = await esperarRespuestaConLimite(
        db.collection(COLECCION_REUNIONES_ANCIANOS).doc(idEdicionReunionAncianos).get(),
        TIEMPO_LIMITE_CARGA_REUNIONES
      );
      if (!documento.exists) {
        mostrarEstadoEditorAncianos("No se encontró la reunión que quieres editar.", "warning");
        document.getElementById("guardarReunionAncianos").disabled = true;
        return;
      }

      const reunion = documento.data();
      document.getElementById("fechaReunionAncianos").value = reunion.fecha || "";
      document.getElementById("temaReunionAncianos").value = reunion.tema || "";
      editor.innerHTML = sanitizarContenidoReunionAncianos(reunion.contenido || "");
    } catch (error) {
      console.error("Error al cargar la reunión de ancianos:", error);
      mostrarEstadoEditorAncianos("No se pudo cargar la reunión. Intenta de nuevo.", "danger");
      document.getElementById("guardarReunionAncianos").disabled = true;
      return;
    }
  }

  await buscarBorradorReunionAncianos();
  editorReunionAncianosListo = true;
}

function abrirBaseBorradoresReuniones() {
  return new Promise((resolver, rechazar) => {
    if (!window.indexedDB) {
      rechazar(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }
    const solicitud = indexedDB.open(DB_BORRADORES_REUNIONES, 1);
    solicitud.onupgradeneeded = () => {
      const base = solicitud.result;
      if (!base.objectStoreNames.contains(STORE_BORRADORES_REUNIONES)) {
        base.createObjectStore(STORE_BORRADORES_REUNIONES, { keyPath: "key" });
      }
    };
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error || new Error("No se pudo abrir el almacenamiento local."));
  });
}

async function guardarBorradorReunionEnNavegador(borrador) {
  const base = await abrirBaseBorradoresReuniones();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(STORE_BORRADORES_REUNIONES, "readwrite");
    transaccion.objectStore(STORE_BORRADORES_REUNIONES).put(borrador);
    transaccion.oncomplete = () => { base.close(); resolver(); };
    transaccion.onerror = () => { base.close(); rechazar(transaccion.error || new Error("No se pudo guardar el borrador.")); };
    transaccion.onabort = () => { base.close(); rechazar(transaccion.error || new Error("Se canceló el guardado del borrador.")); };
  });
}

async function leerBorradorReunionDelNavegador(key) {
  const base = await abrirBaseBorradoresReuniones();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(STORE_BORRADORES_REUNIONES, "readonly");
    const solicitud = transaccion.objectStore(STORE_BORRADORES_REUNIONES).get(key);
    solicitud.onsuccess = () => { base.close(); resolver(solicitud.result || null); };
    solicitud.onerror = () => { base.close(); rechazar(solicitud.error || new Error("No se pudo leer el borrador.")); };
  });
}

async function eliminarBorradorReunionDelNavegador(key) {
  if (!key) return;
  const base = await abrirBaseBorradoresReuniones();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(STORE_BORRADORES_REUNIONES, "readwrite");
    transaccion.objectStore(STORE_BORRADORES_REUNIONES).delete(key);
    transaccion.oncomplete = () => { base.close(); resolver(); };
    transaccion.onerror = () => { base.close(); rechazar(transaccion.error || new Error("No se pudo eliminar el borrador.")); };
    transaccion.onabort = () => { base.close(); rechazar(transaccion.error || new Error("Se canceló la eliminación del borrador.")); };
  });
}

async function buscarBorradorReunionAncianos() {
  if (!claveBorradorReunionAncianos) return;
  try {
    const borrador = await leerBorradorReunionDelNavegador(claveBorradorReunionAncianos);
    if (!borrador) return;
    borradorReunionAncianosPendiente = borrador;
    const fechaGuardado = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(borrador.guardadoEn));
    document.getElementById("textoAvisoBorradorAncianos").textContent = `Hay un borrador guardado en este navegador (${fechaGuardado}). ¿Quieres restaurarlo?`;
    document.getElementById("avisoBorradorAncianos").classList.remove("d-none");
    bloquearEditorMientrasSeDecideBorradorAncianos(true);
  } catch (error) {
    console.warn("No se pudo buscar el borrador local:", error);
    document.getElementById("estadoBorradorAncianos").textContent = "No se pudo revisar el borrador local en este navegador.";
  }
}

function programarGuardadoBorradorReunionAncianos() {
  if (!editorReunionAncianosListo || !claveBorradorReunionAncianos || borradorReunionAncianosPendiente) return;
  const estado = document.getElementById("estadoBorradorAncianos");
  estado.textContent = "Guardando borrador...";
  clearTimeout(temporizadorBorradorReunionAncianos);
  temporizadorBorradorReunionAncianos = setTimeout(guardarBorradorReunionAncianos, 800);
}

async function guardarBorradorReunionAncianos() {
  if (!editorReunionAncianosListo || !claveBorradorReunionAncianos || borradorReunionAncianosPendiente) return;
  const borrador = {
    key: claveBorradorReunionAncianos,
    fecha: document.getElementById("fechaReunionAncianos").value,
    tema: document.getElementById("temaReunionAncianos").value,
    contenido: sanitizarContenidoReunionAncianos(document.getElementById("editorReunionAncianos").innerHTML),
    guardadoEn: new Date().toISOString(),
  };
  try {
    await guardarBorradorReunionEnNavegador(borrador);
    const hora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" }).format(new Date(borrador.guardadoEn));
    document.getElementById("estadoBorradorAncianos").textContent = `Borrador guardado en este navegador a las ${hora}.`;
  } catch (error) {
    console.warn("No se pudo guardar el borrador local:", error);
    document.getElementById("estadoBorradorAncianos").textContent = "No se pudo guardar el borrador en este navegador.";
  }
}

function restaurarBorradorReunionAncianos() {
  const borrador = borradorReunionAncianosPendiente;
  if (!borrador) return;
  document.getElementById("fechaReunionAncianos").value = borrador.fecha || "";
  document.getElementById("temaReunionAncianos").value = borrador.tema || "";
  document.getElementById("editorReunionAncianos").innerHTML = sanitizarContenidoReunionAncianos(borrador.contenido || "");
  borradorReunionAncianosPendiente = null;
  document.getElementById("avisoBorradorAncianos").classList.add("d-none");
  bloquearEditorMientrasSeDecideBorradorAncianos(false);
  document.getElementById("estadoBorradorAncianos").textContent = "Borrador restaurado. Se conservará automáticamente mientras sigas editando.";
}

async function descartarBorradorReunionAncianos() {
  borradorReunionAncianosPendiente = null;
  document.getElementById("avisoBorradorAncianos").classList.add("d-none");
  bloquearEditorMientrasSeDecideBorradorAncianos(false);
  try {
    await eliminarBorradorReunionDelNavegador(claveBorradorReunionAncianos);
    document.getElementById("estadoBorradorAncianos").textContent = "Borrador descartado.";
  } catch (error) {
    console.warn("No se pudo descartar el borrador local:", error);
    document.getElementById("estadoBorradorAncianos").textContent = "No se pudo eliminar el borrador local.";
  }
}

function bloquearEditorMientrasSeDecideBorradorAncianos(bloquear) {
  document.getElementById("fechaReunionAncianos").disabled = bloquear;
  document.getElementById("temaReunionAncianos").disabled = bloquear;
  document.getElementById("editorReunionAncianos").setAttribute("contenteditable", String(!bloquear));
  document.querySelectorAll(".editor-toolbar button").forEach((boton) => { boton.disabled = bloquear; });
  document.getElementById("guardarReunionAncianos").disabled = bloquear;
}

function mostrarEstadoEditorAncianos(mensaje, tipo) {
  const estado = document.getElementById("estadoEditorAncianos");
  estado.textContent = mensaje;
  estado.className = `alert alert-${tipo} mb-3`;
}

async function guardarReunionAncianos(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const botonGuardar = document.getElementById("guardarReunionAncianos");
  const editor = document.getElementById("editorReunionAncianos");
  const fecha = document.getElementById("fechaReunionAncianos").value;
  const tema = document.getElementById("temaReunionAncianos").value.trim();
  const contenido = sanitizarContenidoReunionAncianos(editor.innerHTML);
  const textoPlano = editor.innerText.trim();

  if (!fecha || !tema || !textoPlano) {
    mostrarBanner("Completa la fecha, el tema y el contenido de la reunión.", "warning", false, 4000);
    return;
  }

  botonGuardar.disabled = true;
  botonGuardar.textContent = idEdicionReunionAncianos ? "Guardando cambios..." : "Guardando...";
  try {
    const datos = {
      fecha,
      tema,
      contenido,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoPor: auth.currentUser?.uid || null,
    };
    const escritura = idEdicionReunionAncianos
      ? db.collection(COLECCION_REUNIONES_ANCIANOS).doc(idEdicionReunionAncianos).update(datos)
      : db.collection(COLECCION_REUNIONES_ANCIANOS).add({
          ...datos,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
          creadoPor: auth.currentUser?.uid || null,
        });
    await esperarRespuestaConLimite(escritura, TIEMPO_LIMITE_CARGA_REUNIONES);
    clearTimeout(temporizadorBorradorReunionAncianos);
    try {
      await eliminarBorradorReunionDelNavegador(claveBorradorReunionAncianos);
    } catch (error) {
      console.warn("La reunión se guardó, pero no se pudo eliminar el borrador local:", error);
    }
    window.location.href = "reuniones-ancianos.html";
  } catch (error) {
    console.error("Error al guardar la reunión de ancianos:", error);
    mostrarBanner("No se pudo guardar la reunión. Intenta de nuevo.", "danger", false, 5000);
    botonGuardar.disabled = false;
    botonGuardar.textContent = "💾 Guardar";
  }
}
