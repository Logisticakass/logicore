/* ============================================================
   LogiCore · script.js
   Módulos: Control de Recolecciones + Control de Visitas
   Guarda todo en localStorage. Si defines URL_APPS_SCRIPT,
   además manda cada registro nuevo/actualizado a Google Sheets.
   ============================================================ */

// 👉 Cuando tengas tu Apps Script desplegado, pega aquí la URL
// (la que termina en /exec). Mientras esté así, el sistema
// funciona 100% local y no intenta llamar a internet.
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbyDV-A6_DuU8o4sXeKqKYTxve0Nn6aOomKmySptax2Z4W7PNuNMKOtpb6g3tVuiLg-m/exec";

const ESTADOS_RECOLECCION = ["Pendiente", "Asignada", "En proceso", "Realizada", "Cancelada"];
const ESTADOS_VISITA = ["Programada", "Realizada", "Cancelada"];

let recolecciones = cargarDeLocalStorage("logicore_recolecciones");
let visitas = cargarDeLocalStorage("logicore_visitas");

// ============================================================
// CARGAR DATOS CENTRALES DESDE GOOGLE SHEETS
// ============================================================

async function cargarDatosDesdeSheets() {

  if (!URL_APPS_SCRIPT) return;

  actualizarEstadoSync("", "Cargando datos...");

  try {

    // -------------------------
    // RECOLECCIONES
    // -------------------------
    const respuestaRecolecciones = await fetch(
      `${URL_APPS_SCRIPT}?action=recolecciones`
    );

    const datosRecolecciones = await respuestaRecolecciones.json();

    if (!datosRecolecciones.ok) {
      throw new Error(
        datosRecolecciones.error ||
        "No se pudieron cargar las recolecciones"
      );
    }

    recolecciones = datosRecolecciones.datos || [];

    // Guardamos una copia local como respaldo
    guardarEnLocalStorage(
      "logicore_recolecciones",
      recolecciones
    );


    // -------------------------
    // VISITAS
    // -------------------------
    const respuestaVisitas = await fetch(
      `${URL_APPS_SCRIPT}?action=visitas`
    );

    const datosVisitas = await respuestaVisitas.json();

    if (!datosVisitas.ok) {
      throw new Error(
        datosVisitas.error ||
        "No se pudieron cargar las visitas"
      );
    }

    visitas = datosVisitas.datos || [];

    guardarEnLocalStorage(
      "logicore_visitas",
      visitas
    );


    // -------------------------
    // ACTUALIZAR PANTALLA
    // -------------------------
    renderRecolecciones();
    renderVisitas();

    actualizarEstadoSync(
      "ok",
      "Sincronizado con Sheets"
    );

    console.log(
      "Datos cargados desde Google Sheets:",
      {
        recolecciones: recolecciones.length,
        visitas: visitas.length
      }
    );

  } catch (error) {

    console.error(
      "Error cargando datos desde Google Sheets:",
      error
    );

    actualizarEstadoSync(
      "error",
      "Usando datos locales"
    );

    // Si Sheets falla, dejamos funcionando
    // los datos que ya estaban en localStorage.
    renderRecolecciones();
    renderVisitas();

  }

}

/* ============================================================
   SINCRONIZACIÓN AUTOMÁTICA MULTIUSUARIO
   ============================================================ */

const INTERVALO_SINCRONIZACION = 30000; // 30 segundos

setInterval(() => {

  // Solo sincronizamos si la pestaña está visible
  if (document.visibilityState === "visible") {
    cargarDatosDesdeSheets();
  }

}, INTERVALO_SINCRONIZACION);
document.addEventListener("visibilitychange", () => {

  if (document.visibilityState === "visible") {
    cargarDatosDesdeSheets();
  }

});

/* ---------------------- UTILIDADES ---------------------- */

function cargarDeLocalStorage(clave) {
  try {
    const datos = localStorage.getItem(clave);
    return datos ? JSON.parse(datos) : [];
  } catch (e) {
    console.error("Error leyendo localStorage:", e);
    return [];
  }
}

function guardarEnLocalStorage(clave, datos) {
  localStorage.setItem(clave, JSON.stringify(datos));
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return "--";

  // Nos quedamos únicamente con YYYY-MM-DD,
  // aunque Google Sheets mande fecha + hora.
  const fechaLimpia = String(fechaISO).split("T")[0];

  const [y, m, d] = fechaLimpia.split("-");

  if (!y || !m || !d) return "--";

  return `${d}/${m}/${y}`;
}

function mostrarToast(mensaje, esError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.classList.toggle("error", esError);
  toast.classList.add("mostrar");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove("mostrar"), 3200);
}

function actualizarEstadoSync(estado, mensaje) {
  const dot = document.getElementById("syncDot");
  const label = document.getElementById("syncLabel");
  dot.className = "dot" + (estado ? " " + estado : "");
  label.textContent = mensaje;
}

/* Envía un registro a Google Sheets vía Apps Script (si está configurado) */
function sincronizarConSheet(payload) {

    if (!URL_APPS_SCRIPT) return;

    actualizarEstadoSync("", "Sincronizando...");

console.log("DATOS ENVIADOS A SHEETS:", payload);

    fetch(URL_APPS_SCRIPT, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
    })
    .then(() => {

        console.log("Registro enviado a Google Sheets");

        actualizarEstadoSync(
            "ok",
            "Enviado a Sheets"
        );

    })
    .catch((err) => {

        console.error("Error enviando a Google Sheets:", err);

        actualizarEstadoSync(
            "error",
            "Sin conexión con Sheets"
        );

    });

}
async function buscarPedidoGoogle(folio){

    try{

        const respuesta = await fetch(

            URL_APPS_SCRIPT +
            "?action=pedido&folio=" +
            encodeURIComponent(folio)

        );

        return await respuesta.json();

    }catch(error){

        console.error(error);

        return null;

    }

}

/* ---------------------- NAVEGACIÓN ENTRE MÓDULOS ---------------------- */

document.querySelectorAll(".nav-link[data-modulo]").forEach((boton) => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".nav-link[data-modulo]").forEach((b) => b.classList.remove("active"));
    boton.classList.add("active");

    const destino = boton.dataset.modulo;
    document.querySelectorAll(".modulo").forEach((sec) => sec.classList.remove("activo"));
    document.getElementById("modulo-" + destino).classList.add("activo");
  });
});

/* ============================================================
   MÓDULO 1: CONTROL DE RECOLECCIONES
   ============================================================ */

const formRecoleccion = document.getElementById("formularioRecoleccion");
const inputFolio = document.getElementById("folio");
inputFolio.addEventListener("keydown", async (e) => {

    if (e.key !== "Enter") return;

    e.preventDefault();

    const folio = inputFolio.value.trim();

    if (!folio) return;

    mostrarToast("Buscando pedido...");

    const respuesta = await buscarPedidoGoogle(folio);

    if (!respuesta || !respuesta.ok) {

        mostrarToast("Pedido no encontrado", true);

        document.getElementById("infoPedido").style.display = "none";

        return;

    }

    const pedido = respuesta.datos;

    document.getElementById("infoPedido").style.display = "block";

    document.getElementById("pedidoTitulo").textContent = pedido.pedido;

    document.getElementById("datoOperador").textContent = pedido.operador || "-";
    document.getElementById("datoUnidad").textContent = pedido.unidad || "-";
    document.getElementById("datoCP").textContent = pedido.cp || "-";
    document.getElementById("datoColonia").textContent = pedido.colonia || "-";
    document.getElementById("datoMunicipio").textContent = pedido["muni/dele"] || "-";
    document.getElementById("datoEstatus").textContent = pedido.estatus || "-";
    document.getElementById("datoDocumento").textContent = pedido.documento || "-";
    document.getElementById("datoJaula").textContent = pedido.jaula || "-";

    mostrarToast("Pedido encontrado");

});
inputFolio.addEventListener("blur", async ()=>{

    const folio = inputFolio.value.trim();

    if(!folio) return;

    const respuesta = await buscarPedidoGoogle(folio);

    if(!respuesta){

        mostrarToast("No se pudo conectar con Google Sheets",true);

        return;

    }

    if(!respuesta.ok){

        mostrarToast("Pedido no encontrado",true);

        return;

    }

    const pedido = respuesta.datos;

    console.log(pedido);

});
const selectTienda = document.getElementById("tienda");
const inputFecha = document.getElementById("fechaCompromiso");
const inputJaula = document.getElementById("jaula");
const textareaObs = document.getElementById("observaciones");
const panelInicioRecolecciones = document.getElementById("panelInicioRecolecciones");
const inputDocumentoSalida = document.getElementById("documentoSalida");

// ============================================================
// PANEL DE CONSULTA DE PEDIDOS
// ============================================================

const panelBuscarPedido = document.getElementById("panelBuscarPedido");
const btnBuscarPedido = document.getElementById("btnBuscarPedido");
const btnRegresarBusqueda = document.getElementById("btnRegresarBusqueda");

btnBuscarPedido.addEventListener("click", () => {

    panelInicioRecolecciones.style.display = "none";
    formRecoleccion.style.display = "none";
    panelBuscarPedido.style.display = "block";

});

btnRegresarBusqueda.addEventListener("click", () => {

    panelBuscarPedido.style.display = "none";
    panelInicioRecolecciones.style.display = "grid";

});

// ============================================================
// EJECUTAR BÚSQUEDA DE PEDIDO
// ============================================================

const btnEjecutarBusqueda = document.getElementById("btnEjecutarBusqueda");
const folioBusquedaPedido = document.getElementById("folioBusquedaPedido");
const resultadoBusquedaPedido = document.getElementById("resultadoBusquedaPedido");

let pedidoConsultado = null;

async function ejecutarBusquedaPedido() {

    // Tomamos el folio, quitamos espacios y lo convertimos a MAYÚSCULAS
    const folio = folioBusquedaPedido.value.trim().toUpperCase();

    if (!folio) {
        mostrarToast("Escribe un folio para buscar", true);
        return;
    }

    // También mostramos el folio en mayúsculas en el campo
    folioBusquedaPedido.value = folio;

    // Evitamos que piquen varias veces mientras está buscando
    btnEjecutarBusqueda.disabled = true;
    const textoOriginalBoton = btnEjecutarBusqueda.textContent;
    btnEjecutarBusqueda.textContent = "Buscando...";

    mostrarToast("Buscando pedido...");

    try {

        const respuesta = await buscarPedidoGoogle(folio);

        if (!respuesta) {
            mostrarToast("No se pudo conectar con Google Sheets", true);
            resultadoBusquedaPedido.style.display = "none";
            return;
        }

        if (!respuesta.ok) {
            mostrarToast("Pedido no encontrado", true);
            resultadoBusquedaPedido.style.display = "none";
            return;
        }

        const pedido = respuesta.datos;

        pedidoConsultado = pedido;

        console.log("PEDIDO COMPLETO:", pedido);

        document.getElementById("consultaPedidoTitulo").textContent =
            pedido.pedido || folio;

        document.getElementById("consultaOperador").textContent =
            pedido.operador || "-";

        document.getElementById("consultaUnidad").textContent =
            pedido.unidad || "-";

        document.getElementById("consultaCP").textContent =
            pedido.cp || "-";

        document.getElementById("consultaColonia").textContent =
            pedido.colonia || "-";

        document.getElementById("consultaMunicipio").textContent =
            pedido["muni/dele"] || "-";

        document.getElementById("consultaEstatus").textContent =
            pedido.estatus || "-";

        document.getElementById("consultaDocumento").textContent =
            pedido.documento || "-";

        document.getElementById("consultaJaula").textContent =
            pedido.jaula || "-";

        resultadoBusquedaPedido.style.display = "block";

        mostrarToast("Pedido encontrado");

    } catch (error) {

        console.error("Error buscando pedido:", error);
        mostrarToast("Error al buscar el pedido", true);
        resultadoBusquedaPedido.style.display = "none";

    } finally {

        // Pase lo que pase, regresamos el botón a la normalidad
        btnEjecutarBusqueda.disabled = false;
        btnEjecutarBusqueda.textContent = textoOriginalBoton;

    }
}


// Buscar dando clic
btnEjecutarBusqueda.addEventListener("click", ejecutarBusquedaPedido);


// Buscar presionando ENTER
folioBusquedaPedido.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        event.preventDefault();
        ejecutarBusquedaPedido();
    }

});

// ============================================================
// CREAR RECOLECCIÓN DESDE PEDIDO CONSULTADO
// ============================================================

const btnCrearRecoleccionDesdePedido =
    document.getElementById("btnCrearRecoleccionDesdePedido");

btnCrearRecoleccionDesdePedido.addEventListener("click", () => {

    if (!pedidoConsultado) {
        mostrarToast("Primero debes consultar un pedido", true);
        return;
    }

    // Cerramos la consulta
    panelBuscarPedido.style.display = "none";

    // Limpiamos el formulario
    limpiarFormularioRecoleccion();

    // Abrimos el formulario de recolección
    formRecoleccion.style.display = "block";

    // Colocamos automáticamente el folio
    inputFolio.value =
        pedidoConsultado.pedido ||
        folioBusquedaPedido.value.trim();

        // Obtenemos el documento de salida desde el comentario
const comentarioPedido = pedidoConsultado.comentario || "";

const coincidenciaDocumento = comentarioPedido.match(
    /PASA\s+A\s+([A-Z0-9-]+)/i
);

inputDocumentoSalida.value =
    coincidenciaDocumento
        ? coincidenciaDocumento[1].toUpperCase()
        : pedidoConsultado.pedido || folioBusquedaPedido.value.trim();

    // Mostramos los datos del pedido
    document.getElementById("infoPedido").style.display = "block";

    document.getElementById("pedidoTitulo").textContent =
        pedidoConsultado.pedido || inputFolio.value;

    document.getElementById("datoOperador").textContent =
        pedidoConsultado.operador || "-";

    document.getElementById("datoUnidad").textContent =
        pedidoConsultado.unidad || "-";

    document.getElementById("datoCP").textContent =
        pedidoConsultado.cp || "-";

    document.getElementById("datoColonia").textContent =
        pedidoConsultado.colonia || "-";

    document.getElementById("datoMunicipio").textContent =
        pedidoConsultado["muni/dele"] || "-";

    document.getElementById("datoEstatus").textContent =
        pedidoConsultado.estatus || "-";

    document.getElementById("datoDocumento").textContent =
        pedidoConsultado.documento || "-";

    document.getElementById("datoJaula").textContent =
        pedidoConsultado.jaula || "-";

    // Si el pedido ya tiene jaula, la precargamos
    if (pedidoConsultado.jaula) {
        inputJaula.value = pedidoConsultado.jaula;
    }

    mostrarToast("Pedido cargado en la recolección");

});

document.getElementById("btnNuevaManual").addEventListener("click", () => {

    panelInicioRecolecciones.style.display = "none";

    formRecoleccion.style.display = "block";

    limpiarFormularioRecoleccion();

});

document.getElementById("btnCancelarRecoleccion").addEventListener("click", () => {

    formRecoleccion.style.display = "none";

    panelInicioRecolecciones.style.display = "grid";

    limpiarFormularioRecoleccion();

});

document.getElementById("btnGuardarRecoleccion").addEventListener("click", guardarRecoleccion);

document.getElementById("btnGuardarRecoleccion").addEventListener("click", guardarRecoleccion);

document.getElementById("buscarFolio").addEventListener("input", renderRecolecciones);
document.getElementById("filtroEstado").addEventListener("change", renderRecolecciones);

function limpiarFormularioRecoleccion() {

  inputFolio.value = "";
  inputDocumentoSalida.value = "";
  selectTienda.value = "";
  inputFecha.value = "";
  inputJaula.value = "";
  textareaObs.value = "";
  inputFechaRecoleccion.value = "";

 [
  inputFolio,
  inputDocumentoSalida,
  selectTienda,
  inputFecha,
  inputFechaRecoleccion
].forEach((c) => c.classList.remove("campo-error"));

  [
  "errorFolio",
  "errorDocumentoSalida",
  "errorTienda",
  "errorFecha",
  "errorFechaRecoleccion"
].forEach((id) => {
    document.getElementById(id).textContent = "";
  });

}

function guardarRecoleccion() {
  let valido = true;

  ["errorFolio", "errorTienda", "errorFecha"].forEach((id) => (document.getElementById(id).textContent = ""));
  [inputFolio, selectTienda, inputFecha].forEach((c) => c.classList.remove("campo-error"));

  const folio = inputFolio.value.trim();

  if (!folio) {
    document.getElementById("errorFolio").textContent = "El folio es obligatorio";
    inputFolio.classList.add("campo-error");
    valido = false;
  } else if (recolecciones.some((r) => r.folio.toLowerCase() === folio.toLowerCase())) {
    document.getElementById("errorFolio").textContent = "Este folio ya existe";
    inputFolio.classList.add("campo-error");
    valido = false;
  }

  if (!selectTienda.value) {
    document.getElementById("errorTienda").textContent = "Selecciona una tienda";
    selectTienda.classList.add("campo-error");
    valido = false;
  }

 if (!inputFecha.value) {
    document.getElementById("errorFecha").textContent = "La fecha de entrega es obligatoria";
    inputFecha.classList.add("campo-error");
    valido = false;
}

const inputFechaRecoleccion = document.getElementById("fechaRecoleccion");

if (!inputFechaRecoleccion.value) {
    document.getElementById("errorFechaRecoleccion").textContent = "La fecha de recolección es obligatoria";
    inputFechaRecoleccion.classList.add("campo-error");
    valido = false;
}

  if (!valido) return;

const nuevaRecoleccion = {
    id: generarId(),
    folio,
    documentoSalida: inputDocumentoSalida.value.trim() || folio,
    tienda: selectTienda.value,

    // Internamente conservamos fechaCompromiso,
    // pero en pantalla ahora se llama "Fecha de entrega"
    fechaCompromiso: inputFecha.value,

    // Nueva fecha
    fechaRecoleccion: inputFechaRecoleccion.value,

    observaciones: textareaObs.value.trim(),
    estado: "Pendiente",
    jaula: inputJaula.value.trim() || "--",
    ubicadoEn: "",
    creado: new Date().toISOString()
};

  recolecciones.push(nuevaRecoleccion);
  guardarEnLocalStorage("logicore_recolecciones", recolecciones);
  sincronizarConSheet({ tipo: "recoleccion", ...nuevaRecoleccion });

  formRecoleccion.style.display = "none";
  limpiarFormularioRecoleccion();
  renderRecolecciones();
  mostrarToast(`Recolección ${folio} guardada correctamente`);
}

function cambiarEstadoRecoleccion(id, nuevoEstado) {
  const registro = recolecciones.find((r) => r.id === id);
  if (!registro) return;
  registro.estado = nuevoEstado;
  guardarEnLocalStorage("logicore_recolecciones", recolecciones);
  sincronizarConSheet({ tipo: "recoleccion", ...registro });
  renderRecolecciones();
  mostrarToast(`Recolección ${registro.folio} → ${nuevoEstado}`);
}
function cambiarUbicacionRecoleccion(id, nuevaUbicacion) {

  const registro = recolecciones.find((r) => r.id === id);

  if (!registro) return;

  registro.ubicadoEn = nuevaUbicacion;

  guardarEnLocalStorage(
    "logicore_recolecciones",
    recolecciones
  );

  sincronizarConSheet({
    tipo: "recoleccion",
    ...registro
  });

  renderRecolecciones();

  mostrarToast(
    `Recolección ${registro.folio} → ${nuevaUbicacion || "Sin ubicar"}`
  );
}

function eliminarRecoleccion(id) {

  const registro = recolecciones.find((r) => r.id === id);

  if (!registro) return;

  if (!confirm(`¿Eliminar la recolección con folio ${registro.folio}?`)) {
    return;
  }

  // Enviar solicitud de eliminación a Google Sheets
  sincronizarConSheet({
    accion: "eliminar",
    tipo: "recoleccion",
    id: registro.id,
    folio: registro.folio
  });

  // Eliminar localmente
  recolecciones = recolecciones.filter((r) => r.id !== id);

  guardarEnLocalStorage(
    "logicore_recolecciones",
    recolecciones
  );

  renderRecolecciones();

  mostrarToast(`Recolección ${registro.folio} eliminada`);
}

function renderRecolecciones() {
  const tabla = document.getElementById("tablaRecolecciones");
  const vacio = document.getElementById("vacioRecolecciones");
  const busqueda = document.getElementById("buscarFolio").value.trim().toLowerCase();
  const filtroEstado = document.getElementById("filtroEstado").value;

  const filtrados = recolecciones.filter((r) => {
    const coincideTexto = !busqueda || r.folio.toLowerCase().includes(busqueda) || r.tienda.toLowerCase().includes(busqueda);
    const coincideEstado = !filtroEstado || r.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  tabla.innerHTML = "";

  filtrados
    .slice()
    .sort((a, b) => new Date(b.creado) - new Date(a.creado))
    .forEach((r) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td class="folio">${r.folio}</td>
        <td class="folio">${r.documentoSalida || r.folio}</td>
        <td>${r.tienda}</td>
<td>${formatearFecha(r.fechaCompromiso)}</td>
<td>${formatearFecha(r.fechaRecoleccion)}</td>
<td>
  <select class="selector-estado" data-id="${r.id}">
            ${ESTADOS_RECOLECCION.map((e) => `<option value="${e}" ${e === r.estado ? "selected" : ""}>${e}</option>`).join("")}
          </select>
        </td>
        <td class="mono">${r.jaula}</td>
        <td>
  <select class="selector-ubicacion" data-id="${r.id}">
    <option value="" ${!r.ubicadoEn ? "selected" : ""}>Sin ubicar</option>
    <option value="Almacen" ${r.ubicadoEn === "Almacen" ? "selected" : ""}>Almacén</option>
    <option value="Devoluciones" ${r.ubicadoEn === "Devoluciones" ? "selected" : ""}>Devoluciones</option>
  </select>
</td>
        <td>${r.observaciones || "--"}</td>
        <td class="fila-acciones">
          <button class="btn-icono eliminar" data-id="${r.id}" title="Eliminar">✕</button>
        </td>
      `;
      tabla.appendChild(fila);
    });

  vacio.style.display = filtrados.length ? "none" : "block";

  tabla.querySelectorAll(".selector-estado").forEach((sel) => {
    sel.addEventListener("change", (e) => cambiarEstadoRecoleccion(e.target.dataset.id, e.target.value));
  });
  tabla.querySelectorAll(".selector-ubicacion").forEach((sel) => {
  sel.addEventListener("change", (e) => {
    cambiarUbicacionRecoleccion(
      e.target.dataset.id,
      e.target.value
    );
  });
});
  tabla.querySelectorAll(".btn-icono.eliminar").forEach((btn) => {
    btn.addEventListener("click", (e) => eliminarRecoleccion(e.currentTarget.dataset.id));
  });

  renderKpisRecolecciones();
}

function renderKpisRecolecciones() {
  const cont = document.getElementById("kpisRecolecciones");
  const total = recolecciones.length;
  const porEstado = (estado) => recolecciones.filter((r) => r.estado === estado).length;

  cont.innerHTML = `
    <div class="kpi-card"><div class="valor">${total}</div><div class="etiqueta">Total registradas</div></div>
    <div class="kpi-card acento"><div class="valor">${porEstado("Pendiente")}</div><div class="etiqueta">Pendientes</div></div>
    <div class="kpi-card"><div class="valor">${porEstado("En proceso")}</div><div class="etiqueta">En proceso</div></div>
    <div class="kpi-card"><div class="valor">${porEstado("Realizada")}</div><div class="etiqueta">Realizadas</div></div>
    <div class="kpi-card"><div class="valor">${porEstado("Cancelada")}</div><div class="etiqueta">Canceladas</div></div>
  `;
}

/* ============================================================
   MÓDULO 2: CONTROL DE VISITAS
   ============================================================ */

const formVisita = document.getElementById("formularioVisita");
const selectTiendaVisita = document.getElementById("tiendaVisita");
const inputOperadorVisita = document.getElementById("operadorVisita");
const inputFechaProgramada = document.getElementById("fechaProgramada");
const textareaNotasVisita = document.getElementById("notasVisita");

document.getElementById("btnNuevaVisita").addEventListener("click", () => {
  const visible = formVisita.style.display === "block";
  formVisita.style.display = visible ? "none" : "block";
  if (!visible) limpiarFormularioVisita();
});

document.getElementById("btnCancelarVisita").addEventListener("click", () => {
  formVisita.style.display = "none";
  limpiarFormularioVisita();
});

document.getElementById("btnGuardarVisita").addEventListener("click", guardarVisita);

document.getElementById("buscarVisita").addEventListener("input", renderVisitas);
document.getElementById("filtroEstadoVisita").addEventListener("change", renderVisitas);

function limpiarFormularioVisita() {
  selectTiendaVisita.value = "";
  inputOperadorVisita.value = "";
  inputFechaProgramada.value = "";
  textareaNotasVisita.value = "";
  [selectTiendaVisita, inputOperadorVisita, inputFechaProgramada].forEach((c) => c.classList.remove("campo-error"));
  ["errorTiendaVisita", "errorOperadorVisita", "errorFechaVisita"].forEach((id) => (document.getElementById(id).textContent = ""));
}

function guardarVisita() {
  let valido = true;

  ["errorTiendaVisita", "errorOperadorVisita", "errorFechaVisita"].forEach((id) => (document.getElementById(id).textContent = ""));
  [selectTiendaVisita, inputOperadorVisita, inputFechaProgramada].forEach((c) => c.classList.remove("campo-error"));

  if (!selectTiendaVisita.value) {
    document.getElementById("errorTiendaVisita").textContent = "Selecciona una tienda";
    selectTiendaVisita.classList.add("campo-error");
    valido = false;
  }
  if (!inputOperadorVisita.value.trim()) {
    document.getElementById("errorOperadorVisita").textContent = "El operador es obligatorio";
    inputOperadorVisita.classList.add("campo-error");
    valido = false;
  }
  if (!inputFechaProgramada.value) {
    document.getElementById("errorFechaVisita").textContent = "La fecha programada es obligatoria";
    inputFechaProgramada.classList.add("campo-error");
    valido = false;
  }

  if (!valido) return;

  const nuevaVisita = {
    id: generarId(),
    tienda: selectTiendaVisita.value,
    operador: inputOperadorVisita.value.trim(),
    fechaProgramada: inputFechaProgramada.value,
    fechaRealizada: "",
    estado: "Programada",
    notas: textareaNotasVisita.value.trim(),
    creado: new Date().toISOString()
  };

  visitas.push(nuevaVisita);
  guardarEnLocalStorage("logicore_visitas", visitas);
  sincronizarConSheet({ tipo: "visita", ...nuevaVisita });

  formVisita.style.display = "none";
  limpiarFormularioVisita();
  renderVisitas();
  mostrarToast(`Visita a ${nuevaVisita.tienda} programada`);
}

function cambiarEstadoVisita(id, nuevoEstado) {
  const registro = visitas.find((v) => v.id === id);
  if (!registro) return;
  registro.estado = nuevoEstado;
  registro.fechaRealizada = nuevoEstado === "Realizada" ? new Date().toISOString().slice(0, 10) : registro.fechaRealizada;
  guardarEnLocalStorage("logicore_visitas", visitas);
  sincronizarConSheet({ tipo: "visita", ...registro });
  renderVisitas();
  mostrarToast(`Visita a ${registro.tienda} → ${nuevoEstado}`);
}

function eliminarVisita(id) {

  const registro = visitas.find((v) => v.id === id);

  if (!registro) return;

  if (!confirm(
    `¿Eliminar la visita a ${registro.tienda} del ${formatearFecha(registro.fechaProgramada)}?`
  )) {
    return;
  }

  // Eliminar también de Google Sheets
  sincronizarConSheet({
    accion: "eliminar",
    tipo: "visita",
    id: registro.id
  });

  // Eliminar de LogiCore
  visitas = visitas.filter((v) => v.id !== id);

  guardarEnLocalStorage("logicore_visitas", visitas);

  renderVisitas();

  mostrarToast("Visita eliminada");
}

function renderVisitas() {
  const tabla = document.getElementById("tablaVisitas");
  const vacio = document.getElementById("vacioVisitas");
  const busqueda = document.getElementById("buscarVisita").value.trim().toLowerCase();
  const filtroEstado = document.getElementById("filtroEstadoVisita").value;

  const filtrados = visitas.filter((v) => {
    const coincideTexto = !busqueda || v.tienda.toLowerCase().includes(busqueda) || v.operador.toLowerCase().includes(busqueda);
    const coincideEstado = !filtroEstado || v.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  tabla.innerHTML = "";

  filtrados
    .slice()
    .sort((a, b) => new Date(b.creado) - new Date(a.creado))
    .forEach((v) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${v.tienda}</td>
        <td>${v.operador}</td>
        <td>${formatearFecha(v.fechaProgramada)}</td>
        <td>
          <select class="selector-estado" data-id="${v.id}">
            ${ESTADOS_VISITA.map((e) => `<option value="${e}" ${e === v.estado ? "selected" : ""}>${e}</option>`).join("")}
          </select>
        </td>
        <td>${v.fechaRealizada ? formatearFecha(v.fechaRealizada) : "--"}</td>
        <td>${v.notas || "--"}</td>
        <td class="fila-acciones">
          <button class="btn-icono eliminar" data-id="${v.id}" title="Eliminar">✕</button>
        </td>
      `;
      tabla.appendChild(fila);
    });

  vacio.style.display = filtrados.length ? "none" : "block";

  tabla.querySelectorAll(".selector-estado").forEach((sel) => {
    sel.addEventListener("change", (e) => cambiarEstadoVisita(e.target.dataset.id, e.target.value));
  });
  tabla.querySelectorAll(".btn-icono.eliminar").forEach((btn) => {
    btn.addEventListener("click", (e) => eliminarVisita(e.currentTarget.dataset.id));
  });

  renderKpisVisitas();
}

function renderKpisVisitas() {
  const cont = document.getElementById("kpisVisitas");
  const total = visitas.length;
  const porEstado = (estado) => visitas.filter((v) => v.estado === estado).length;

  cont.innerHTML = `
    <div class="kpi-card"><div class="valor">${total}</div><div class="etiqueta">Total registradas</div></div>
    <div class="kpi-card acento"><div class="valor">${porEstado("Programada")}</div><div class="etiqueta">Programadas</div></div>
    <div class="kpi-card"><div class="valor">${porEstado("Realizada")}</div><div class="etiqueta">Realizadas</div></div>
    <div class="kpi-card"><div class="valor">${porEstado("Cancelada")}</div><div class="etiqueta">Canceladas</div></div>
  `;
}

/* ---------------------- INICIALIZACIÓN ---------------------- */

actualizarEstadoSync("", URL_APPS_SCRIPT ? "Sincronizando..." : "Guardado local (Sheets no configurado)");
renderRecolecciones();
renderVisitas();

// ============================================================
// INICIO DE LOGICORE
// ============================================================

cargarDatosDesdeSheets();