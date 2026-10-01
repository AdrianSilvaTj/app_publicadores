// Globales
let publicadorSel = null;
let ventanaTarjetas = null;

async function iniciarPublicadores() {
  const config = await cargarConfiguracionGlobal();
  if (!config) {
    mostrarBanner("⚠️ Primero configura la congregación", "warning", false, 4000);
    return;
  }
  const grupos = Number(config.cantidadGrupos) || 0;
  const filtroGrupo = document.getElementById("filtroGrupoServicio");
  filtroGrupo.replaceChildren(new Option("Todos", "todos"));
  for (let grupo = 1; grupo <= grupos; grupo++) {
    filtroGrupo.add(new Option(`Grupo ${grupo}`, String(grupo)));
  }
  filtroGrupo.addEventListener("change", () => renderPublicadoresPorGrupo(grupos, false));

  // 📅 Ir al mes anterior al actual
  const hoy = new Date();
  let mes = hoy.getMonth() + 1; // 1-12
  let anio = hoy.getFullYear();

  mes--; // mes anterior

  if (mes === 0) {
    mes = 12;
    anio--;
  }

  const selectMes = document.getElementById("mes");
  const selectAnio = document.getElementById("anio");

  document.getElementById("tablasGrupos").addEventListener("input", (event) => {
    if (!event.target.matches(".svc-horas")) return;
    const participo = event.target.closest("tr")?.querySelector(".svc-participo");
    if (participo) participo.checked = Number(event.target.value) >= 1;
  });

  if (selectMes && selectAnio) {
    selectMes.value = mes;
    selectAnio.value = anio;
  }

  restaurarFiltrosVista();

  // 🔄 Render inicial
  await renderPublicadoresPorGrupo(grupos);

  // 🔁 Eventos
  document.getElementById("anio").addEventListener("change", () => {
    localStorage.removeItem("firebase_servicio");
    renderPublicadoresPorGrupo(grupos);
  });

  document.getElementById("mes").addEventListener("change", () => {
    localStorage.removeItem("firebase_servicio");
    renderPublicadoresPorGrupo(grupos);
  });

  setTimeout(() => {
    const groupSelect = document.getElementById("grupo-descarga");
    groupSelect.innerHTML = "";

    for (let grupo = 1; grupo <= grupos; grupo++) {
      option = document.createElement("option");
      option.value = grupo;
      option.textContent = grupo;
      groupSelect.appendChild(option);
    }
    const selectAnioDesc = document.getElementById("anio-descarga");
    selectAnioDesc.value = anio;
  }, 300);
}

function getClaseFila(pub, grupo) {
  let icons = "";
  const mes = document.getElementById("mes").value;
  const anio = document.getElementById("anio").value;
  let fecha = `${anio}-${mes}`;
  if ((pub.estadoEspiritual || []).includes("Precursor regular")) icons += "🔴";
  if ((pub.estadoEspiritual || []).includes("Precursor auxiliar"))
    icons += "🟡";
  if ((pub.mesesAuxiliar || []).includes(fecha))
    icons += "🟢";
  if ((pub.estadoEspiritual || []).includes("Inactivo")) icons += "⚫";
  return icons;
}

function editarFilaServicio(btn) {
  const tr = btn.closest("tr");

  tr.querySelectorAll("input").forEach((input) => {
    if (input.type === "checkbox") {
      input.disabled = input.matches(".svc-auxiliar") && input.dataset.precursor !== "true";
    } else {
      if (input.matches(".svc-horas")) {
        input.disabled = input.dataset.precursor !== "true";
        input.readOnly = false;
      } else {
        input.readOnly = false;
      }
    }
  });
}

function renderFilaServicio(pub, index, grupoNumero, grupoPubsServicio) {
  const id = pub.id;
  const iconos = getClaseFila(pub, grupoNumero);
  const registro =
    grupoPubsServicio.find((reg) => reg.publicadorId == id) || {};
  const nombre = pub.nombre || "Sin nombre";
  const fechaServicio = `${document.getElementById("anio").value}-${document.getElementById("mes").value}`;
  const estados = pub.estadoEspiritual || [];
  const esPrecursor = esPrecursorConHorasObligatorias(
    pub,
    Number(document.getElementById("mes").value),
    Number(document.getElementById("anio").value),
  );
  const esAuxiliar = estados.includes("Precursor auxiliar") ||
    (pub.mesesAuxiliar || []).includes(fechaServicio);

  const tieneRegistro = Object.keys(registro).length > 0;

  return `
  <tr data-id="${id}" data-grupo="${grupoNumero}">
    <td class="servicio-nombre">
      <span style="width:200px; cursor:pointer" onclick="verTarjetaPublicador('${id}')">
        ${index + 1}. ${iconos} ${escaparHtml(nombre)}
      </span>
    </td>

    <td class="text-center" data-label="Participó">
      <input
        type="checkbox"
        class="form-check-input svc-participo"
        ${registro.participo ? "checked" : ""}
        ${tieneRegistro ? "disabled" : ""}
      >
    </td>

    <td data-label="Cursos">
      <input
        type="number"
        class="form-control form-control-sm svc-cursos"
        style="width:60px"
        value="${escaparHtml(registro.cursos ?? "")}"
        ${tieneRegistro ? "readonly" : ""}
      >
    </td>

    <td class="text-center" data-label="Auxiliar">
      <input
        type="checkbox"
        class="form-check-input svc-auxiliar"
        data-precursor="${esPrecursor}"
        ${registro.auxiliar || esAuxiliar ? "checked" : ""}
        ${tieneRegistro || !esPrecursor ? "disabled" : ""}
      >
    </td>

    <td data-label="Horas">
      <input
        type="number"
        class="form-control form-control-sm svc-horas"
        data-precursor="${esPrecursor}"
        style="width:60px"
        value="${escaparHtml(registro.horas ?? "")}"
        ${tieneRegistro ? "readonly" : ""}
        ${!esPrecursor ? "disabled" : ""}
      >
    </td>

    <td data-label="Notas">
      <input
        type="text"
        class="form-control form-control-sm svc-notas"
        style="width:200px"
        value="${escaparHtml(registro.notas ?? "")}"
        ${tieneRegistro ? "readonly" : ""}
      >
    </td>

    <td class="servicio-acciones">
      <div class="dropdown d-inline ms-1">
        <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
        <ul class="dropdown-menu">
          <li>
            <button
              class="dropdown-item"
              onclick="editarFilaServicio(this)"
            >
              ✏️ Editar
            </button>
          </li>
          <li>
            <button
              class="dropdown-item"
              onclick="verTarjetaPublicador('${id}')"
            >
              👁 Ver tarjeta
            </button>
          </li>
        </ul>
      </div>
    </td>
  </tr>
  `;
}

async function renderPublicadoresPorGrupo(grupos, actualizarDatos = true) {
  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);
  const contenedor = document.getElementById("tablasGrupos");
  contenedor.innerHTML = ""; // Limpiar contenido anterior
  let publicadoresCache = localStorage.getItem("firebase_publicadores");
  let publicadores = [];
  let pubsServicio = [];
  mostrarBanner("Cargando información...", "info", true);
  if (actualizarDatos) {
    const colecciones = [{ nombre: "servicio", filtros: { mes, anio } }];
    if (!publicadoresCache) colecciones.push("publicadores");
    await actualizarColecciones(colecciones, true);
  }
  const pubsServicioCache = localStorage.getItem("firebase_servicio");
  !publicadoresCache &&
    (publicadoresCache = localStorage.getItem("firebase_publicadores"));
  if (publicadoresCache && pubsServicioCache) {
    publicadores = JSON.parse(publicadoresCache);
    pubsServicio = JSON.parse(pubsServicioCache);
    console.log("✅ Datos cargados desde localStorage.");
  }

  const filtroGrupo = document.getElementById("filtroGrupoServicio")?.value || "todos";
  const gruposVisibles = filtroGrupo === "todos"
    ? Array.from({ length: grupos }, (_, index) => index + 1)
    : [Number(filtroGrupo)].filter((grupo) => grupo > 0);

  for (const g of gruposVisibles) {
    const grupoPublicadores = ordenarPublicadoresGrupo(
      publicadores.filter((p) => Number(p.grupo) === g),
      g,
    );
    let grupoPubsServicio = pubsServicio.filter((p) => Number(p.grupo) === g);
    const tablaId = `tablaGrupo${g}`;

    const card = document.createElement("div");
    card.className = "col-12";

    card.innerHTML = `
      <div class="card card-shadow">
        <div class="card-header d-flex justify-content-between align-items-center group-header-color">
          <strong>Grupo ${g}</strong>
          <div>
            <button class="btn btn-sm btn-outline-primary" onclick="guardarServicioGrupo(${g})">
              💾 Guardar
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="limpiarServicioGrupo(${g})">
              🧹 Limpiar
            </button>
          </div>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive servicio-tabla-wrap">
            <table class="table table-hover mb-0 tabla-servicio-grupo" id="${tablaId}">
            <thead class="table-light text-center">
              <tr>
                <th class="pe-0">Nombre</th>
                <th class="font-10 pe-0">Participación<br>en el ministerio</th>
                <th class="font-10 pe-0">Cursos<br>bíblicos</th>
                <th class="font-10 pe-0">Precursor<br>auxiliar</th>
                <th class="font-10 pe-0">
                  Horas<br>
                  <small class="text-muted">
                    Si es precursor o<br>misionero que sirve<br>en el campo
                  </small>
                </th>
                <th class="pe-0">Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${grupoPublicadores
                .map((pub, index) =>
                  renderFilaServicio(pub, index, g, grupoPubsServicio),
                )
                .join("")}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  }

  // 👇 RESTAURAR POSICIÓN
  restaurarPosicionVista();
  cerrarBanner();
  mostrarPrecursoresSinHoras(gruposVisibles, publicadores, pubsServicio, mes, anio);
}

function esPrecursorConHorasObligatorias(publicador, mes, anio) {
  const estados = publicador.estadoEspiritual || [];
  const fecha = `${anio}-${mes}`;
  return estados.includes("Precursor regular") ||
    estados.includes("Precursor auxiliar") ||
    (publicador.mesesAuxiliar || []).includes(fecha);
}

function mostrarPrecursoresSinHoras(grupos, publicadores, servicio, mes, anio) {
  const avisos = [];

  grupos.forEach((grupo) => {
    const registrosGrupo = servicio.filter((registro) => Number(registro.grupo) === grupo);
    if (registrosGrupo.length === 0) return;

    const precursoresPendientes = publicadores.filter((publicador) => {
      if (Number(publicador.grupo) !== grupo || !esPrecursorConHorasObligatorias(publicador, mes, anio)) {
        return false;
      }
      const registro = registrosGrupo.find((item) => item.publicadorId === publicador.id);
      return !registro || !(Number(registro.horas) > 0);
    });

    if (precursoresPendientes.length > 0) {
      const nombres = precursoresPendientes
        .map((publicador) => publicador.nombre || "Sin nombre")
        .join(", ");
      avisos.push(`Grupo ${grupo}: ${nombres}`);
    }
  });

  if (avisos.length > 0) {
    mostrarAvisoPrecursores(
      `Faltan horas por agregar a estos precursores:\n${avisos.join("\n")}`,
    );
  }
}

function mostrarAvisoPrecursores(mensaje) {
  mostrarAvisoPersistente(`⚠️ ${mensaje}`, "warning");
}

async function actualizarYRecargar() {
  await actualizarColecciones(["publicadores", "servicio"]);
  const config = await cargarConfiguracionGlobal();
  const grupos = config.cantidadGrupos;
  renderPublicadoresPorGrupo(grupos);
}

async function guardarServicioGrupo(grupo) {
  const publicadores = await obtenerDataColeccion("publicadores");
  const filas = document.querySelectorAll(`#tablaGrupo${grupo} tbody tr`);

  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);

  if (!mes || !anio) {
    return alert("Selecciona mes y año");
  }

  mostrarBanner("Guardando...", "info", true);

  const batch = db.batch();
  const pendientes = [];
  let registrosValidos = 0;

  filas.forEach((tr) => {
    const publicadorId = tr.dataset.id;
    const publicador = publicadores.find((pub) => pub.id == publicadorId);
    const docId = `${publicadorId}_${grupo}_${anio}_${mes}`;
    const ref = db.collection("servicio").doc(docId);

    let data = {
      publicadorId,
      grupo,
      mes,
      anio,
      participo: tr.querySelector(".svc-participo").checked,
      cursos: Number(tr.querySelector(".svc-cursos").value) || 0,
      auxiliar: tr.querySelector(".svc-auxiliar").checked,
      horas: Number(tr.querySelector(".svc-horas").value) || 0,
      notas: (tr.querySelector(".svc-notas").value || "").trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (
      publicador &&
      esPrecursorConHorasObligatorias(publicador, mes, anio) &&
      data.horas <= 0
    ) {
      pendientes.push(publicador.nombre || "Sin nombre");
      return;
    }

    // correcciones
    if (data.participo) {
      data.notas = data.notas
        .replace("No participó", "")
        .replace("no participó", "")
        .replace("No participo", "")
        .replace("no participo", "");
      data.notas === '.' && (data.notas = '');
    }
    if (data.horas >= 1) data.participo = true;
    else if (publicador && esPrecursorConHorasObligatorias(publicador, mes, anio)) {
      data.participo = false;
    } else if (data.cursos > 0) {
      data.participo = true;
    }
    (data.horas > 0 && !(publicador?.estadoEspiritual || []).includes("Precursor regular")) && (data.auxiliar = true);
    if (!data.participo && !data.notas.toLowerCase().includes("no participó")) {
      data.notas += (data.notas ? " " : "") + "No participó.";
    }
    if (
      (publicador?.estadoEspiritual || []).includes("Inactivo") &&
      !data.notas.toLowerCase().includes("inactivo")
    ) {
      data.notas += (data.notas ? " " : "") + "Inactivo.";
    }

    batch.set(ref, data, { merge: true });
    registrosValidos++;
  });

  if (registrosValidos > 0) {
    await batch.commit();
    await actualizarColecciones([{ nombre: "servicio", filtros: { mes, anio } }], true);
  }

  const config = await cargarConfiguracionGlobal();
  await renderPublicadoresPorGrupo(Number(config?.cantidadGrupos) || 0, false);
  if (pendientes.length > 0) {
    const nombresPendientes = pendientes.join(", ");
    const guardados = registrosValidos > 0
      ? `Se guardaron los demás registros (${registrosValidos}).\n`
      : "No se guardó ningún registro.\n";
    mostrarAvisoPrecursores(
      `${guardados}Agrega las horas para estos precursores: ${nombresPendientes}`,
    );
  } else {
    mostrarBanner("✅ Servicio guardado correctamente", "success", false, 3000);
  }
}

async function limpiarServicioGrupo(grupo) {
  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);

  if (!mes || !anio) {
    return alert("Selecciona mes y año");
  }

  const confirmar = await confirmarAccion(
    `⚠️ ¿Estás seguro?\n\nSe eliminarán TODOS los registros de servicio:\n` +
      `Grupo ${grupo} - ${mes}/${anio}\n\nEsta acción no se puede deshacer.`,
    {
      titulo: "Eliminar registros de servicio",
      textoConfirmar: "Eliminar",
      claseConfirmar: "btn-danger",
    },
  );

  if (!confirmar) return;

  try {
    mostrarBanner("Limpiando registros...", "info", true);

    // 🔍 Traer registros a eliminar
    const snapshot = await db
      .collection("servicio")
      .where("grupo", "==", grupo)
      .where("mes", "==", mes)
      .where("anio", "==", anio)
      .get();

    if (snapshot.empty) {
      cerrarBanner();
      return mostrarBanner(
        "ℹ️ No hay registros para limpiar",
        "info",
        false,
        3000,
      );
    }

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // 🧹 Limpiar cache local
    localStorage.removeItem("firebase_servicio");

    cerrarBanner();
    mostrarBanner(
      "🧹 Registros de servicio eliminados correctamente",
      "success",
      false,
      3000,
    );

    await actualizarColecciones([
      { nombre: "servicio", filtros: { mes, anio } },
    ]);
  } catch (error) {
    console.error("Error limpiando servicio:", error);
    cerrarBanner();
    mostrarBanner("❌ Error al limpiar los registros de servicio", "danger");
  }
}

const buscarPublicador = () => {
  const buscador = document.getElementById("buscadorPublicador");
  const q = buscador.value.trim().toLowerCase();

  if (!q) return;

  let hit = false;
  let encontrado = false;

  document.querySelectorAll("#tablasGrupos tbody tr").forEach((tr) => {
    // 👇 el nombre está en la primera columna
    const nombre =
      tr
        .querySelector("td:first-child span")
        ?.textContent.toLowerCase()
        .trim() || "";

    if (nombre.includes(q)) {
      tr.classList.add("resaltado");
      encontrado = true;

      if (!hit) {
        tr.scrollIntoView({ behavior: "smooth", block: "center" });
        hit = true;
      }
    } else {
      tr.classList.remove("resaltado");
    }
  });

  if (!encontrado) {
    mostrarBanner("❌ No se encontró el publicador", "danger", false, 3000);
  }
};

function limpiarBusquedaPublicador() {
  const input = document.getElementById("buscadorPublicador");
  input.value = "";

  // Quitar resaltado de todas las filas
  document.querySelectorAll("#tablasGrupos tbody tr").forEach((tr) => {
    tr.classList.remove("resaltado");
  });
}

async function descargarListadoPublicadores() {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    PageOrientation,
  } = window.docx;

  const cache = JSON.parse(localStorage.getItem("firebase_publicadores")) || [];
  if (cache.length === 0) return alert("⚠️ No hay publicadores en memoria.");

  // Agrupar por grupo
  const grupos = {};
  cache.forEach((pub) => {
    const grupo = Number(pub.grupo) || 0;
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(pub);
  });

  const contenido = [];

  // Leyenda
  contenido.push(
    new Paragraph({
      text: "📌 Leyenda de iconos:",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph(`🔶 Superintendente de grupo
      🔷 Auxiliar de grupo
      🔴 Precursor regular
      🟠 Anciano
      🔵 Siervo ministerial
      ⚫ Inactivo
      🟣 No bautizado`),
    new Paragraph(" "),
  );

  // Grupos del 1 al 9
  for (let g = 1; g <= 9; g++) {
    const lista = grupos[g];
    if (!lista || lista.length === 0) continue;

    const ordenados = ordenarPublicadoresGrupo(lista, g); // ✅ tu función

    contenido.push(
      new Paragraph({
        text: `Grupo ${g}`,
        heading: HeadingLevel.HEADING_2,
      }),
      ...ordenados.map(
        (pub) =>
          new Paragraph({
            children: [
              new TextRun(`${pub.nombre || ""} ${getClaseFila(pub, g)}`),
            ],
          }),
      ),
      new Paragraph(" "),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 360,
              bottom: 360,
              left: 360,
              right: 360,
            },
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
          },
        },
        children: contenido,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Listado_Publicadores_${new Date()
    .toISOString()
    .slice(0, 10)}.docx`;
  link.click();
}

function actualizar() {
  actualizarColecciones(["publicadores", "servicio"]);
}

async function renderTarjetaPublicador(publicadorId, anioServicio) {
  mostrarBanner("Procesando...", "info", true);
  const isChecked = (cond) => (cond ? "checked" : "");

  const publicadores =
    JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

  const servicios = await consultarFirebase("servicio", {
    publicadorId,
    anio: [anioServicio, anioServicio - 1],
  });

  const pub = (publicadorSel = publicadores.find((p) => p.id === publicadorId));
  if (!pub) return "<p>Publicador no encontrado</p>";

  // 🔹 Definición del año de servicio (septiembre → agosto)
  const mesesServicio = [
    { nombre: "Septiembre", mes: 9, anio: anioServicio - 1 },
    { nombre: "Octubre", mes: 10, anio: anioServicio - 1 },
    { nombre: "Noviembre", mes: 11, anio: anioServicio - 1 },
    { nombre: "Diciembre", mes: 12, anio: anioServicio - 1 },
    { nombre: "Enero", mes: 1, anio: anioServicio },
    { nombre: "Febrero", mes: 2, anio: anioServicio },
    { nombre: "Marzo", mes: 3, anio: anioServicio },
    { nombre: "Abril", mes: 4, anio: anioServicio },
    { nombre: "Mayo", mes: 5, anio: anioServicio },
    { nombre: "Junio", mes: 6, anio: anioServicio },
    { nombre: "Julio", mes: 7, anio: anioServicio },
    { nombre: "Agosto", mes: 8, anio: anioServicio },
  ];

  let totalHoras = 0;

  const filas = mesesServicio
    .map(({ nombre, mes, anio }) => {
      const reg = servicios.find((s) => s.mes === mes && s.anio === anio) || {};

      totalHoras += reg.horas || 0;

      return `
        <tr>
          <td>${nombre}</td>
          <td class="text-center">${reg.participo ? "✓" : ""}</td>
          <td class="text-center">${reg.cursos || ""}</td>
          <td class="text-center">${reg.auxiliar ? "✓" : ""}</td>
          <td class="text-center">${reg.horas || ""}</td>
          <td>${escaparHtml(reg.notas || "")}</td>
        </tr>
      `;
    })
    .join("");

  cerrarBanner();
  return `
  <div id="tarjeta-servicio" class="tarjeta-servicio">

    <div>
      <h3 class="titulo">
        REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
      </h3>
    </div>

    <!-- ===== DATOS DEL PUBLICADOR ===== -->
    <div class="datos-publicador">

      <!-- Nombre -->
      <div class="fila nombre">
        <span class="label">Nombre:</span>
        <span id="nombre-pub" class="valor">${escaparHtml(pub.nombre || "")}</span>
      </div>

      <!-- Fechas + Sexo / Esperanza -->
      <div class="fila doble">

        <div class="col">
          <div class="linea">
            <span class="label">Fecha de nacimiento:</span>
            <span class="valor">
              ${
                pub.fechaNacimiento
                  ? dateTimeStrToAnother(
                      pub.fechaNacimiento,
                      "YYYY-MM-DD",
                      "DD-MM-YYYY",
                    )
                  : ""
              }
            </span>
          </div>

          <div class="linea">
            <span class="label">Fecha de bautismo:</span>
            <span class="valor">
              ${
                pub.fechaBautismo
                  ? dateTimeStrToAnother(
                      pub.fechaBautismo,
                      "YYYY-MM-DD",
                      "DD-MM-YYYY",
                    )
                  : pub.estadoEspiritual?.includes("No bautizado")
                    ? "No bautizado"
                    : ""
              }
            </span>
          </div>
        </div>

        <div class="col checks">
          <div class="grupo-checks">
            <label><input type="checkbox" ${isChecked(
              pub.sexo === "M",
            )}> Hombre</label>
            <label><input type="checkbox" ${isChecked(
              pub.sexo === "F",
            )}> Mujer</label>
          </div>

          <div class="grupo-checks">
            <label><input type="checkbox" ${isChecked(
              pub.esperanza === "Otras ovejas",
            )}> Otras ovejas</label>
            <label><input type="checkbox" ${isChecked(
              pub.esperanza === "Ungido",
            )}> Ungido</label>
          </div>
        </div>

      </div>

      <!-- Estado espiritual -->
      <div class="fila checks-full">
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Anciano"),
        )}> Anciano</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Siervo ministerial"),
        )}> Siervo ministerial</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Precursor regular"),
        )}> Precursor regular</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Precursor especial"),
        )}> Precursor especial</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Misionero-campo"),
        )}>
          Misionero que sirve<br>en el campo
        </label>
      </div>

    </div>

    <!-- ===== TABLA DE SERVICIO ===== -->
    <table class="tabla-servicio">
      <thead>
        <tr>
          <th style="width:170px">Año de servicio<br>${anioServicio}</th>
          <th style="width:70px">Participación<br>en el ministerio</th>
          <th style="width:70px">Cursos<br>bíblicos</th>
          <th style="width:70px">Precursor<br>auxiliar</th>
          <th style="width:110px">
            Horas
            <small>
              Si es precursor o<br>
              misionero que sirve<br>
              en el campo
            </small>
          </th>
          <th style="width:260px">Notas</th>
        </tr>
      </thead>

      <tbody>
        ${filas}
        <tr class="total">
          <td>Total</td>
          <td></td>
          <td></td>
          <td></td>
          <td>${totalHoras}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

  </div>
  `;
}

async function verTarjetaPublicador(id) {
  const width = 900;
  const height = 900;
  const mes = Number(document.getElementById("mes").value);
  let anioServicio = Number(document.getElementById("anio").value);

  if (mes >= 9 && mes <= 12) anioServicio += 1;

  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  const ventana = window.open(
    "",
    "tarjetaPublicador",
    `
      width=${width},
      height=${height},
      left=${left},
      top=${top},
      resizable=yes,
      scrollbars=yes,
      toolbar=no,
      menubar=no,
      location=no,
      status=no
    `,
  );

  if (!ventana) {
    alert("Permite las ventanas emergentes para ver la tarjeta");
    return;
  }

  const htmlTarjeta = await renderTarjetaPublicador(id, anioServicio);

  ventana.document.open();
  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Registro de Publicador</title>

      <!-- CSS PROPIO (SIN BOOTSTRAP) -->
      <link rel="stylesheet" href="styles/tarjeta.css">

      <!-- html2pdf -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    </head>
    <body>

      <div class="acciones">
        <button class="btn" onclick="descargar()">⬇ Descargar</button>
        <button class="btn" onclick="window.close()">❌ Cerrar</button>
      </div>

      <div id="contenidoTarjeta">
        ${htmlTarjeta}
      </div>

      <script>
        function descargar() {
          const el = document.getElementById("contenidoTarjeta");

          html2pdf().set({
            margin: 10,
            filename: "Registro ${publicadorSel.nombre} ${anioServicio}.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: 2,
              backgroundColor: "#ffffff"
            },
            jsPDF: {
              unit: "mm",
              format: "b5",
              orientation: "landscape"
            }
          }).from(el).save();
        }
      </script>

    </body>
    </html>
  `);

  ventana.document.close();
}

async function verTarjetasGrupo(grupo, anioServicio) {
  const ventana = obtenerVentanaTarjetas();

  if (!ventana) {
    alert("Permite las ventanas emergentes");
    return;
  }

  // Pantalla de carga
  ventana.document.open();
  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Generando tarjetas...</title>
      <style>
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: Arial, sans-serif;
          background: #f8f9fa;
        }
        .contador {
          margin-top: 10px;
          font-size: 1.1rem;
          color: #555;
        }
      </style>
    </head>
    <body>
      <h3>⏳ Generando tarjetas del grupo ${grupo}</h3>
      <div id="contador" class="contador">Preparando...</div>
    </body>
    </html>
  `);
  ventana.document.close();

  // Contenido
  let publicadores = JSON.parse(
    localStorage.getItem("firebase_publicadores") || "[]",
  ).filter((p) => Number(p.grupo) === Number(grupo));

  publicadores = orderArray(publicadores, "nombre");

  if (!publicadores.length) {
    ventana.close();
    alert("No hay publicadores en este grupo");
    return;
  }

  const total = publicadores.length;
  let htmlTarjetas = "";

  // Contador
  for (let i = 0; i < total; i++) {
    const pub = publicadores[i];

    // actualizar contador visible
    const contadorEl = ventana.document.getElementById("contador");
    if (contadorEl) {
      contadorEl.textContent = `Generando tarjeta ${i + 1} de ${total}…`;
    }

    const html = await renderTarjetaPublicador(pub.id, anioServicio);
    htmlTarjetas += `
      <div class="tarjeta">
        ${html}
      </div>
    `;
  }

  // Renderizar todo
  ventana.document.open();
  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Tarjetas Grupo ${grupo}</title>

      <link rel="stylesheet" href="styles/tarjeta.css">

      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    </head>
    <body>

      <div class="acciones">
        <button class="btn" onclick="descargar()">⬇ Descargar</button>
        <button class="btn" onclick="window.close()">❌ Cerrar</button>
      </div>

      <div id="contenidoTarjetas">
        ${htmlTarjetas}
      </div>

      <script>
        function descargar() {
          const el = document.getElementById("contenidoTarjetas");

          html2pdf().set({
            margin: 10,
            filename: "Tarjetas Grupo ${grupo} ${anioServicio + 1}.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: 2,
              backgroundColor: "#ffffff"
            },
            pagebreak: {
              mode: ["avoid-all", "css", "legacy"],
              after: ".tarjeta" // 👈 CLAVE ABSOLUTA
            },
            jsPDF: {
              unit: "mm",
              format: "b5",
              orientation: "landscape"
            }
          }).from(el).save()
        }
      </script>

    </body>
    </html>
  `);
  ventana.document.close();
}

function obtenerVentanaTarjetas(width = 1000, height = 900) {
  // Si existe y no está cerrada → reutilizar
  if (ventanaTarjetas && !ventanaTarjetas.closed) {
    ventanaTarjetas.focus();
    return ventanaTarjetas;
  }

  // Si no existe o está cerrada → crear nueva
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  ventanaTarjetas = window.open(
    "",
    "tarjetasGrupo",
    `
      width=${width},
      height=${height},
      left=${left},
      top=${top},
      resizable=yes,
      scrollbars=yes
    `,
  );

  return ventanaTarjetas;
}

function descargarTarjetas() {
  const anioServicio = Number(document.getElementById("anio-descarga").value);
  const grupo = Number(document.getElementById("grupo-descarga").value);

  if (!anioServicio || !grupo) {
    alert("Selecciona año y grupo");
    return;
  }

  verTarjetasGrupo(grupo, anioServicio);
}

async function mostrarTotales() {
  let publicadores = await obtenerDataColeccion("publicadores");
  publicadores = publicadores.filter((p) => p.grupo > 0);
  const servicio = await obtenerDataColeccion("servicio");

  // Filtros base
  const activos = publicadores.filter(
    (p) => !(p.estadoEspiritual || []).includes("Inactivo"),
  );
  const inactivosId = publicadores
    .filter((p) => (p.estadoEspiritual || []).includes("Inactivo"))
    .map((p) => p.id);
  const informes = servicio.filter((s) => s.participo);
  const irregulares = servicio.filter(
    (s) => !s.participo && !inactivosId.includes(s.publicadorId),
  );
  const auxiliares = servicio.filter((s) => s.auxiliar);

  const regularesId = publicadores
    .filter((p) => (p.estadoEspiritual || []).includes("Precursor regular"))
    .map((p) => p.id);

  const regulares = servicio.filter((s) =>
    regularesId.includes(s.publicadorId),
  );

  // Cálculos generales
  const totalActivos = activos.length;
  const promedioAsistencia = servicio.length
    ? Math.round((informes.length / servicio.length) * 100)
    : 0;

  // Publicadores
  const publicadoresServicio = servicio.filter(
    (s) => !s.auxiliar && !regularesId.includes(s.publicadorId),
  );

  const totalPubli = publicadoresServicio.filter((s) => s.participo).length;
  const totalCursosPubli = publicadoresServicio.reduce(
    (acc, s) => acc + (s.cursos || 0),
    0,
  );

  // Auxiliares
  const totalAuxi = auxiliares.filter((s) => s.participo).length;
  const totalHorasAuxi = auxiliares.reduce((acc, s) => acc + (s.horas || 0), 0);
  const totalCursosAuxi = auxiliares.reduce(
    (acc, s) => acc + (s.cursos || 0),
    0,
  );

  // Regulares
  const totalRegul = regulares.filter((s) => s.participo).length;
  const totalHorasRegul = regulares.reduce((acc, s) => acc + (s.horas || 0), 0);
  const totalCursosRegul = regulares.reduce(
    (acc, s) => acc + (s.cursos || 0),
    0,
  );

  const totalIrregul = irregulares.length;

  // Mostrar en modal
  document.getElementById("totalActivos").textContent = totalActivos;
  // document.getElementById("totalAsistencia").textContent =
  //   promedioAsistencia + "%";

  document.getElementById("totalPubli").textContent = totalPubli;
  document.getElementById("totalCursosPubli").textContent = totalCursosPubli;

  document.getElementById("totalAuxi").textContent = totalAuxi;
  document.getElementById("totalHorasAuxi").textContent = totalHorasAuxi;
  document.getElementById("totalCursosAuxi").textContent = totalCursosAuxi;

  document.getElementById("totalRegul").textContent = totalRegul;
  document.getElementById("totalHorasRegul").textContent = totalHorasRegul;
  document.getElementById("totalCursosRegul").textContent = totalCursosRegul;

  document.getElementById("totalIrregul").textContent = totalIrregul;

  const modal = new bootstrap.Modal(document.getElementById("modalTotales"));
  modal.show();
}
