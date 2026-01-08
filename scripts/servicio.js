// Globales
let publicadorSel = null;

async function iniciarPublicadores() {
  const config = await cargarConfiguracionGlobal();
  const grupos = config.cantidadGrupos;

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
}

function getClaseFila(pub, grupo) {
  icons = "";
  if ((pub.estadoEspiritual || []).includes("Precursor regular")) icons += "🔴";
  if ((pub.estadoEspiritual || []).includes("Inactivo")) icons += "⚫";
  return icons;
}

function editarFilaServicio(btn) {
  const tr = btn.closest("tr");

  tr.querySelectorAll("input").forEach((input) => {
    if (input.type === "checkbox") {
      input.disabled = false;
    } else {
      input.readOnly = false;
    }
  });
}

function renderFilaServicio(pub, index, grupoNumero, grupoPubsServicio) {
  const id = pub.id;
  const iconos = getClaseFila(pub, grupoNumero);
  const registro =
    grupoPubsServicio.find((reg) => reg.publicadorId == id) || {};
  const nombre = pub.nombre || "Sin nombre";

  const tieneRegistro = Object.keys(registro).length > 0;

  return `
  <tr data-id="${id}" data-grupo="${grupoNumero}">
    <td>
      <span style="width:200px; cursor:pointer" onclick="verTarjetaPublicador('${id}')">
        ${index + 1}. ${iconos + " " + nombre}
      </span>
    </td>

    <td class="text-center">
      <input
        type="checkbox"
        class="form-check-input svc-participo"
        ${registro.participo ? "checked" : ""}
        ${tieneRegistro ? "disabled" : ""}
      >
    </td>

    <td>
      <input
        type="number"
        class="form-control form-control-sm svc-cursos"
        style="width:60px"
        value="${registro.cursos ?? ""}"
        ${tieneRegistro ? "readonly" : ""}
      >
    </td>

    <td class="text-center">
      <input
        type="checkbox"
        class="form-check-input svc-auxiliar"
        ${registro.auxiliar ? "checked" : ""}
        ${tieneRegistro ? "disabled" : ""}
      >
    </td>

    <td>
      <input
        type="number"
        class="form-control form-control-sm svc-horas"
        style="width:60px"
        value="${registro.horas ?? ""}"
        ${tieneRegistro ? "readonly" : ""}
      >
    </td>

    <td>
      <input
        type="text"
        class="form-control form-control-sm svc-notas"
        style="width:200px"
        value="${registro.notas ?? ""}"
        ${tieneRegistro ? "readonly" : ""}
      >
    </td>

    <td>
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

async function renderPublicadoresPorGrupo(grupos) {
  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);
  const contenedor = document.getElementById("tablasGrupos");
  contenedor.innerHTML = ""; // Limpiar contenido anterior
  let publicadoresCache = localStorage.getItem("firebase_publicadores");
  let publicadores = [];
  let pubsServicio = [];
  let actualizarCole = [{ nombre: "servicio", filtros: { mes, anio } }];

  mostrarBanner("Cargando información...", "info", true);
  !publicadoresCache && actualizarCole.push("publicadores");
  await actualizarColecciones(actualizarCole, true);
  const pubsServicioCache = localStorage.getItem("firebase_servicio");
  !publicadoresCache &&
    (publicadoresCache = localStorage.getItem("firebase_publicadores"));
  if (publicadoresCache && pubsServicioCache) {
    publicadores = JSON.parse(publicadoresCache);
    pubsServicio = JSON.parse(pubsServicioCache);
    console.log("✅ Datos cargados desde localStorage.");
  }

  for (let g = 1; g <= grupos; g++) {
    const grupoPublicadores = ordenarPublicadoresGrupo(
      publicadores.filter((p) => Number(p.grupo) === g),
      g
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
          <table class="table table-hover mb-0" id="${tablaId}">
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
                  renderFilaServicio(pub, index, g, grupoPubsServicio)
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  }

  // 👇 RESTAURAR POSICIÓN
  restaurarPosicionVista();
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

  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);

  if (!mes || !anio) {
    return alert("Selecciona mes y año");
  }

  mostrarBanner("Guardando...", "info", true);

  const batch = db.batch();

  filas.forEach((tr) => {
    const publicadorId = tr.dataset.id;

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

    if (!data.participo && !data.notas.toLowerCase().includes("no participó")) {
      data.notas += (data.notas ? " " : "") + "No participó";
    }

    batch.set(ref, data, { merge: true });
  });

  await batch.commit();

  await actualizarColecciones([{ nombre: "servicio", filtros: { mes, anio } }]);

  mostrarBanner("✅ Servicio guardado correctamente", "success", false, 3000);
}

async function limpiarServicioGrupo(grupo) {
  const mes = Number(document.getElementById("mes").value);
  const anio = Number(document.getElementById("anio").value);

  if (!mes || !anio) {
    return alert("Selecciona mes y año");
  }

  const confirmar = confirm(
    `⚠️ ¿Estás seguro?\n\nSe eliminarán TODOS los registros de servicio:\n` +
      `Grupo ${grupo} - ${mes}/${anio}\n\nEsta acción no se puede deshacer.`
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
        3000
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
      3000
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

async function renderTarjetaPublicador(publicadorId, anioServicio) {
  mostrarBanner("Procesando...", "info", true);
  const isChecked = (cond) => (cond ? "checked" : "");

  const publicadores =
    JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

  const servicios = await consultarFirebase("servicio", {
    publicadorId,
    anio: [anioServicio, anioServicio + 1],
  });

  const pub = (publicadorSel = publicadores.find((p) => p.id === publicadorId));
  if (!pub) return "<p>Publicador no encontrado</p>";

  // 🔹 Definición del año de servicio (septiembre → agosto)
  const mesesServicio = [
    { nombre: "Septiembre", mes: 9, anio: anioServicio },
    { nombre: "Octubre", mes: 10, anio: anioServicio },
    { nombre: "Noviembre", mes: 11, anio: anioServicio },
    { nombre: "Diciembre", mes: 12, anio: anioServicio },
    { nombre: "Enero", mes: 1, anio: anioServicio + 1 },
    { nombre: "Febrero", mes: 2, anio: anioServicio + 1 },
    { nombre: "Marzo", mes: 3, anio: anioServicio + 1 },
    { nombre: "Abril", mes: 4, anio: anioServicio + 1 },
    { nombre: "Mayo", mes: 5, anio: anioServicio + 1 },
    { nombre: "Junio", mes: 6, anio: anioServicio + 1 },
    { nombre: "Julio", mes: 7, anio: anioServicio + 1 },
    { nombre: "Agosto", mes: 8, anio: anioServicio + 1 },
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
          <td>${reg.notas || ""}</td>
        </tr>
      `;
    })
    .join("");

  cerrarBanner();
  return `
  <div id="tarjeta-servicio" class="tarjeta-servicio">

    <h3 class="titulo">
      REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
    </h3>

    <!-- ===== DATOS DEL PUBLICADOR ===== -->
    <div class="datos-publicador">

      <!-- Nombre -->
      <div class="fila nombre">
        <span class="label">Nombre:</span>
        <span class="valor">${pub.nombre || ""}</span>
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
                      "DD-MM-YYYY"
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
                      "DD-MM-YYYY"
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
              pub.sexo === "M"
            )}> Hombre</label>
            <label><input type="checkbox" ${isChecked(
              pub.sexo === "F"
            )}> Mujer</label>
          </div>

          <div class="grupo-checks">
            <label><input type="checkbox" ${isChecked(
              pub.esperanza === "Otras ovejas"
            )}> Otras ovejas</label>
            <label><input type="checkbox" ${isChecked(
              pub.esperanza === "Ungido"
            )}> Ungido</label>
          </div>
        </div>

      </div>

      <!-- Estado espiritual -->
      <div class="fila checks-full">
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Anciano")
        )}> Anciano</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Siervo ministerial")
        )}> Siervo ministerial</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Precursor regular")
        )}> Precursor regular</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Precursor especial")
        )}> Precursor especial</label>
        <label><input type="checkbox" ${isChecked(
          pub.estadoEspiritual?.includes("Misionero-campo")
        )}>
          Misionero que sirve<br>en el campo
        </label>
      </div>

    </div>

    <!-- ===== TABLA DE SERVICIO ===== -->
    <table class="tabla-servicio">
      <thead>
        <tr>
          <th style="width:170px">Año de servicio<br>${anioServicio + 1}</th>
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
          <th>Notas</th>
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

// function descargarTarjeta() {
//   // const contenido = document.getElementById("menu").innerHTML;
//   const contenido =
//     document.getElementsByClassName("container-fluid").innerHTML;
//   const nombrePublicador =
//     document.getElementById("nombre-pub")?.innerText.trim() || "Registro";

//   if (!contenido || contenido.trim() === "") {
//     return alert("No hay contenido para descargar");
//   }

//   // Creamos un contenedor "fantasma" con estilos CSS inline
//   // para asegurar que las tablas y el texto sean visibles
//   const worker = document.createElement("div");
//   worker.innerHTML = `
//     <style>
//       body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
//       .tarjeta-servicio { width: 100%; }
//       table { width: 100%; border-collapse: collapse; margin-top: 15px; }
//       th, td { border: 1px solid #333; padding: 6px; font-size: 11px; text-align: left; }
//       .text-center { text-align: center; }
//       .d-flex { display: flex; }
//       .flex-grow-1 { flex-grow: 1; }
//       .mb-3 { margin-bottom: 1rem; }
//       .bg-light { background-color: #f8f9fa; border-bottom: 1px solid #ccc; }
//       input[type="checkbox"] { transform: scale(1.2); margin-right: 5px; }
//       .row { display: flex; flex-wrap: wrap; }
//       .col-md-8 { width: 66%; }
//       .col-md-4 { width: 33%; }
//     </style>
//     ${contenido}
//   `;

//   const opt = {
//     margin: [10, 10],
//     filename: `lelelele.pdf`,
//     image: { type: "jpeg", quality: 0.98 },
//     html2canvas: {
//       scale: 2,
//       useCORS: true,
//       letterRendering: true,
//       backgroundColor: "#ffffff",
//     },
//     jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
//   };

//   // Ejecutar sobre el objeto 'worker' que vive en memoria
//   // html2pdf().set(opt).from(worker).save();
//   html2pdf().set(opt).from(contenido).save();
// }

async function verTarjetaPublicador(id) {
  const width = 900;
  const height = 900;
  const anioServicio = Number(document.getElementById("anio").value);

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
    `
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
        filename: "Registro.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          backgroundColor: "#ffffff"
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        }
      }).from(el).save();
    }
  </script>

</body>
</html>
  `);

  ventana.document.close();
}
