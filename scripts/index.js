document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarMenuYScripts();

    const config = await cargarConfiguracionGlobal();

    if (config) {
      document.querySelector("h1").innerText =
        `👋 Bienvenido a Cong. ${config.nombreCongregacion}`;
    }

    await cargarTotalesPublicadores();
    await cargarHistorialEstadosPublicadores();
    await cargarTareasProgramadas();
  } catch (error) {
    console.error("Error al inicializar la página principal:", error);
  } finally {
    cerrarBanner();
  }
});

/**
 * Carga los totales de publicadores por categoría.
 */
async function cargarTotalesPublicadores() {
  const tbody = document.getElementById("totalesPublicadores");

  try {
    const publicadores = await obtenerDataColeccion("publicadores");

    const registros = publicadores.filter((pub) => Number(pub.grupo) > 0);

    const activos = registros.filter(
      (pub) => !(pub.estadoEspiritual || []).includes("Inactivo"),
    );

    const inactivos = registros.filter((pub) =>
      (pub.estadoEspiritual || []).includes("Inactivo"),
    );

    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${ahora.getMonth() + 1}`;

    const totales = [
      ["Publicadores activos", activos.length, "🟢", "total-activos"],
      ["Publicadores inactivos", inactivos.length, "⚫", "total-inactivos"],
      [
        "Ancianos",
        activos.filter((pub) =>
          (pub.estadoEspiritual || []).includes("Anciano"),
        ).length,
        "🟠",
        "total-ancianos",
      ],
      [
        "Siervos ministeriales",
        activos.filter((pub) =>
          (pub.estadoEspiritual || []).includes("Siervo ministerial"),
        ).length,
        "🔵",
        "total-siervos",
      ],
      [
        "Precursores regulares",
        activos.filter((pub) =>
          (pub.estadoEspiritual || []).includes("Precursor regular"),
        ).length,
        "🔴",
        "total-regulares",
      ],
      [
        "Precursores auxiliares indefinidos",
        activos.filter((pub) =>
          (pub.estadoEspiritual || []).includes("Precursor auxiliar"),
        ).length,
        "🟡",
        "total-auxiliares",
      ],
      [
        "Precursores auxiliares este mes",
        activos.filter((pub) => (pub.mesesAuxiliar || []).includes(mesActual))
          .length,
        "🟢",
        "total-auxiliares-mes",
      ],
    ];

    tbody.replaceChildren(
      ...totales.map(([categoria, total, icono, estilo]) => {
        const fila = document.createElement("tr");
        fila.className = "fila-total";

        const nombre = document.createElement("th");
        nombre.scope = "row";

        const indicador = document.createElement("span");
        indicador.className = `indicador-total ${estilo}`;
        indicador.setAttribute("aria-hidden", "true");

        const icon = document.createElement("span");
        icon.className = "icono-total";
        icon.textContent = icono;

        const etiqueta = document.createElement("span");
        etiqueta.textContent = categoria;

        indicador.append(icon);
        nombre.append(indicador, etiqueta);

        const valor = document.createElement("td");
        valor.className = "text-end";

        const cifra = document.createElement("span");
        cifra.className = `cifra-total ${estilo}`;
        cifra.textContent = total;

        valor.appendChild(cifra);
        fila.append(nombre, valor);

        return fila;
      }),
    );
  } catch (error) {
    console.error("Error al cargar totales de publicadores:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-danger">
          No se pudieron cargar los totales.
        </td>
      </tr>
    `;
  }
}

/**
 * Carga las últimas acciones de los publicadores (5 en móvil y 30 en pantallas mayores).
 */
async function cargarHistorialEstadosPublicadores() {
  const tbody = document.getElementById("historialEstadosPublicadores");

  try {
    const snapshot = await db
      .collection("historialEstadosPublicadores")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="text-center text-muted">
            Aún no hay cambios de estado registrados.
          </td>
        </tr>
      `;
      return;
    }

    const formatoFecha = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Bogota",
    });

    const limiteVisible = window.matchMedia("(max-width: 767.98px)").matches ? 5 : 30;
    tbody.replaceChildren(
      ...snapshot.docs.slice(0, limiteVisible).map((documento) => {
        const registro = documento.data();
        const fila = document.createElement("tr");

        const fecha = document.createElement("td");
        const instante = registro.createdAt?.toDate?.();

        fecha.textContent = instante ? formatoFecha.format(instante) : "—";

        const accion = document.createElement("td");
        accion.textContent = registro.descripcion || "Cambio de estado";

        fila.append(fecha, accion);

        return fila;
      }),
    );
  } catch (error) {
    console.error("Error al cargar el historial de estados:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-danger">
          No se pudo cargar el historial.
        </td>
      </tr>
    `;
  }
}

/**
 * Carga las últimas tareas en la tarjeta principal (5 en móvil y 30 en pantallas mayores).
 * Colección de Firestore: tareas.
 */
async function cargarTareasProgramadas() {
  const tbody = document.getElementById("listaTareasProgramadas");

  try {
    const snapshot = await db
      .collection("tareas")
      .orderBy("actualizadoEn", "desc")
      .limit(30)
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="text-center text-muted">
            No hay tareas programadas.
          </td>
        </tr>
      `;
      return;
    }

    const tareas = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));
    tareas.sort(compararTareasPorVencimientoIndex);

    const limiteVisible = window.matchMedia("(max-width: 767.98px)").matches ? 5 : 30;
    const ultimasTareas = tareas.slice(0, limiteVisible);

    tbody.replaceChildren(
      ...ultimasTareas.map((tarea) => {
        const fila = document.createElement("tr");

        // Título y responsables en la misma columna.
        const celdaTitulo = document.createElement("td");
        const titulo = document.createElement("div");
        titulo.className = "fw-semibold";
        titulo.textContent = tarea.titulo || "Sin título";

        const responsables = Array.isArray(tarea.responsables)
          ? tarea.responsables.filter(Boolean).join(", ")
          : tarea.responsables || "";
        const detalleResponsables = document.createElement("small");
        detalleResponsables.className = "d-block text-body-secondary fw-normal";
        detalleResponsables.textContent = `Responsable(s): ${responsables || "Sin asignar"}`;
        celdaTitulo.append(titulo, detalleResponsables);

        // Fecha propuesta y estado, agrupados en la misma columna.
        const celdaFecha = document.createElement("td");
        const textoFecha = document.createElement("div");

        if (tarea.fechaPropuesta) {
          const valor = String(tarea.fechaPropuesta);
          const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
          const fecha = partes
            ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), Number(partes[4] || 0), Number(partes[5] || 0))
            : new Date(valor);
          const formatoFecha = new Intl.DateTimeFormat("es-CO", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          textoFecha.textContent = Number.isNaN(fecha.getTime())
            ? valor
            : formatoFecha.format(fecha);
        } else {
          textoFecha.textContent = "Sin fecha";
        }
        celdaFecha.appendChild(textoFecha);

        // Estado
        const estadosValidos = [
          "pendiente",
          "en curso",
          "retrasada",
          "realizada",
          "cancelada",
        ];

        const estado = estadosValidos.includes(tarea.estado)
          ? tarea.estado
          : "pendiente";

        const insignia = document.createElement("span");
        const estilosEstado = {
          pendiente: "text-bg-warning",
          "en curso": "text-bg-primary",
          retrasada: "tarea-estado-retrasada",
          realizada: "text-bg-success",
          cancelada: "text-bg-secondary",
        };
        insignia.className = `badge d-block mt-1 ${estilosEstado[estado]}`;
        insignia.textContent = estado.charAt(0).toUpperCase() + estado.slice(1);

        celdaFecha.appendChild(insignia);

        fila.append(celdaTitulo, celdaFecha);

        return fila;
      }),
    );
  } catch (error) {
    console.error("Error al cargar las tareas programadas:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-danger">
          No se pudieron cargar las tareas programadas.
        </td>
      </tr>
    `;
  }
}

function compararTareasPorVencimientoIndex(a, b) {
  const aPendiente = a.estado === "pendiente";
  const bPendiente = b.estado === "pendiente";
  if (aPendiente !== bPendiente) return aPendiente ? -1 : 1;
  const fechaA = a.fechaPropuesta || "9999-12-31";
  const fechaB = b.fechaPropuesta || "9999-12-31";
  return fechaA.localeCompare(fechaB) || String(b.actualizadoEn || "").localeCompare(String(a.actualizadoEn || ""));
}
