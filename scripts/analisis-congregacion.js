async function iniciarAnalisisCongregacion() {
  const tbody = document.getElementById("listaPrecursoresRegulares");
  const selector = document.getElementById("anioServicioAnalisis");
  mostrarBanner("Cargando...", "info", true);
  try {
    const [publicadores, servicio, configuracion] = await Promise.all([
      consultarFirebase("publicadores"),
      consultarFirebase("servicio"),
      cargarConfiguracionGlobal(),
    ]);
    localStorage.setItem("firebase_publicadores", JSON.stringify(publicadores));
    const regulares = publicadores
      .filter((pub) => (pub.estadoEspiritual || []).includes("Precursor regular"))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const hoy = new Date();
    const anioActualServicio = hoy.getMonth() >= 8 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    const aniosServicioRegistrados = servicio
      .map((registro) => {
        const anio = parseInt(registro.anio, 10);
        const mes = parseInt(registro.mes, 10);
        if (!Number.isFinite(anio) || mes < 1 || mes > 12) return null;
        return obtenerAnioServicio(mes, anio);
      })
      .filter(Number.isFinite);
    const anioMinimo = Math.min(anioActualServicio - 5, ...aniosServicioRegistrados, anioActualServicio);
    const anioMaximo = Math.max(anioActualServicio + 1, ...aniosServicioRegistrados, anioActualServicio);
    for (let anio = anioMaximo; anio >= anioMinimo; anio--) {
      selector.add(new Option(`${anio} (sep. ${anio - 1} – ago. ${anio})`, String(anio)));
    }
    const aniosCompletadosConRegistros = aniosServicioRegistrados.filter(
      (anio) => anio < anioActualServicio,
    );
    const anioInicial = aniosCompletadosConRegistros.length
      ? Math.max(...aniosCompletadosConRegistros)
      : anioActualServicio;
    selector.value = String(anioInicial);
    const objetivoAnual = (Number(configuracion?.horasMensualesPrecursoresRegulares) || 0) * 12;
    const umbralAlerta = objetivoAnual * 0.95;

    function render() {
      const anioServicio = Number(selector.value);
      const totales = new Map(regulares.map((pub) => [String(pub.id), 0]));
      servicio.forEach((registro) => {
        const anio = parseInt(registro.anio, 10);
        const mes = parseInt(registro.mes, 10);
        const perteneceAlAnio = obtenerAnioServicio(mes, anio) === anioServicio;
        const id = String(registro.publicadorId ?? "");
        if (perteneceAlAnio && totales.has(id)) {
          totales.set(id, totales.get(id) + (Number(registro.horas) || 0));
        }
      });

      tbody.replaceChildren();
      if (!regulares.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay precursores regulares registrados.</td></tr>';
      } else {
        regulares.forEach((pub) => {
          const fila = document.createElement("tr");
          const nombre = document.createElement("td");
          nombre.textContent = pub.nombre || "Sin nombre";
          const horas = document.createElement("td");
          horas.className = "text-end";
          const totalPublicador = totales.get(String(pub.id)) || 0;
          horas.textContent = `${totalPublicador} h`;
          if (objetivoAnual > 0 && totalPublicador < umbralAlerta) {
            horas.style.color = "darkred";
          }
          const acciones = document.createElement("td");
          acciones.className = "text-end";
          const botonTarjeta = document.createElement("button");
          botonTarjeta.type = "button";
          botonTarjeta.className = "btn btn-sm btn-outline-primary";
          botonTarjeta.textContent = "👁 Ver tarjeta";
          botonTarjeta.addEventListener("click", () =>
            verTarjetaPublicador(pub.id, Number(selector.value)),
          );
          acciones.appendChild(botonTarjeta);
          fila.append(nombre, horas, acciones);
          tbody.appendChild(fila);
        });
      }
      const totalHoras = [...totales.values()].reduce((suma, horas) => suma + horas, 0);
      document.getElementById("totalHorasRegulares").textContent =
        `Total: ${totalHoras} horas${objetivoAnual > 0 ? ` · Objetivo anual: ${objetivoAnual} h` : ""}`;
    };
    selector.addEventListener("change", render);
    render();
    cerrarBanner();
  } catch (error) {
    console.error("Error al cargar el análisis de congregación:", error);
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">No se pudo cargar el análisis.</td></tr>';
    cerrarBanner();
    mostrarBanner("❌ Error al cargar el análisis de la congregación", "danger");
  }
}

iniciarAnalisisCongregacion();
