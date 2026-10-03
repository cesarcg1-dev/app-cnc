// ===== CONEXIÓN A SUPABASE =====          <- AQUÍ, en la línea 1
const SUPABASE_URL = "https://wrjunmbcuqzpavldlpao.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyanVubWJjdXF6cGF2bGRscGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjEyMDgsImV4cCI6MjEwNjUzNzIwOH0.LGKCKjan26Bmfw1UA3lLUSRVa9lrOC0fZydFOAPygbc";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);



// ===== DATOS =====
// Empresas y equipos viven en Supabase; aquí guardamos una copia para dibujar
let empresas = [];
let equipos = [];
// Tickets y servicios siguen en localStorage (los pasamos en el 8c)
let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
let servicios = JSON.parse(localStorage.getItem("servicios")) || [];
let idEnEdicion = null;



// ===== ELEMENTOS DE LA PÁGINA =====
const formEmpresa = document.getElementById("form-empresa");
const campoNombreEmpresa = document.getElementById("nombre-empresa");
const listaEmpresas = document.getElementById("lista-empresas");

const formEquipo = document.getElementById("form-equipo");
const selectEmpresa = document.getElementById("empresa-equipo");
const campoId = document.getElementById("id-equipo");
const campoNombre = document.getElementById("nombre-equipo");
const campoMarca = document.getElementById("marca-equipo");
const botonGuardar = formEquipo.querySelector("button");
const listaEquipos = document.getElementById("lista-equipos");

const formTicket = document.getElementById("form-ticket");
const selectEquipo = document.getElementById("equipo-ticket");
const campoDescripcion = document.getElementById("descripcion-ticket");
const listaTickets = document.getElementById("lista-tickets");

const formServicio = document.getElementById("form-servicio");
const selectEquipoServicio = document.getElementById("equipo-servicio");
const campoFecha = document.getElementById("fecha-servicio");
const campoDescripcionServicio = document.getElementById("descripcion-servicio");
const filtroServicios = document.getElementById("filtro-servicios");
const listaServicios = document.getElementById("lista-servicios");

// ===== FUNCIONES GENERALES =====
// Por ahora solo tickets y servicios se guardan en el navegador
function guardar() {
  localStorage.setItem("tickets", JSON.stringify(tickets));
  localStorage.setItem("servicios", JSON.stringify(servicios));
}

// Dado el id de una empresa, devuelve su nombre
function nombreDeEmpresa(empresaId) {
  const empresa = empresas.find(function (e) {
    return e.id === empresaId;
  });
  return empresa ? empresa.nombre : "Sin empresa";
}

// Si Supabase devolvió un error, lo muestra y devuelve true
function hayError(error) {
  if (error) {
    console.error(error);
    alert("Error con la base de datos: " + error.message);
    return true;
  }
  return false;
}

// ===== EMPRESAS =====
async function cargarEmpresas() {
  const { data, error } = await db.from("empresas").select("*").order("nombre");
  if (hayError(error)) return;
  empresas = data;
  mostrarEmpresas();
}

function llenarSelect() {
  const seleccionada = selectEmpresa.value;
  selectEmpresa.innerHTML = "";

  const opcionVacia = document.createElement("option");
  opcionVacia.value = "";
  opcionVacia.textContent = "-- Elige una empresa --";
  selectEmpresa.appendChild(opcionVacia);

  for (const empresa of empresas) {
    const opcion = document.createElement("option");
    opcion.value = empresa.id;
    opcion.textContent = empresa.nombre;
    selectEmpresa.appendChild(opcion);
  }
  selectEmpresa.value = seleccionada;
}

function mostrarEmpresas() {
  listaEmpresas.innerHTML = "";
  for (const empresa of empresas) {
    const li = document.createElement("li");
    li.textContent = empresa.nombre;

    const btnBorrar = document.createElement("button");
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", function () {
      borrarEmpresa(empresa.id);
    });

    li.appendChild(btnBorrar);
    listaEmpresas.appendChild(li);
  }
  llenarSelect();
}

async function borrarEmpresa(id) {
  const tieneEquipos = equipos.some(function (e) {
    return e.empresaId === id;
  });
  if (tieneEquipos) {
    alert("No se puede borrar: la empresa tiene equipos registrados.");
    return;
  }
  if (!confirm("¿Borrar la empresa " + nombreDeEmpresa(id) + "?")) return;

  const { error } = await db.from("empresas").delete().eq("id", id);
  if (hayError(error)) return;
  await cargarEmpresas();
}

formEmpresa.addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const nombre = campoNombreEmpresa.value.trim();

  const yaExiste = empresas.some(function (e) {
    return e.nombre.toLowerCase() === nombre.toLowerCase();
  });
  if (yaExiste) {
    alert("Ya existe una empresa con ese nombre.");
    return;
  }

  // La base de datos genera sola el id y la fecha de creación
  const { error } = await db.from("empresas").insert({ nombre: nombre });
  if (hayError(error)) return;

  formEmpresa.reset();
  await cargarEmpresas();
});

// ===== EQUIPOS =====
async function cargarEquipos() {
  const { data, error } = await db.from("equipos").select("*").order("id");
  if (hayError(error)) return;

  // En la base la columna se llama empresa_id; en el código usamos empresaId
  equipos = data.map(function (fila) {
    return {
      id: fila.id,
      nombre: fila.nombre,
      marca: fila.marca,
      empresaId: fila.empresa_id
    };
  });
  mostrarEquipos();
}

function mostrarEquipos() {
  listaEquipos.innerHTML = "";
  for (const equipo of equipos) {
    const li = document.createElement("li");
    li.textContent =
      equipo.id + " - " + equipo.nombre + " (" + equipo.marca + ") · " +
      nombreDeEmpresa(equipo.empresaId);

    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", function () {
      editarEquipo(equipo.id);
    });

    const btnBorrar = document.createElement("button");
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", function () {
      borrarEquipo(equipo.id);
    });

    li.appendChild(btnEditar);
    li.appendChild(btnBorrar);
    listaEquipos.appendChild(li);
  }
  llenarSelectEquipos();
  llenarSelectsServicios();
}

function editarEquipo(id) {
  const equipo = equipos.find(function (e) {
    return e.id === id;
  });
  selectEmpresa.value = equipo.empresaId || "";
  campoId.value = equipo.id;
  campoNombre.value = equipo.nombre;
  campoMarca.value = equipo.marca;
  campoId.disabled = true;
  botonGuardar.textContent = "Guardar cambios";
  idEnEdicion = id;
}

async function borrarEquipo(id) {
  const tieneRegistros =
    tickets.some(function (t) {
      return t.equipoId === id;
    }) ||
    servicios.some(function (s) {
      return s.equipoId === id;
    });
  if (tieneRegistros) {
    alert("No se puede borrar: el equipo tiene tickets o servicios registrados.");
    return;
  }
  if (!confirm("¿Borrar el equipo " + id + "?")) return;

  const { error } = await db.from("equipos").delete().eq("id", id);
  if (hayError(error)) return;
  await cargarEquipos();
}

formEquipo.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const empresaId = selectEmpresa.value;
  const id = campoId.value.trim().toUpperCase();
  const nombre = campoNombre.value.trim();
  const marca = campoMarca.value.trim();

  if (idEnEdicion === null) {
    const yaExiste = equipos.some(function (e) {
      return e.id === id;
    });
    if (yaExiste) {
      alert("Ya existe un equipo con el identificador " + id);
      return;
    }
    const { error } = await db
      .from("equipos")
      .insert({ id: id, nombre: nombre, marca: marca, empresa_id: empresaId });
    if (hayError(error)) return;
  } else {
    const { error } = await db
      .from("equipos")
      .update({ nombre: nombre, marca: marca, empresa_id: empresaId })
      .eq("id", idEnEdicion);
    if (hayError(error)) return;
  }

  formEquipo.reset();
  campoId.disabled = false;
  botonGuardar.textContent = "Agregar equipo";
  idEnEdicion = null;
  await cargarEquipos();
});



// ===== TICKETS =====
const ESTADOS = ["Abierto", "En proceso", "Cerrado"];

function llenarSelectEquipos() {
  const seleccionado = selectEquipo.value;
  selectEquipo.innerHTML = "";

  const opcionVacia = document.createElement("option");
  opcionVacia.value = "";
  opcionVacia.textContent = "-- Elige un equipo --";
  selectEquipo.appendChild(opcionVacia);

  for (const equipo of equipos) {
    const opcion = document.createElement("option");
    opcion.value = equipo.id;
    opcion.textContent =
      equipo.id + " - " + equipo.nombre + " (" + nombreDeEmpresa(equipo.empresaId) + ")";
    selectEquipo.appendChild(opcion);
  }
  selectEquipo.value = seleccionado;
}

function mostrarTickets() {
  listaTickets.innerHTML = "";
  for (const ticket of tickets) {
    const li = document.createElement("li");
    li.textContent =
      new Date(ticket.fecha).toLocaleDateString("es-MX") + " · " +
      ticket.equipoId + " · " + ticket.descripcion + " · ";

    // Menú para cambiar el estado del ticket
    const selectEstado = document.createElement("select");
    for (const estado of ESTADOS) {
      const opcion = document.createElement("option");
      opcion.value = estado;
      opcion.textContent = estado;
      if (estado === ticket.estado) opcion.selected = true;
      selectEstado.appendChild(opcion);
    }
    selectEstado.addEventListener("change", function () {
      ticket.estado = selectEstado.value;
      guardar();
    });

    const btnBorrar = document.createElement("button");
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", function () {
      borrarTicket(ticket.id);
    });

    li.appendChild(selectEstado);
    li.appendChild(btnBorrar);
    listaTickets.appendChild(li);
  }
}

function borrarTicket(id) {
  if (!confirm("¿Borrar este ticket?")) return;
  tickets = tickets.filter(function (t) {
    return t.id !== id;
  });
  guardar();
  mostrarTickets();
}

formTicket.addEventListener("submit", function (evento) {
  evento.preventDefault();

  tickets.unshift({
    id: Date.now().toString(),
    equipoId: selectEquipo.value,
    descripcion: campoDescripcion.value.trim(),
    estado: "Abierto",
    fecha: new Date().toISOString()
  });

  guardar();
  mostrarTickets();
  formTicket.reset();
});


// ===== SERVICIOS =====

// Llena cualquier <select> con la lista de equipos
function llenarSelectDeEquipos(select, textoVacio) {
  const seleccionado = select.value;
  select.innerHTML = "";

  const opcionVacia = document.createElement("option");
  opcionVacia.value = "";
  opcionVacia.textContent = textoVacio;
  select.appendChild(opcionVacia);

  for (const equipo of equipos) {
    const opcion = document.createElement("option");
    opcion.value = equipo.id;
    opcion.textContent =
      equipo.id + " - " + equipo.nombre + " (" + nombreDeEmpresa(equipo.empresaId) + ")";
    select.appendChild(opcion);
  }
  select.value = seleccionado;
}

function llenarSelectsServicios() {
  llenarSelectDeEquipos(selectEquipoServicio, "-- Elige un equipo --");
  llenarSelectDeEquipos(filtroServicios, "Todos los equipos");
}

// Fecha de hoy en formato AAAA-MM-DD (el que usa <input type="date">)
function fechaDeHoy() {
  return new Date().toLocaleDateString("en-CA");
}

// Convierte "2026-10-02" en "02/10/2026"
function fechaLegible(fecha) {
  const partes = fecha.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function mostrarServicios() {
  listaServicios.innerHTML = "";

  // Aplicar el filtro (valor vacío = todos los equipos)
  const equipoFiltrado = filtroServicios.value;
  const visibles = servicios.filter(function (s) {
    return equipoFiltrado === "" || s.equipoId === equipoFiltrado;
  });

  // Del más reciente al más antiguo
  visibles.sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha);
  });

  for (const servicio of visibles) {
    const li = document.createElement("li");
    li.textContent =
      fechaLegible(servicio.fecha) + " · " + servicio.equipoId + " · " + servicio.descripcion;

    const btnBorrar = document.createElement("button");
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", function () {
      borrarServicio(servicio.id);
    });

    li.appendChild(btnBorrar);
    listaServicios.appendChild(li);
  }
}

function borrarServicio(id) {
  if (!confirm("¿Borrar este servicio?")) return;
  servicios = servicios.filter(function (s) {
    return s.id !== id;
  });
  guardar();
  mostrarServicios();
}

formServicio.addEventListener("submit", function (evento) {
  evento.preventDefault();

  servicios.unshift({
    id: Date.now().toString(),
    equipoId: selectEquipoServicio.value,
    fecha: campoFecha.value,
    descripcion: campoDescripcionServicio.value.trim()
  });

  guardar();
  mostrarServicios();
  formServicio.reset();
  campoFecha.value = fechaDeHoy();
});

// Al cambiar el filtro, volvemos a dibujar la lista
filtroServicios.addEventListener("change", mostrarServicios);

// ===== NAVEGACIÓN ENTRE SECCIONES =====
const botonesMenu = document.querySelectorAll("#menu button");
const secciones = document.querySelectorAll(".seccion");

function mostrarSeccion(nombre) {
  // Mostrar solo la sección elegida
  for (const seccion of secciones) {
    seccion.hidden = seccion.id !== "seccion-" + nombre;
  }
  // Marcar el botón activo
  for (const boton of botonesMenu) {
    boton.classList.toggle("activo", boton.dataset.seccion === nombre);
  }
  // Recordar la pestaña para la próxima vez
  localStorage.setItem("seccionActiva", nombre);
}

for (const boton of botonesMenu) {
  boton.addEventListener("click", function () {
    mostrarSeccion(boton.dataset.seccion);
  });
}


// ===== AL ABRIR LA PÁGINA =====
async function iniciar() {
  await cargarEmpresas(); // primero las empresas: los equipos necesitan sus nombres
  await cargarEquipos();
  mostrarTickets();
  mostrarServicios();
}

campoFecha.value = fechaDeHoy();
mostrarSeccion(localStorage.getItem("seccionActiva") || "empresas");
iniciar();