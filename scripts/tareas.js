const COLECCION_TAREAS = "tareas";
const CLAVE_RECORDATORIOS_PROCESADOS = "digitCongRecordatoriosProcesados";
const ESTADOS_TAREA = ["pendiente", "en curso", "realizada", "cancelada"];
let tareasActuales = [];
let recordatoriosBorrador = [];
let notasTareaActual = [];
let temporizadorRecordatorios = null;

async function inicializarTareas() {
  document.getElementById("formTarea")?.addEventListener("submit", guardarTarea);
  document.getElementById("nuevaTarea")?.addEventListener("click", prepararNuevaTarea);
  document.getElementById("agregarRecordatorioTarea")?.addEventListener("click", agregarRecordatorioBorrador);
  document.getElementById("agregarNotaTarea")?.addEventListener("click", agregarNotaTarea);
  document.getElementById("eliminarTarea")?.addEventListener("click", eliminarTareaActual);
  document.getElementById("listaTareas")?.addEventListener("click", gestionarAccionTarjetaTarea);
  ["filtroEstadoTarea", "filtroResponsableTarea", "filtroDesdeTarea", "filtroHastaTarea"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderizarTareas);
  });
  document.getElementById("limpiarFiltrosTarea")?.addEventListener("click", limpiarFiltrosTarea);
  document.getElementById("estadoTarea")?.addEventListener("change", () => {
    document.getElementById("grupoFechaRealizadaTarea").classList.toggle(
      "d-none", document.getElementById("estadoTarea").value !== "realizada"
    );
  });
  document.getElementById("activarNotificaciones")?.addEventListener("click", activarNotificacionesTarea);
  document.getElementById("modalTarea")?.addEventListener("hidden.bs.modal", limpiarFormularioTarea);

  await Promise.all([cargarTareas(), cargarResponsablesTarea()]);
  await actualizarEstadoNotificaciones();
  iniciarComprobacionRecordatorios();
  const tareaEnlace = new URLSearchParams(window.location.search).get("task");
  if (tareaEnlace) prepararEdicionTarea(tareaEnlace);
}

async function cargarTareas() {
  const lista = document.getElementById("listaTareas");
  try {
    const snapshot = await db.collection(COLECCION_TAREAS).get();
    tareasActuales = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    tareasActuales.sort((a, b) => {
      const fechaA = a.fechaPropuesta || "9999-12-31";
      const fechaB = b.fechaPropuesta || "9999-12-31";
      return fechaA.localeCompare(fechaB) || String(b.actualizadoEn || "").localeCompare(String(a.actualizadoEn || ""));
    });
    renderizarTareas();
  } catch (error) {
    console.error("Error al cargar tareas:", error);
    lista.innerHTML = '<div class="col-12"><div class="alert alert-danger">No se pudieron cargar las tareas. Intenta de nuevo.</div></div>';
  }
}

async function cargarResponsablesTarea() {
  const datalist = document.getElementById("listaPublicadoresTarea");
  try {
    const snapshot = await db.collection("publicadores").get();
    const nombres = [...new Set(snapshot.docs.map((doc) => {
      const datos = doc.data();
      return [datos.nombre, datos.apellido].filter(Boolean).join(" ").trim();
    }).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    datalist.replaceChildren(...nombres.map((nombre) => new Option(nombre, nombre)));
  } catch (error) {
    console.warn("No se pudo cargar la lista de publicadores para responsables:", error);
  }
}

function renderizarTareas() {
  const filtroEstado = document.getElementById("filtroEstadoTarea").value;
  const filtroResponsable = document.getElementById("filtroResponsableTarea").value;
  const desde = document.getElementById("filtroDesdeTarea").value;
  const hasta = document.getElementById("filtroHastaTarea").value;
  const filtradas = tareasActuales.filter((tarea) => {
    const fecha = tarea.fechaPropuesta || "";
    return (!filtroEstado || tarea.estado === filtroEstado) &&
      (!filtroResponsable || (tarea.responsables || []).includes(filtroResponsable)) &&
      (!desde || (fecha && fecha >= desde)) && (!hasta || (fecha && fecha <= hasta));
  });

  actualizarOpcionesResponsable();
  document.getElementById("resumenPendientes").textContent = `Pendientes: ${tareasActuales.filter((t) => t.estado === "pendiente").length}`;
  document.getElementById("resumenEnCurso").textContent = `En curso: ${tareasActuales.filter((t) => t.estado === "en curso").length}`;
  document.getElementById("resumenRealizadas").textContent = `Realizadas: ${tareasActuales.filter((t) => t.estado === "realizada").length}`;

  const lista = document.getElementById("listaTareas");
  if (!filtradas.length) {
    lista.innerHTML = `<div class="col-12"><div class="alert alert-light border mb-0">${tareasActuales.length ? "No hay tareas que coincidan con los filtros." : "Todavía no hay tareas. Usa Crear tarea para agregar la primera."}</div></div>`;
    return;
  }
  lista.innerHTML = filtradas.map(crearTarjetaTarea).join("");
}

function actualizarOpcionesResponsable() {
  const selector = document.getElementById("filtroResponsableTarea");
  const seleccionado = selector.value;
  const responsables = [...new Set(tareasActuales.flatMap((t) => t.responsables || []))].sort((a, b) => a.localeCompare(b, "es"));
  selector.replaceChildren(new Option("Todos", ""), ...responsables.map((nombre) => new Option(nombre, nombre)));
  if (responsables.includes(seleccionado)) selector.value = seleccionado;
}

function crearTarjetaTarea(tarea) {
  const estado = ESTADOS_TAREA.includes(tarea.estado) ? tarea.estado : "pendiente";
  const responsables = (tarea.responsables || []).map(escaparTarea).join(", ") || "Sin asignar";
  const fechaPropuesta = tarea.fechaPropuesta ? formatearFechaTarea(tarea.fechaPropuesta) : "Sin fecha propuesta";
  const fechaRealizada = tarea.fechaRealizada ? `<div class="small text-success mt-1">Realizada: ${escaparTarea(formatearFechaTarea(tarea.fechaRealizada))}</div>` : "";
  const recordatorios = (tarea.recordatorios || []).filter((r) => r.fechaHora).map((r) => `<li class="tarea-recordatorio">${escaparTarea(formatearFechaHoraTarea(r.fechaHora))}</li>`).join("");
  const notas = (tarea.notas || []).slice(-3).reverse().map((nota) => `<li class="list-group-item px-0 py-2"><span>${escaparTarea(nota.texto)}</span><div class="small text-muted">${escaparTarea(formatearFechaHoraTarea(nota.fechaHora))}${nota.autor ? ` · ${escaparTarea(nota.autor)}` : ""}</div></li>`).join("");
  const puedeCompletar = estado === "pendiente" || estado === "en curso";
  return `<article class="col-12 col-lg-6"><section class="card card-shadow tarea-card">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div><h2 class="h5 mb-1">${escaparTarea(tarea.titulo || "Sin título")}</h2><span class="badge tarea-estado tarea-estado-${estado.replace(" ", "-")}">${escaparTarea(estado)}</span></div>
      <div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary" type="button" data-tarea-accion="editar" data-tarea-id="${escaparTarea(tarea.id)}">✎ Editar</button><button class="btn btn-sm btn-outline-danger" type="button" data-tarea-accion="eliminar" data-tarea-id="${escaparTarea(tarea.id)}">🗑 Eliminar</button></div>
    </div>
    <div class="card-body">
      ${tarea.descripcion ? `<p class="tarea-descripcion mb-3">${escaparTarea(tarea.descripcion)}</p>` : ""}
      <div class="small"><strong>Responsable(s):</strong> ${responsables}</div><div class="small mt-1"><strong>Fecha propuesta:</strong> ${escaparTarea(fechaPropuesta)}</div>${fechaRealizada}
      ${recordatorios ? `<div class="mt-3"><strong class="small">Recordatorios</strong><ul class="mb-0 ps-3">${recordatorios}</ul></div>` : ""}
      ${notas ? `<details class="mt-3"><summary class="small fw-semibold">Notas recientes</summary><ul class="list-group list-group-flush tarea-notas">${notas}</ul></details>` : ""}
      <div class="d-flex flex-wrap gap-2 mt-3"><button class="btn btn-sm btn-outline-secondary" type="button" data-tarea-accion="nota" data-tarea-id="${escaparTarea(tarea.id)}">＋ Añadir nota</button>${puedeCompletar ? `<button class="btn btn-sm btn-success" type="button" data-tarea-accion="realizada" data-tarea-id="${escaparTarea(tarea.id)}">Marcar realizada</button>` : ""}</div>
    </div></section></article>`;
}

function prepararNuevaTarea() {
  limpiarFormularioTarea();
  document.getElementById("tituloModalTarea").textContent = "Crear tarea";
  document.getElementById("eliminarTarea").classList.add("d-none");
  document.getElementById("seccionNotasTarea").classList.add("d-none");
}

function prepararEdicionTarea(id) {
  const tarea = tareasActuales.find((item) => item.id === id);
  if (!tarea) return;
  limpiarFormularioTarea();
  document.getElementById("tituloModalTarea").textContent = "Editar tarea";
  document.getElementById("idTarea").value = tarea.id;
  document.getElementById("tituloTarea").value = tarea.titulo || "";
  document.getElementById("descripcionTarea").value = tarea.descripcion || "";
  document.getElementById("responsablesTarea").value = (tarea.responsables || []).join(", ");
  document.getElementById("estadoTarea").value = ESTADOS_TAREA.includes(tarea.estado) ? tarea.estado : "pendiente";
  document.getElementById("fechaPropuestaTarea").value = tarea.fechaPropuesta || "";
  document.getElementById("fechaRealizadaTarea").value = tarea.fechaRealizada || "";
  document.getElementById("grupoFechaRealizadaTarea").classList.toggle("d-none", tarea.estado !== "realizada");
  document.getElementById("eliminarTarea").classList.remove("d-none");
  document.getElementById("seccionNotasTarea").classList.remove("d-none");
  document.getElementById("notaSoloAlEditar").classList.add("d-none");
  recordatoriosBorrador = Array.isArray(tarea.recordatorios) ? tarea.recordatorios.map((r) => ({ ...r })) : [];
  notasTareaActual = Array.isArray(tarea.notas) ? tarea.notas.map((n) => ({ ...n })) : [];
  renderizarRecordatoriosBorrador();
  renderizarNotasFormulario();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalTarea")).show();
}

async function guardarTarea(evento) {
  evento.preventDefault();
  const boton = document.getElementById("guardarTarea");
  const id = document.getElementById("idTarea").value;
  const estado = document.getElementById("estadoTarea").value;
  const anterior = tareasActuales.find((t) => t.id === id);
  const fechaRealizadaInput = document.getElementById("fechaRealizadaTarea").value;
  const datos = {
    titulo: document.getElementById("tituloTarea").value.trim(),
    descripcion: document.getElementById("descripcionTarea").value.trim(),
    responsables: [...new Set(document.getElementById("responsablesTarea").value.split(",").map((n) => n.trim()).filter(Boolean))],
    estado,
    fechaPropuesta: document.getElementById("fechaPropuestaTarea").value || null,
    fechaRealizada: estado === "realizada" ? (fechaRealizadaInput || anterior?.fechaRealizada || fechaHoyTarea()) : (anterior?.fechaRealizada || null),
    recordatorios: recordatoriosBorrador,
    notas: anterior?.notas || [],
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: auth.currentUser?.uid || null,
  };
  if (!datos.titulo) return;
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    if (id) {
      await db.collection(COLECCION_TAREAS).doc(id).update(datos);
    } else {
      datos.creadoEn = new Date().toISOString();
      datos.creadoPor = auth.currentUser?.uid || null;
      await db.collection(COLECCION_TAREAS).add(datos);
    }
    await cargarTareas();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalTarea")).hide();
    mostrarBanner("Tarea guardada.", "success", false, 2500);
  } catch (error) {
    console.error("Error al guardar la tarea:", error);
    mostrarBanner("No se pudo guardar la tarea. Intenta de nuevo.", "danger", false, 5000);
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar tarea";
  }
}

function agregarRecordatorioBorrador() {
  const entrada = document.getElementById("nuevoRecordatorioTarea");
  if (!entrada.value) {
    entrada.focus();
    return;
  }
  const fecha = new Date(entrada.value);
  if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
    mostrarBanner("Elige una fecha y hora futuras para el recordatorio.", "warning", false, 3500);
    return;
  }
  recordatoriosBorrador.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, fechaHora: fecha.toISOString() });
  recordatoriosBorrador.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  entrada.value = "";
  renderizarRecordatoriosBorrador();
}

function renderizarRecordatoriosBorrador() {
  const lista = document.getElementById("listaRecordatoriosTarea");
  lista.replaceChildren(...recordatoriosBorrador.map((recordatorio) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center gap-2 px-0 tarea-recordatorio";
    const texto = document.createElement("span");
    texto.textContent = formatearFechaHoraTarea(recordatorio.fechaHora);
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-sm btn-outline-danger";
    boton.textContent = "Quitar";
    boton.setAttribute("aria-label", `Quitar recordatorio ${texto.textContent}`);
    boton.addEventListener("click", () => {
      recordatoriosBorrador = recordatoriosBorrador.filter((item) => item.id !== recordatorio.id);
      renderizarRecordatoriosBorrador();
    });
    li.append(texto, boton);
    return li;
  }));
}

async function agregarNotaTarea() {
  const id = document.getElementById("idTarea").value;
  const entrada = document.getElementById("nuevaNotaTarea");
  const texto = entrada.value.trim();
  if (!id || !texto) return;
  const nota = { id: crypto.randomUUID?.() || `${Date.now()}`, texto, fechaHora: new Date().toISOString(), autor: auth.currentUser?.displayName || auth.currentUser?.email || "Usuario" };
  const boton = document.getElementById("agregarNotaTarea");
  boton.disabled = true;
  try {
    notasTareaActual.push(nota);
    await db.collection(COLECCION_TAREAS).doc(id).update({ notas: notasTareaActual, actualizadoEn: new Date().toISOString() });
    entrada.value = "";
    renderizarNotasFormulario();
    await cargarTareas();
  } catch (error) {
    notasTareaActual = notasTareaActual.filter((item) => item.id !== nota.id);
    console.error("Error al guardar la nota:", error);
    mostrarBanner("No se pudo guardar la nota.", "danger", false, 4000);
  } finally {
    boton.disabled = false;
  }
}

function renderizarNotasFormulario() {
  const lista = document.getElementById("listaNotasTarea");
  lista.replaceChildren(...notasTareaActual.slice().reverse().map((nota) => {
    const li = document.createElement("li");
    li.className = "list-group-item px-0 py-2";
    const texto = document.createElement("div");
    texto.textContent = nota.texto;
    const meta = document.createElement("div");
    meta.className = "small text-muted";
    meta.textContent = `${formatearFechaHoraTarea(nota.fechaHora)}${nota.autor ? ` · ${nota.autor}` : ""}`;
    li.append(texto, meta);
    return li;
  }));
}

function gestionarAccionTarjetaTarea(evento) {
  const boton = evento.target.closest("[data-tarea-accion]");
  if (!boton) return;
  const tarea = tareasActuales.find((item) => item.id === boton.dataset.tareaId);
  if (!tarea) return;
  switch (boton.dataset.tareaAccion) {
    case "editar": prepararEdicionTarea(tarea.id); break;
    case "eliminar": eliminarTarea(tarea); break;
    case "nota": prepararEdicionTarea(tarea.id); document.getElementById("nuevaNotaTarea").focus(); break;
    case "realizada": marcarTareaRealizada(tarea); break;
  }
}

async function marcarTareaRealizada(tarea) {
  const confirmar = await confirmarAccion(`¿Marcar como realizada la tarea “${tarea.titulo}”?`, { titulo: "Completar tarea", textoConfirmar: "Marcar realizada", claseConfirmar: "btn-success" });
  if (!confirmar) return;
  try {
    await db.collection(COLECCION_TAREAS).doc(tarea.id).update({ estado: "realizada", fechaRealizada: fechaHoyTarea(), actualizadoEn: new Date().toISOString() });
    await cargarTareas();
  } catch (error) {
    console.error("Error al completar la tarea:", error);
    mostrarBanner("No se pudo actualizar la tarea.", "danger", false, 4000);
  }
}

async function eliminarTareaActual() {
  const id = document.getElementById("idTarea").value;
  const tarea = tareasActuales.find((item) => item.id === id);
  if (!tarea) return;
  const confirmado = await confirmarAccion(`Se eliminará la tarea “${tarea.titulo}”. Esta acción no se puede deshacer.`, { titulo: "Eliminar tarea", textoConfirmar: "Eliminar", claseConfirmar: "btn-danger" });
  if (!confirmado) return;
  try {
    await db.collection(COLECCION_TAREAS).doc(id).delete();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalTarea")).hide();
    await cargarTareas();
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    mostrarBanner("No se pudo eliminar la tarea.", "danger", false, 4000);
  }
}

async function eliminarTarea(tarea) {
  const confirmado = await confirmarAccion(`Se eliminará la tarea “${tarea.titulo}”. Esta acción no se puede deshacer.`, { titulo: "Eliminar tarea", textoConfirmar: "Eliminar", claseConfirmar: "btn-danger" });
  if (!confirmado) return;
  try {
    await db.collection(COLECCION_TAREAS).doc(tarea.id).delete();
    await cargarTareas();
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    mostrarBanner("No se pudo eliminar la tarea.", "danger", false, 4000);
  }
}

async function activarNotificacionesTarea() {
  if (!("Notification" in window)) {
    mostrarBanner("Este navegador no admite notificaciones del sistema.", "warning", false, 4500);
    return;
  }
  const permiso = await Notification.requestPermission();
  if (permiso === "granted") {
    await registrarServiceWorkerTareas();
    await actualizarEstadoNotificaciones();
    comprobarRecordatoriosTarea();
  } else {
    mostrarBanner("No se concedió permiso para mostrar notificaciones.", "warning", false, 4500);
    await actualizarEstadoNotificaciones();
  }
}

async function registrarServiceWorkerTareas() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return null;
  try {
    return await navigator.serviceWorker.register("service-worker.js");
  } catch (error) {
    console.warn("No se pudo registrar el service worker:", error);
    return null;
  }
}

async function actualizarEstadoNotificaciones() {
  const boton = document.getElementById("activarNotificaciones");
  const texto = document.getElementById("textoEstadoNotificaciones");
  if (!("Notification" in window)) {
    texto.textContent = "Este navegador no admite notificaciones del sistema.";
    boton.classList.add("d-none");
    return;
  }
  if (Notification.permission === "granted") {
    await registrarServiceWorkerTareas();
    texto.textContent = "Notificaciones activas en este dispositivo. Los avisos se muestran mientras la app está abierta.";
    boton.textContent = "Notificaciones activas";
    boton.disabled = true;
    return;
  }
  if (Notification.permission === "denied") {
    texto.textContent = "Las notificaciones están bloqueadas en el navegador. Puedes habilitarlas en sus permisos del sitio.";
    boton.textContent = "Permiso bloqueado";
    boton.disabled = true;
  }
}

function iniciarComprobacionRecordatorios() {
  if (temporizadorRecordatorios) clearInterval(temporizadorRecordatorios);
  comprobarRecordatoriosTarea();
  temporizadorRecordatorios = setInterval(comprobarRecordatoriosTarea, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") comprobarRecordatoriosTarea();
  });
}

async function comprobarRecordatoriosTarea() {
  if (Notification.permission !== "granted") return;
  const ahora = Date.now();
  const procesados = obtenerRecordatoriosProcesados();
  const pendientes = tareasActuales.flatMap((tarea) => (tarea.recordatorios || []).map((recordatorio) => ({ tarea, recordatorio })))
    .filter(({ tarea, recordatorio }) => !recordatorio.enviadoEn && new Date(recordatorio.fechaHora).getTime() <= ahora && !procesados.has(`${tarea.id}:${recordatorio.id}`));
  if (!pendientes.length) return;
  const registro = await registrarServiceWorkerTareas();
  for (const { tarea, recordatorio } of pendientes) {
    const titulo = `Recordatorio: ${tarea.titulo || "Tarea"}`;
    const opciones = { body: recordatorio.mensaje || `Responsable: ${(tarea.responsables || []).join(", ") || "Sin asignar"}`, icon: "assets/icon-192.png", badge: "assets/icon-192.png", tag: `tarea-${tarea.id}-${recordatorio.id}`, data: { url: `tareas.html?task=${encodeURIComponent(tarea.id)}` } };
    try {
      if (registro?.showNotification) await registro.showNotification(titulo, opciones);
      else new Notification(titulo, opciones);
      procesados.add(`${tarea.id}:${recordatorio.id}`);
      guardarRecordatoriosProcesados(procesados);
      const actualizada = { ...recordatorio, enviadoEn: new Date().toISOString() };
      const recordatorios = (tarea.recordatorios || []).map((r) => r.id === recordatorio.id ? actualizada : r);
      await db.collection(COLECCION_TAREAS).doc(tarea.id).update({ recordatorios });
      tarea.recordatorios = recordatorios;
    } catch (error) {
      console.warn("No se pudo mostrar el recordatorio:", error);
    }
  }
  renderizarTareas();
}

function obtenerRecordatoriosProcesados() {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_RECORDATORIOS_PROCESADOS) || "[]")); }
  catch { return new Set(); }
}
function guardarRecordatoriosProcesados(procesados) {
  try { localStorage.setItem(CLAVE_RECORDATORIOS_PROCESADOS, JSON.stringify([...procesados].slice(-300))); }
  catch { /* El navegador puede bloquear el almacenamiento. */ }
}

function limpiarFiltrosTarea() {
  ["filtroEstadoTarea", "filtroResponsableTarea", "filtroDesdeTarea", "filtroHastaTarea"].forEach((id) => { document.getElementById(id).value = ""; });
  renderizarTareas();
}
function limpiarFormularioTarea() {
  document.getElementById("formTarea")?.reset();
  document.getElementById("idTarea").value = "";
  document.getElementById("grupoFechaRealizadaTarea").classList.add("d-none");
  document.getElementById("eliminarTarea").classList.add("d-none");
  document.getElementById("seccionNotasTarea").classList.remove("d-none");
  document.getElementById("notaSoloAlEditar").classList.remove("d-none");
  recordatoriosBorrador = [];
  notasTareaActual = [];
  renderizarRecordatoriosBorrador();
  renderizarNotasFormulario();
}
function fechaHoyTarea() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}
function formatearFechaTarea(fecha) {
  const valor = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(valor.getTime()) ? fecha : new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(valor);
}
function formatearFechaHoraTarea(fecha) {
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(valor);
}
function escaparTarea(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
}
