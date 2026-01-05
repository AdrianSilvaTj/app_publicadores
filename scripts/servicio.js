async function iniciarPublicadores() {
  const selectGrupo = document.getElementById("filtroGrupo");
  const config = await cargarConfiguracionGlobal();
  const grupos = config.cantidadGrupos;
  for (let i = 1; i <= grupos; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    selectGrupo.appendChild(opt);
  }
  renderPublicadoresPorGrupo(grupos);
}

function renderFilaServicio(pub, index, grupoNumero) {
  const id = pub.id;
  const nombre = pub.nombre || "Sin nombre";

  return `
  <tr data-id="${id}" data-grupo="${grupoNumero}">
    <td>
      <span href="#" onclick="verTarjetaPublicador('${id}')">
        ${index + 1}. ${nombre}
      </span>
      <div class="dropdown d-inline ms-1">
        <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
        <ul class="dropdown-menu">
          <li><button class="dropdown-item" onclick="editarPublicador('${id}')">Editar</button></li>
          <li><button class="dropdown-item" onclick="verTarjetaPublicador('${id}')">Ver tarjeta</button></li>
        </ul>
      </div>
    </td>

    <td class="text-center">
      <input type="checkbox" class="form-check-input svc-participo">
    </td>

    <td>
      <input type="number" class="form-control form-control-sm svc-cursos" style="width: 60px">
    </td>

    <td class="text-center">
      <input type="checkbox" class="form-check-input svc-auxiliar">
    </td>

    <td>
      <input type="number" class="form-control form-control-sm svc-horas" style="width: 60px">
    </td>

    <td>
      <input type="text" class="form-control form-control-sm svc-notas" style="width: 200px">
    </td>
  </tr>
  `;
}

async function renderPublicadoresPorGrupo(grupos) {
  const contenedor = document.getElementById("tablasGrupos");
  contenedor.innerHTML = ""; // Limpiar contenido anterior

  mostrarBanner("Cargando información...", "info", true);
  // Intentar leer desde localStorage
  const publicadoresCache = localStorage.getItem("firebase_publicadores");
  const pubsServicioCache = localStorage.getItem("firebase_servicio");
  let publicadores = [];

  if (publicadoresCache && pubsServicioCache) {
    publicadores = JSON.parse(publicadoresCache);
    pubsServicio = JSON.parse(pubsServicioCache);
    console.log("✅ Datos cargados desde localStorage.");
  } else {
    // Si no hay cache, cargar y guardar
    [publicadores, pubsServicio] = await actualizarColecciones([
      "publicadores",
      "servicio",
    ]);
  }

  for (let g = 1; g <= grupos; g++) {
    const grupoPublicadores = ordenarPublicadoresGrupo(
      publicadores.filter((p) => Number(p.grupo) === g),
      g
    );
    const tablaId = `tablaGrupo${g}`;

    const card = document.createElement("div");
    card.className = "col-12";

    card.innerHTML = `
      <div class="card card-shadow">
        <div class="card-header d-flex justify-content-between align-items-center group-header-color">
          <strong>Grupo ${g}</strong>
          <button class="btn btn-sm btn-outline-primary" onclick="guardarServicioGrupo(${g})">
            💾 Guardar
          </button>
        </div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0" id="${tablaId}">
            <thead class="table-light text-center">
              <tr>
                <th>Nombre</th>
                <th class="font-10">Participación<br>en el ministerio</th>
                <th class="font-10">Cursos<br>bíblicos</th>
                <th class="font-10">Precursor<br>auxiliar</th>
                <th class="font-10">
                  Horas<br>
                  <small class="text-muted">
                    Si es precursor o<br>misionero que sirve<br>en el campo
                  </small>
                </th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              ${grupoPublicadores
                .map((pub, index) => renderFilaServicio(pub, index, g))
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  }

  cerrarBanner();
}

async function actualizarYRecargar() {
  await actualizarColecciones(["publicadores", "servicio"]);
  const config = await cargarConfiguracionGlobal();
  const grupos = config.cantidadGrupos;
  renderPublicadoresPorGrupo(grupos);
}

async function guardarServicioGrupo(grupo) {
  const filas = document.querySelectorAll(`#tablaGrupo${grupo} tbody tr`);

  const mes = Number(document.getElementById("filtroMes").value);
  const anio = Number(document.getElementById("filtroAnio").value);

  if (!mes || !anio) {
    return alert("Selecciona mes y año");
  }

  const batch = db.batch();

  filas.forEach((tr) => {
    const id = tr.dataset.id;

    const data = {
      publicadorId: id,
      grupo,
      mes,
      anio,
      participo: tr.querySelector(".svc-participo").checked,
      cursos: Number(tr.querySelector(".svc-cursos").value) || 0,
      auxiliar: tr.querySelector(".svc-auxiliar").checked,
      horas: Number(tr.querySelector(".svc-horas").value) || 0,
      notas: tr.querySelector(".svc-notas").value || "",
    };

    const ref = db.collection("Servicio").doc();
    batch.set(ref, data);
  });

  await batch.commit();
  mostrarBanner("✅ Servicio guardado correctamente", "success", false, 3000);
}

const buscarPublicador = () => {
  const buscador = document.getElementById("buscadorPublicador");
  const q = buscador.value.trim().toLowerCase(); // texto ingresado en el buscador
  let hit = false; // bandera para scroll al primer resultado
  let encontrado = false;

  // Recorre todas las filas de todas las tablas de grupos
  document.querySelectorAll("#tablasGrupos tbody tr").forEach((tr) => {
    const nombre =
      tr.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";

    if (q && nombre.includes(q)) {
      tr.classList.add("resaltado"); // aplica clase de resaltado
      encontrado = true;
      // Si es la primera coincidencia, hacer scroll
      if (!hit) {
        tr.scrollIntoView({ behavior: "smooth", block: "center" });
        hit = true;
      }
    } else {
      tr.classList.remove("resaltado"); // limpia resaltado si no coincide
    }
  });
  !encontrado &&
    mostrarBanner("❌ No se encontró el publicador", "danger", false, 3000);
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
    new Paragraph(" ")
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
          })
      ),
      new Paragraph(" ")
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
