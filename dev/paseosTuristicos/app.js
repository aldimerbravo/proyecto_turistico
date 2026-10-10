
let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = null;

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const filtroPrecioMaximo = document.querySelector("#precioMaximo");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");
const alertaCupo = document.querySelector("#alertaCupo");
const textoAlertaCupo = document.querySelector("#textoAlertaCupo");
const cerrarAlertaCupo = document.querySelector("#cerrarAlertaCupo");
const btnVaciar = document.querySelector("#btnVaciar");
const confirmarVaciar = document.querySelector("#confirmarVaciar");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");

function formatearMoneda(valor) {
  return `$${valor.toLocaleString("es-MX")} MXN`;
}

function mostrarMensaje(texto, tipo = "error") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  mensaje.hidden = false;
}

function ocultarMensaje() {
  mensaje.hidden = true;
  mensaje.textContent = "";
  alertaCupo.hidden = true;
}


function mostrarAlertaCupo() {
  mensaje.hidden = true;
  alertaCupo.hidden = false;
  cerrarAlertaCupo.focus();
}


async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    mostrarMensaje("No se pudieron cargar las experiencias. Abre el proyecto con un servidor local.");
    console.error(error);
  }
}


function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }

  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda));
  }

  if (precioMaximo !== null) {
    resultados = resultados.filter(e => e.precio <= precioMaximo);
  }

  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);

  return resultados;
}


function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen" aria-hidden="true">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>`).join("");

  estado.textContent = `${resultados.length} resultado${resultados.length !== 1 ? "s" : ""}`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}


function agregarReserva(id) {
  ocultarMensaje();
  const experiencia = experiencias.find(e => e.id === id);
  const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);

  if (cantidad > experiencia.cupo) {
    mostrarAlertaCupo();
    return;
  }

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mostrarMensaje(`Cantidad no válida para "${experiencia.nombre}". Elige entre 1 y ${experiencia.cupo} personas.`);
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarAlertaCupo();
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarMensaje(`"${experiencia.nombre}" agregada a tu reservación.`, "exito");
  mostrarReservas();
}

function cambiarCantidad(id, cambio) {
  ocultarMensaje();
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  const nuevaCantidad = reserva.cantidad + cambio;

  if (nuevaCantidad < 1) {
    mostrarMensaje("La cantidad mínima es 1. Usa Eliminar para quitar la experiencia.");
    return;
  }
  if (nuevaCantidad > experiencia.cupo) {
    mostrarAlertaCupo();
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
}

function mostrarReservas() {
  confirmarVaciar.hidden = true;

  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonas.textContent = "0";
    btnVaciar.hidden = true;
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio}</p>
        <div class="control-cantidad">
          <button class="btn-cantidad btn-disminuir" data-id="${r.experienciaId}"
                  aria-label="Disminuir personas en ${r.nombre}" ${r.cantidad === 1 ? "disabled" : ""}>−</button>
          <span aria-live="polite">${r.cantidad}</span>
          <button class="btn-cantidad btn-aumentar" data-id="${r.experienciaId}"
                  aria-label="Aumentar personas en ${r.nombre}">+</button>
        </div>
      </div>
      <div>
        <strong>${formatearMoneda(r.subtotal)}</strong>
        <br>
        <button class="btn-eliminar" data-id="${r.experienciaId}"
                aria-label="Eliminar ${r.nombre}">Eliminar</button>
      </div>
    </article>`).join("");

  const totalReserva = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const personas = reservas.reduce((suma, r) => suma + r.cantidad, 0);

  total.textContent = formatearMoneda(totalReserva);
  totalPersonas.textContent = personas;
  btnVaciar.hidden = false;

  agregarEventosReservas();
}

function agregarEventosReservas() {
  document.querySelectorAll(".btn-eliminar[data-id]").forEach(boton => {
    boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
  });
  document.querySelectorAll(".btn-aumentar").forEach(boton => {
    boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.id), 1));
  });
  document.querySelectorAll(".btn-disminuir").forEach(boton => {
    boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.id), -1));
  });
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarMensaje("Experiencia eliminada de tu reservación.", "exito");
  mostrarReservas();
}

// ===== VACIAR RESERVACIÓN (con confirmación en la página) =====
function pedirConfirmacionVaciar() {
  confirmarVaciar.hidden = false;
  btnVaciar.hidden = true;
}

function cancelarVaciar() {
  confirmarVaciar.hidden = true;
  btnVaciar.hidden = reservas.length === 0;
}

function vaciarReservacion() {
  reservas = [];
  mostrarMensaje("La reservación se vació correctamente.", "exito");
  mostrarReservas();
}

// ===== EVENTOS DE LOS CONTROLES =====
buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

filtroPrecioMaximo.addEventListener("input", () => {
  const valor = filtroPrecioMaximo.value.trim();
  if (valor === "") {
    precioMaximo = null;
    ocultarMensaje();
  } else if (Number(valor) < 0 || isNaN(Number(valor))) {
    mostrarMensaje("El precio máximo debe ser un número positivo.");
    return;
  } else {
    precioMaximo = Number(valor);
    ocultarMensaje();
  }
  actualizarCatalogo();
});


catalogo.addEventListener("input", evento => {
  const campo = evento.target;
  if (!campo.id || !campo.id.startsWith("cantidad-")) return;

  const id = Number(campo.id.replace("cantidad-", ""));
  const experiencia = experiencias.find(e => e.id === id);

  if (Number(campo.value) > experiencia.cupo) {
    mostrarAlertaCupo();
  } else {
    alertaCupo.hidden = true;
  }
});

cerrarAlertaCupo.addEventListener("click", () => { alertaCupo.hidden = true; });

document.addEventListener("keydown", evento => {
  if (evento.key === "Escape") alertaCupo.hidden = true;
});

btnVaciar.addEventListener("click", pedirConfirmacionVaciar);
btnCancelarVaciar.addEventListener("click", cancelarVaciar);
btnConfirmarVaciar.addEventListener("click", vaciarReservacion);


cargarExperiencias();