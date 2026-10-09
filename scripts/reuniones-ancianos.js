const COLECCION_REUNIONES_ANCIANOS = "reuniones_ancianos";
const TAMANO_PAGINA_REUNIONES_ANCIANOS = 6;
const TIEMPO_LIMITE_CARGA_REUNIONES = 10000;

async function inicializarListaReunionesAncianos() {
  const botonVerMas = document.getElementById("verMasReunionesAncianos");
  if (!botonVerMas) return;
  botonVerMas?.addEventListener("click", cargarMasReunionesAncianos);
  document.getElementById("listaReunionesAncianos")?.addEventListener(
    "click",
    gestionarAccionesReunionAncianos
  );
  await cargarMasReunionesAncianos(true);
}

let ultimoDocumentoReunionAncianos = null;
let hayMasReunionesAncianos = true;
let cargandoReunionesAncianos = false;
let rangoSeleccionEditorAncianos = null;
let idEdicionReunionAncianos = null;

async function cargarMasReunionesAncianos(reiniciar = false) {
  if (cargandoReunionesAncianos || (!hayMasReunionesAncianos && !reiniciar)) return;

  const lista = document.getElementById("listaReunionesAncianos");
  const botonVerMas = document.getElementById("verMasReunionesAncianos");
  if (!lista || !botonVerMas) return;

  if (reiniciar) {
    ultimoDocumentoReunionAncianos = null;
    hayMasReunionesAncianos = true;
    lista.replaceChildren();
  }

  cargandoReunionesAncianos = true;
  botonVerMas.disabled = true;
  botonVerMas.textContent = "Cargando...";

  try {
    let consulta = db
      .collection(COLECCION_REUNIONES_ANCIANOS)
      .orderBy("fecha", "desc")
      .limit(TAMANO_PAGINA_REUNIONES_ANCIANOS);
    if (ultimoDocumentoReunionAncianos) {
      consulta = consulta.startAfter(ultimoDocumentoReunionAncianos);
    }

    const resultado = await esperarRespuestaConLimite(
      consulta.get(),
      TIEMPO_LIMITE_CARGA_REUNIONES
    );
    if (resultado.empty && reiniciar) {
      lista.innerHTML = '<div class="col-12"><div class="alert alert-light border mb-0">Todavía no hay reuniones de ancianos.</div></div>';
    } else {
      resultado.docs.forEach((documento) => {
        lista.insertAdjacentHTML("beforeend", crearTarjetaReunionAncianos(documento));
      });
    }

    if (!resultado.empty) ultimoDocumentoReunionAncianos = resultado.docs.at(-1);
    hayMasReunionesAncianos = resultado.size === TAMANO_PAGINA_REUNIONES_ANCIANOS;
    botonVerMas.classList.toggle("d-none", !hayMasReunionesAncianos);
  } catch (error) {
    console.error("Error al cargar reuniones de ancianos:", error);
    if (reiniciar || lista.childElementCount === 0) {
      lista.innerHTML = '<div class="col-12"><div class="alert alert-danger mb-0">No se pudieron cargar las reuniones. Intenta de nuevo.</div></div>';
    } else {
      mostrarBanner("No se pudieron cargar más reuniones.", "danger", false, 4000);
    }
  } finally {
    cargandoReunionesAncianos = false;
    botonVerMas.disabled = false;
    botonVerMas.textContent = "Ver más";
  }
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
            <button class="btn btn-sm btn-outline-primary" type="button" data-accion-reunion="editar" data-reunion-id="${escaparHtmlReunionAncianos(documento.id)}" aria-label="Editar reunión: ${tema}" title="Editar reunión">&#128393; Editar</button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-accion-reunion="eliminar" data-reunion-id="${escaparHtmlReunionAncianos(documento.id)}" data-reunion-tema="${tema}" data-reunion-fecha="${escaparHtmlReunionAncianos(reunion.fecha || "")}" aria-label="Eliminar reunión: ${tema}" title="Eliminar reunión">&#128465; Eliminar</button>
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

  if (boton.dataset.accionReunion === "eliminar") {
    eliminarReunionAncianos(id, boton);
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
    boton.closest("article")?.remove();
    const lista = document.getElementById("listaReunionesAncianos");
    if (!lista.querySelector("article") && !hayMasReunionesAncianos) {
      lista.innerHTML = '<div class="col-12"><div class="alert alert-light border mb-0">Ya no hay reuniones de ancianos.</div></div>';
    }
    cerrarBanner();
    mostrarBanner("Reunión eliminada.", "success", false, 3000);
  } catch (error) {
    console.error("Error al eliminar la reunión de ancianos:", error);
    boton.disabled = false;
    boton.textContent = "Eliminar";
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
  const selectorColor = document.getElementById("colorTextoAncianos");
  if (!formulario || !editor || !selectorColor) return;

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
  selectorColor.addEventListener("input", () => {
    restaurarRangoSeleccion();
    document.execCommand("foreColor", false, selectorColor.value);
    guardarRangoSeleccion();
  });
  formulario.addEventListener("submit", guardarReunionAncianos);

  idEdicionReunionAncianos = new URLSearchParams(window.location.search).get("id");
  if (!idEdicionReunionAncianos) return;

  document.title = "Editar reunión de ancianos";
  document.getElementById("tituloEditorReunionAncianos").textContent = "Editar reunión de ancianos";
  document.getElementById("guardarReunionAncianos").textContent = "Guardar cambios";
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
  }
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
    window.location.href = "reuniones-ancianos.html";
  } catch (error) {
    console.error("Error al guardar la reunión de ancianos:", error);
    mostrarBanner("No se pudo guardar la reunión. Intenta de nuevo.", "danger", false, 5000);
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";
  }
}
