let accionesHistorial = [];

function obtenerAnioAccion(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  return Number(new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(fecha));
}

async function cargarHistorialCompletoAcciones() {
  const tbody = document.getElementById("tablaHistorialAcciones");
  const selectAnio = document.getElementById("filtroAnioAcciones");
  const buscador = document.getElementById("buscarAccion");
  mostrarBanner("Cargando...", "info", true);
  try {
    const snapshot = await db
      .collection("historialEstadosPublicadores")
      .orderBy("createdAt", "desc")
      .get();
    accionesHistorial = snapshot.docs.map((documento) => {
      const datos = documento.data();
      const fecha = datos.createdAt?.toDate?.() || null;
      return { ...datos, fecha };
    });

    const anios = [...new Set(accionesHistorial
      .map((accion) => obtenerAnioAccion(accion.fecha))
      .filter(Number.isInteger))]
      .sort((a, b) => b - a);
    const anioActual = new Date().getFullYear();
    if (!anios.includes(anioActual)) anios.unshift(anioActual);
    selectAnio.replaceChildren(...anios.map((anio) => new Option(String(anio), String(anio))));
    selectAnio.value = String(anioActual);
    selectAnio.disabled = false;
    buscador.disabled = false;
    selectAnio.addEventListener("change", renderHistorialAcciones);
    buscador.addEventListener("input", renderHistorialAcciones);
    renderHistorialAcciones();
    cerrarBanner();
  } catch (error) {
    console.error("Error al cargar todas las acciones:", error);
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">No se pudo cargar el historial.</td></tr>';
    cerrarBanner();
    mostrarBanner("❌ No se pudo cargar el historial de acciones", "danger");
  }
}

function renderHistorialAcciones() {
  const tbody = document.getElementById("tablaHistorialAcciones");
  const anioSeleccionado = Number(document.getElementById("filtroAnioAcciones").value);
  const consulta = document.getElementById("buscarAccion").value.trim().toLocaleLowerCase("es");
  const formatoFecha = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });
  const filtradas = accionesHistorial.filter((accion) =>
    accion.fecha &&
    obtenerAnioAccion(accion.fecha) === anioSeleccionado &&
    String(accion.descripcion || "").toLocaleLowerCase("es").includes(consulta),
  );

  if (!filtradas.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay acciones que coincidan con los filtros.</td></tr>';
    return;
  }

  tbody.replaceChildren(...filtradas.map((accion) => {
    const fila = document.createElement("tr");
    const fecha = document.createElement("td");
    fecha.textContent = formatoFecha.format(accion.fecha);
    const nombre = document.createElement("td");
    nombre.textContent = accion.nombre || "—";
    const descripcion = document.createElement("td");
    let textoAccion = accion.descripcion || "Acción registrada";
    const prefijoNombre = `${accion.nombre}: `;
    if (accion.nombre && textoAccion.startsWith(prefijoNombre)) {
      textoAccion = textoAccion.slice(prefijoNombre.length);
    }
    descripcion.textContent = textoAccion;
    fila.append(fecha, nombre, descripcion);
    return fila;
  }));
}
