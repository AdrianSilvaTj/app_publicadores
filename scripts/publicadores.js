function getClaseFila(pub, grupo) {
  icons = ""
  if (pub.superGrupo == grupo) icons += "🔶";
  if (pub.auxGrupo == grupo) icons += "🔷";
  if ((pub.estadoEspiritual || []).includes("Precursor regular")) icons += "🔴";
  if ((pub.estadoEspiritual || []).includes("Anciano")) icons += "🟠";
  if ((pub.estadoEspiritual || []).includes("Siervo ministerial")) icons += "🔵";
  if ((pub.estadoEspiritual || []).includes("Inactivo")) icons += "⚫";
  if ((pub.estadoEspiritual || []).includes("No bautizado")) icons += "🟣";
  return icons;
}


function renderFila(pub, grupoNumero) {
  const id = pub.id;
  const nombre = pub.nombre || "Sin nombre";
  const iconos = getClaseFila(pub, grupoNumero);

  return `
    <tr data-id="${id}" data-grupo="${grupoNumero}">
      <td class="d-none checkbox-col"><input type="checkbox" class="form-check-input"></td>
      <td>${iconos + ' ' + nombre}</td>
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
    publicadores = await actualizarColeccion("publicadores");
  }

  for (let g = 1; g <= grupos; g++) {
    const grupoPublicadores = publicadores.filter(p => Number(p.grupo) === g);
    const tablaId = `tablaGrupo${g}`;

    const card = document.createElement("div");
    card.className = "col-12";

    card.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>Grupo ${g}</strong>
          <button class="btn btn-sm btn-outline-secondary" onclick="activarSeleccionGrupo(${g})">🧩 Cambiar publicadores</button>
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
              ${grupoPublicadores.map(pub => renderFila(pub, g)).join("")}
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
  await actualizarColeccion("publicadores");
  const grupos = getConfig()?.cantidadGrupos || 1;
  renderPublicadoresPorGrupo(grupos);
}


const form = document.getElementById('formPublicador');
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const idEdicion = form.getAttribute("data-edicion-id");

  const nombre = document.getElementById("nombre").value.trim();
  const fechaNacimiento = document.getElementById("fechaNacimiento").value || null;
  const fechaBautismo = document.getElementById("fechaBautismo").value || null;
  const sexo = document.getElementById("sexo").value;
  const esperanza = document.querySelector('input[name="esperanza"]:checked')?.value;
  const grupo = document.getElementById("grupo").value || null;

  const estadoEspiritual = [];
  document.querySelectorAll('.estadoEspiritual').forEach(cb => {
    if (cb.checked) estadoEspiritual.push(cb.value);
  });

  const privilegiosCongregacion = [];
  document.querySelectorAll('#formPublicador input[type="checkbox"]').forEach(cb => {
    const label = cb.labels?.[0]?.innerText?.trim();
    if (label && cb.checked && !estadoEspiritual.includes(cb.value)) {
      privilegiosCongregacion.push(label);
    }
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
    bootstrap.Modal.getInstance(document.getElementById("modalPublicador")).hide();

    // Actualizar vista
    await actualizarYRecargar();
  } catch (err) {
    console.error(err);
    mostrarBanner("❌ Error al guardar", "danger");
  }
});


async function editarPublicador(id) {
  try {
    // Obtener el publicador desde localStorage o Firestore
    let publicadores = JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

    let pub = publicadores.find(p => p.id === id);

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
    document.getElementById("fechaNacimiento").value = pub.fechaNacimiento || "";
    document.getElementById("fechaBautismo").value = pub.fechaBautismo || "";
    document.getElementById("sexo").value = pub.sexo || "";
    document.querySelector(`input[name="esperanza"][value="${pub.esperanza}"]`)?.click();
    document.getElementById("grupo").value = pub.grupo || "";

    // Privilegios
    const estado = pub.estadoEspiritual || [];
    const normalizados = estado.map(v => v?.toLowerCase().replace(' ',''));
    document.querySelectorAll('.estadoEspiritual').forEach(cb => {
      const valor = cb.value.toLowerCase().replace(' ','');
      cb.checked = normalizados.includes(valor);
    });

    // Privilegios de congregación
    const privCong = pub.privilegiosCongregacion || [];
    document.querySelectorAll('.privilegios').forEach(cb => {
      cb.checked = privCong.includes(cb.labels[0].innerText.trim());
    });
    controlarDesactivacionPrivilegios()
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById("modalPublicador"));
    modal.show();

  } catch (err) {
    console.error("Error al editar publicador:", err);
    alert("❌ Ocurrió un error al cargar los datos del publicador.");
  }
}


function controlarDesactivacionPrivilegios() {
  const valoresSeleccionados = Array.from(document.querySelectorAll('.estadoEspiritual:checked'))
    .map(cb => cb.value);

  const bloquear = valoresSeleccionados.includes("Inactivo");

  // Deshabilitar todo menos los dos especiales
  document.querySelectorAll('.estadoEspiritual').forEach(cb => {
    if (cb.value !== "Inactivo") {
      cb.disabled = bloquear;
      if (bloquear) cb.checked = false;
    }
  });
  document.querySelectorAll('.privilegios').forEach(cb => {
    cb.disabled = bloquear;
    if (bloquear) cb.checked = false;
  });
}


document.querySelectorAll('.estadoEspiritual').forEach(cb => {
  cb.addEventListener('change', controlarDesactivacionPrivilegios);
});


async function eliminarPublicador(id, nombre = "el publicador") {
  const confirmado = confirm(`¿Estás seguro de que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`);

  if (!confirmado) return;

  try {
    mostrarBanner("Eliminando publicador...", "info", true);

    await db.collection("publicadores").doc(id).delete();

    // Eliminar del localStorage
    const cache = localStorage.getItem("firebase_publicadores");
    if (cache) {
      const lista = JSON.parse(cache).filter(p => p.id !== id);
      localStorage.setItem("firebase_publicadores", JSON.stringify(lista));
    }

    mostrarBanner("✅ Publicador eliminado correctamente", "success", false, 3000);

    // Volver a renderizar
    const grupos = getConfig()?.cantidadGrupos || 1;
    renderPublicadoresPorGrupo(grupos);
  } catch (err) {
    console.error("Error al eliminar:", err);
    mostrarBanner("❌ Error al eliminar el publicador", "danger");
  }
}




