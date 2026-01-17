async function iniciarPublicadores() {
  const selectGrupo = document.getElementById("grupo");
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

function getClaseFila(pub, grupo) {
  icons = "";
  if (pub.superGrupo == true) icons += "🔶";
  if (pub.auxGrupo == true) icons += "🔷";
  if ((pub.estadoEspiritual || []).includes("Precursor regular")) icons += "🔴";
  if ((pub.estadoEspiritual || []).includes("Precursor auxiliar"))
    icons += "🟡";
  if ((pub.estadoEspiritual || []).includes("Precursor auxiliar mes"))
    icons += "🟢";
  if ((pub.estadoEspiritual || []).includes("Anciano")) icons += "🟠";
  if ((pub.estadoEspiritual || []).includes("Siervo ministerial"))
    icons += "🔵";
  if ((pub.estadoEspiritual || []).includes("Inactivo")) icons += "⚫";
  if ((pub.estadoEspiritual || []).includes("No bautizado")) icons += "🟣";
  return icons;
}

function renderFila(pub, index, grupoNumero) {
  const id = pub.id;
  const nombre = pub.nombre || "Sin nombre";
  const iconos = getClaseFila(pub, grupoNumero);

  return `
    <tr data-id="${id}" data-grupo="${grupoNumero}">
      <td class="d-none checkbox-col"><input type="checkbox" class="form-check-input"></td>
      <td>${index + 1}. ${iconos + " " + nombre}</td>
      <td>
        <div class="dropdown text-end">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            ⋮
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button class="dropdown-item" onclick="editarPublicador('${id}')">✏️ Editar</button></li>
            <li><button class="dropdown-item" onclick="asignarSuperGrupo('${id}', ${grupoNumero})">🔶 Superintendente de grupo</button></li>
            <li><button class="dropdown-item" onclick="asignarAuxGrupo('${id}', ${grupoNumero})">🔷 Auxiliar de grupo</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" onclick="eliminarPublicador('${id}', '${nombre}')">🗑️ Eliminar</button></li>
          </ul>
        </div>
      </td>
    </tr>
  `;
}

async function renderPublicadoresPorGrupo(grupos) {
  const contenedor = document.getElementById("tablasGrupos");
  contenedor.innerHTML = ""; // Limpiar contenido anterior

  mostrarBanner("Cargando información...", "info", true);
  // Intentar leer desde localStorage
  const cache = localStorage.getItem("firebase_publicadores");
  let publicadores = [];

  if (cache) {
    publicadores = JSON.parse(cache);
    console.log("✅ Datos cargados desde localStorage.");
  } else {
    // Si no hay cache, cargar y guardar
    publicadores = await actualizarColecciones(["publicadores"]);
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
          <button class="btn btn-sm btn-outline-secondary" onclick="activarSeleccionGrupo(${g})">🔁Mover publicadores</button>
        </div>
        <div class="card-body p-0">
          <table class="table table-hover mb-0" id="${tablaId}">
            <thead class="table-light">
              <tr>
                <th class="d-none checkbox-col">✓</th>
                <th>Nombre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${grupoPublicadores
                .map((pub, index) => renderFila(pub, index, g))
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  }

  // Tabla No publicadores
  const grupoPublicadores = ordenarPublicadoresGrupo(
    publicadores.filter((p) => Number(p.grupo) === 0),
    0
  );
  const tablaId = `tablaGrupo0`;
  const card = document.createElement("div");
  card.className = "col-12";

  card.innerHTML = `
    <div class="card card-shadow">
      <div class="card-header d-flex justify-content-between align-items-center group-header-color">
        <strong>No publicadores</strong>
        <button class="btn btn-sm btn-outline-secondary" onclick="activarSeleccionGrupo(0)">🔁Mover publicadores</button>
      </div>
      <div class="card-body p-0">
        <table class="table table-hover mb-0" id="${tablaId}">
          <thead class="table-light">
            <tr>
              <th class="d-none checkbox-col">✓</th>
              <th>Nombre</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${grupoPublicadores
              .map((pub, index) => renderFila(pub, index, 0))
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  contenedor.appendChild(card);
  cerrarBanner();
}

async function actualizarYRecargar() {
  await actualizarColecciones(["publicadores"]);
  const config = await cargarConfiguracionGlobal();
  const grupos = config.cantidadGrupos;
  renderPublicadoresPorGrupo(grupos);
}

const form = document.getElementById("formPublicador");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarBanner("Guardando...", "info", true);

  const idEdicion = form.getAttribute("data-edicion-id");

  const nombre = document.getElementById("nombre").value.trim();
  const fechaNacimiento =
    document.getElementById("fechaNacimiento").value || null;
  const fechaBautismo = document.getElementById("fechaBautismo").value || null;
  const sexo = document.getElementById("sexo").value;
  const esperanza = document.querySelector(
    'input[name="esperanza"]:checked'
  )?.value;
  const grupo = document.getElementById("grupo").value || null;

  const estadoEspiritual = [];
  document.querySelectorAll(".estadoEspiritual").forEach((cb) => {
    if (cb.checked) estadoEspiritual.push(cb.value);
  });

  const privilegiosCongregacion = [];
  document.querySelectorAll(".privilegios").forEach((cb) => {
    if (cb.checked) privilegiosCongregacion.push(cb.id);
  });

  const data = {
    nombre,
    fechaNacimiento,
    fechaBautismo,
    sexo,
    esperanza,
    grupo,
    estadoEspiritual,
    privilegiosCongregacion,
  };

  try {
    if (idEdicion) {
      await db.collection("publicadores").doc(idEdicion).update(data);
      mostrarBanner("✅ Publicador actualizado", "success", false, 3000);
    } else {
      await db.collection("publicadores").add(data);
      mostrarBanner("✅ Publicador creado", "success", false, 3000);
    }

    // Reset y cerrar modal
    form.reset();
    form.removeAttribute("data-edicion-id");
    bootstrap.Modal.getInstance(
      document.getElementById("modalPublicador")
    ).hide();

    // Actualizar vista
    await actualizarYRecargar();
  } catch (err) {
    console.error(err);
    mostrarBanner("❌ Error al guardar", "danger");
  }
});

function nuevoPublicador() {
  document.getElementById("modalPublicadorLabel").innerText =
    "➕ Crear nuevo publicador ";
  form.reset();
  const modal = new bootstrap.Modal(document.getElementById("modalPublicador"));
  modal.show();
}

async function editarPublicador(id) {
  try {
    // Obtener el publicador desde localStorage o Firestore
    let publicadores =
      JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

    let pub = publicadores.find((p) => p.id === id);

    // Si no está en cache, buscar en Firestore
    if (!pub) {
      const doc = await db.collection("publicadores").doc(id).get();
      if (!doc.exists) {
        alert("❌ Publicador no encontrado.");
        return;
      }
      pub = { id: doc.id, ...doc.data() };
    }

    // Guardar ID de edición
    form.setAttribute("data-edicion-id", id);

    // Rellenar campos
    document.getElementById("nombre").value = pub.nombre || "";
    document.getElementById("fechaNacimiento").value =
      pub.fechaNacimiento || "";
    document.getElementById("fechaBautismo").value = pub.fechaBautismo || "";
    document.getElementById("sexo").value = pub.sexo || "";
    document
      .querySelector(`input[name="esperanza"][value="${pub.esperanza}"]`)
      ?.click();
    document.getElementById("grupo").value = pub.grupo || "";

    // Privilegios
    const estado = pub.estadoEspiritual || [];
    const normalizados = estado.map((v) => v?.toLowerCase().replace(" ", ""));
    document.querySelectorAll(".estadoEspiritual").forEach((cb) => {
      const valor = cb.value.toLowerCase().replace(" ", "");
      cb.checked = normalizados.includes(valor);
    });

    // Privilegios de congregación
    const privCong = pub.privilegiosCongregacion || [];
    document.querySelectorAll(".privilegios").forEach((cb) => {
      cb.checked = privCong.includes(cb.id);
    });
    controlarDesactivacionPrivilegios();
    // Mostrar el modal
    document.getElementById("modalPublicadorLabel").innerText =
      "✏️ Editar publicador";
    const modal = new bootstrap.Modal(
      document.getElementById("modalPublicador")
    );
    modal.show();
  } catch (err) {
    console.error("Error al editar publicador:", err);
    alert("❌ Ocurrió un error al cargar los datos del publicador.");
  }
}

function controlarDesactivacionPrivilegios() {
  const valoresSeleccionados = Array.from(
    document.querySelectorAll(".estadoEspiritual:checked")
  ).map((cb) => cb.value);

  const bloquear = valoresSeleccionados.includes("Inactivo");

  // Deshabilitar todo menos los dos especiales
  document.querySelectorAll(".estadoEspiritual").forEach((cb) => {
    if (cb.value !== "Inactivo") {
      cb.disabled = bloquear;
      if (bloquear) cb.checked = false;
    }
  });
  document.querySelectorAll(".privilegios").forEach((cb) => {
    cb.disabled = bloquear;
    if (bloquear) cb.checked = false;
  });
}

document.querySelectorAll(".estadoEspiritual").forEach((cb) => {
  cb.addEventListener("change", controlarDesactivacionPrivilegios);
});

async function eliminarPublicador(id, nombre = "el publicador") {
  const confirmado = confirm(
    `¿Estás seguro de que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`
  );

  if (!confirmado) return;

  try {
    mostrarBanner("Eliminando publicador...", "info", true);

    await db.collection("publicadores").doc(id).delete();

    // Eliminar del localStorage
    const cache = localStorage.getItem("firebase_publicadores");
    if (cache) {
      const lista = JSON.parse(cache).filter((p) => p.id !== id);
      localStorage.setItem("firebase_publicadores", JSON.stringify(lista));
    }

    mostrarBanner(
      "✅ Publicador eliminado correctamente",
      "success",
      false,
      3000
    );

    // Volver a renderizar
    const config = await cargarConfiguracionGlobal();
    const grupos = config.cantidadGrupos;
    renderPublicadoresPorGrupo(grupos);
  } catch (err) {
    console.error("Error al eliminar:", err);
    mostrarBanner("❌ Error al eliminar el publicador", "danger");
  }
}

async function asignarSuperGrupo(id, grupo) {
  const confirmado = confirm(
    `¿Asignar este publicador como 🧑‍🏫 Superintendente del grupo ${grupo}?`
  );

  if (!confirmado) return;

  try {
    mostrarBanner("Asignando superintendente...", "info", true);

    // 1. Buscar y remover anterior superintendente del grupo
    const snapshot = await db
      .collection("publicadores")
      .where("grupo", "==", grupo)
      .where("superGrupo", "==", true)
      .get();

    const cambios = [];

    snapshot.forEach((doc) => {
      if (doc.id !== id) {
        cambios.push(
          db
            .collection("publicadores")
            .doc(doc.id)
            .update({ superGrupo: firebase.firestore.FieldValue.delete() })
        );
      }
    });

    // 2. Asignar el nuevo
    cambios.push(
      db.collection("publicadores").doc(id).update({ superGrupo: true })
    );

    await Promise.all(cambios);
    mostrarBanner(
      "✅ Superintendente asignado correctamente",
      "success",
      false,
      3000
    );
    await actualizarYRecargar();
  } catch (err) {
    console.error("❌ Error asignando superGrupo:", err);
    mostrarBanner("❌ Error al asignar superintendente", "danger");
  }
}

async function asignarAuxGrupo(id, grupo) {
  const confirmado = confirm(
    `¿Asignar este publicador como 🤝 Auxiliar del grupo ${grupo}?`
  );

  if (!confirmado) return;

  try {
    mostrarBanner("Asignando auxiliar...", "info", true);

    const snapshot = await db
      .collection("publicadores")
      .where("grupo", "==", grupo)
      .where("auxGrupo", "==", true)
      .get();

    const cambios = [];

    snapshot.forEach((doc) => {
      if (doc.id !== id) {
        cambios.push(
          db
            .collection("publicadores")
            .doc(doc.id)
            .update({ auxGrupo: firebase.firestore.FieldValue.delete() })
        );
      }
    });

    cambios.push(
      db.collection("publicadores").doc(id).update({ auxGrupo: true })
    );

    await Promise.all(cambios);
    mostrarBanner("✅ Auxiliar asignado correctamente", "success", false, 3000);
    await actualizarYRecargar();
  } catch (err) {
    console.error("❌ Error asignando auxGrupo:", err);
    mostrarBanner("❌ Error al asignar auxiliar", "danger");
  }
}

async function activarSeleccionGrupo(grupo) {
  // Mostrar la columna de checkboxes solo en el grupo seleccionado
  const tabla = document.getElementById(`tablaGrupo${grupo}`);
  if (!tabla) return;

  // Mostrar la columna de checkboxes (activar)
  tabla
    .querySelectorAll(".checkbox-col")
    .forEach((th) => th.classList.remove("d-none"));

  // Mostrar los checkboxes por fila
  tabla.querySelectorAll("tbody tr").forEach((tr) => {
    const td = tr.querySelector("td.checkbox-col");
    if (td) {
      td.classList.remove("d-none");
    }
  });

  // Agregar barra de acción debajo de la tabla
  const wrapper = tabla.closest(".card");

  // Evitar duplicar botones
  if (wrapper.querySelector(".acciones-grupo")) return;

  const barra = document.createElement("div");
  barra.className = "acciones-grupo border-top p-2 bg-light text-end";
  const config = await cargarConfiguracionGlobal();
  let grupos = config.cantidadGrupos;

  barra.innerHTML = `
    <label for="nuevoGrupo${grupo}" class="me-2">Mover al grupo:</label>
    <select id="nuevoGrupo${grupo}" class="form-select d-inline-block w-auto me-2">
      ${[...Array(grupos).keys()]
        .map((i) => `<option value="${i + 1}">${i + 1}</option>`)
        .join("")}
    </select>
    <button class="btn btn-sm btn-outline-primary" onclick="moverPublicadoresDeGrupo(${grupo})">✔</button>
    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="cancelarSeleccionGrupo(${grupo})">❌</button>
  `;

  wrapper.appendChild(barra);
}

function cancelarSeleccionGrupo(grupo) {
  const tabla = document.getElementById(`tablaGrupo${grupo}`);
  if (!tabla) return;

  tabla
    .querySelectorAll(".checkbox-col")
    .forEach((th) => th.classList.add("d-none"));
  tabla.querySelectorAll("tbody tr").forEach((tr) => {
    const td = tr.querySelector("td.checkbox-col");
    if (td) td.classList.add("d-none");
  });

  // Quitar barra de acción
  const wrapper = tabla.closest(".card");
  const barra = wrapper.querySelector(".acciones-grupo");
  if (barra) barra.remove();
}

async function moverPublicadoresDeGrupo(grupoOrigen) {
  const tabla = document.getElementById(`tablaGrupo${grupoOrigen}`);
  const checkboxes = tabla.querySelectorAll(
    "tbody tr input[type='checkbox']:checked"
  );

  const nuevoGrupo = parseInt(
    document.getElementById(`nuevoGrupo${grupoOrigen}`).value
  );

  if (!nuevoGrupo || isNaN(nuevoGrupo)) {
    alert("⚠️ Debes seleccionar un grupo destino válido.");
    return;
  }

  if (checkboxes.length === 0) {
    alert("⚠️ No hay publicadores seleccionados.");
    return;
  }

  const confirmacion = confirm(
    `¿Mover ${checkboxes.length} publicadores al grupo ${nuevoGrupo}?`
  );
  if (!confirmacion) return;

  try {
    mostrarBanner("Moviendo publicadores...", "info", true);

    const cambios = [];

    checkboxes.forEach((cb) => {
      const row = cb.closest("tr");
      const id = row.getAttribute("data-id");
      cambios.push(
        db.collection("publicadores").doc(id).update({ grupo: nuevoGrupo })
      );
    });

    await Promise.all(cambios);

    mostrarBanner(
      `✅ ${checkboxes.length} publicadores movidos al grupo ${nuevoGrupo}`,
      "success",
      false,
      4000
    );

    // Actualiza datos
    await actualizarYRecargar();
  } catch (err) {
    console.error("❌ Error al mover publicadores:", err);
    mostrarBanner("❌ Error al mover publicadores", "danger");
  }
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

function generarIconos(estados) {
  const e = estados.map((e) => e.toLowerCase());
  let out = "";
  if (e.includes("anciano")) out += "🧔";
  if (e.includes("siervo ministerial")) out += " 👔";
  if (e.includes("precursor regular")) out += " 🌱";
  if (e.includes("precursor especial")) out += " 🌿";
  if (e.includes("misionero-campo") || e.includes("misionero")) out += " 📕";
  if (e.includes("inactivo")) out += " 🚫";
  if (e.includes("no bautizado")) out += " ❌";
  return out;
}

function actualizar() {
  actualizarColecciones(["publicadores"]);
}
