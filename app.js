/* ============================================================
   EcoRuta Bolivia — app.js
   - Datos de respaldo embebidos: la landing SIEMPRE muestra contenido.
   - En vivo: enriquece cada ruta con la Wikipedia REST API
     (resumen en español + imagen de Wikimedia). CORS habilitado.
   ============================================================ */

// Fuente de datos: 6 áreas protegidas, ordenadas de mayor a menor altitud.
// "wiki" es el título exacto del artículo en es.wikipedia.org.
// La descripción es un respaldo que se reemplaza si la API responde.
const ROUTES = [
  {
    wiki: "Parque_nacional_Sajama",
    nombre: "Parque Nacional Sajama",
    eco: "Altiplano volcánico",
    alt: "4200 msnm",
    lat: -18.10, lon: -68.88,
    color: "linear-gradient(150deg,#2a6f97,#123528)",
    desc: "El parque más antiguo de Bolivia, dominado por el nevado Sajama (6.542 m) y los bosques de queñua más altos del planeta."
  },
  {
    wiki: "Salar_de_Uyuni",
    nombre: "Salar de Uyuni",
    eco: "Desierto de sal",
    alt: "3656 msnm",
    lat: -20.13, lon: -67.49,
    color: "linear-gradient(150deg,#dfe7ea,#8fa6ad)",
    desc: "El mayor desierto de sal del mundo: más de 10.000 km² de blanco absoluto que en época de lluvias se vuelve un espejo del cielo."
  },
  {
    wiki: "Parque_nacional_Torotoro",
    nombre: "Parque Nacional Torotoro",
    eco: "Cañones y cavernas",
    alt: "2700 msnm",
    lat: -18.13, lon: -65.76,
    color: "linear-gradient(150deg,#c98407,#6b3f10)",
    desc: "Cañones profundos, cavernas y miles de huellas de dinosaurios fosilizadas en la roca del altiplano cochabambino."
  },
  {
    wiki: "Yungas",
    nombre: "Los Yungas",
    eco: "Bosque de nubes",
    alt: "2000 msnm",
    lat: -16.27, lon: -67.79,
    color: "linear-gradient(150deg,#2d6a4f,#123528)",
    desc: "La transición entre los Andes y la Amazonía: valles empinados, neblina permanente y una biodiversidad que cambia con cada curva."
  },
  {
    wiki: "Parque_nacional_Madidi",
    nombre: "Parque Nacional Madidi",
    eco: "Amazonía",
    alt: "180 msnm",
    lat: -14.00, lon: -68.00,
    color: "linear-gradient(150deg,#40916c,#0d2b20)",
    desc: "Una de las áreas protegidas más biodiversas del mundo, desde cumbres de 5.500 m hasta selva amazónica a menos de 200 m."
  },
  {
    wiki: "Parque_nacional_Noel_Kempff_Mercado",
    nombre: "Noel Kempff Mercado",
    eco: "Amazonía · Patrimonio",
    alt: "200 msnm",
    lat: -14.00, lon: -60.80,
    color: "linear-gradient(150deg,#52796f,#132a20)",
    desc: "Patrimonio Mundial de la Unesco: mesetas de arenisca, cataratas y una de las selvas amazónicas mejor conservadas del planeta."
  }
];

const API = "https://es.wikipedia.org/api/rest_v1/page/summary/";

// Recorta un texto a ~n caracteres respetando palabras.
function trim(text, n = 190) {
  if (!text) return "";
  if (text.length <= n) return text;
  return text.slice(0, text.lastIndexOf(" ", n)).trim() + "…";
}

// Formatea coordenadas para mostrarlas como dato.
function fmtCoord(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`;
}

// Construye la tarjeta con el contenido de respaldo (se enriquece luego).
function cardMarkup(r, i) {
  return `
    <article class="card" data-index="${i}" style="transition-delay:${(i % 2) * 90}ms">
      <div class="card__media">
        <span class="card__eco">${r.eco}</span>
        <span class="card__alt">${r.alt}</span>
        <div class="card__fallback" style="background:${r.color}">${r.nombre}</div>
      </div>
      <div class="card__body">
        <h3 class="card__name">${r.nombre}</h3>
        <p class="card__desc" data-desc>${r.desc}</p>
        <div class="card__foot">
          <span class="card__coord">${fmtCoord(r.lat, r.lon)}</span>
          <a class="card__link" data-link href="https://es.wikipedia.org/wiki/${r.wiki}" target="_blank" rel="noopener">Saber más →</a>
        </div>
      </div>
    </article>`;
}

// Pinta una imagen sobre el fallback cuando la API devuelve una.
function setImage(container, src, alt) {
  if (!src) return;
  const img = new Image();
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  img.onload = () => {
    const fb = container.querySelector(".card__fallback, .tile__fallback");
    container.insertBefore(img, container.firstChild);
    if (fb) fb.style.display = "none";
  };
}

// Llama a la Wikipedia REST API con un límite de tiempo.
async function fetchSummary(title) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API + encodeURIComponent(title), {
      signal: ctrl.signal,
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------- Render de rutas + enriquecimiento en vivo ----------
async function renderRoutes() {
  const grid = document.getElementById("rutas-grid");
  grid.innerHTML = ROUTES.map(cardMarkup).join("");

  ROUTES.forEach(async (r, i) => {
    const card = grid.querySelector(`.card[data-index="${i}"]`);
    try {
      const data = await fetchSummary(r.wiki);
      if (data.extract) card.querySelector("[data-desc]").textContent = trim(data.extract);
      const src = (data.originalimage && data.originalimage.source) ||
                  (data.thumbnail && data.thumbnail.source);
      setImage(card.querySelector(".card__media"), src, r.nombre);
      const page = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page;
      if (page) card.querySelector("[data-link]").href = page;
    } catch (e) {
      // Sin conexión: se conserva el respaldo. Sin errores visibles.
      console.info("Ruta sin datos en vivo:", r.wiki);
    }
  });

  revealOnScroll(grid.querySelectorAll(".card"));
}

// ---------- Galería (reutiliza imágenes de las mismas áreas) ----------
async function renderGallery() {
  const grid = document.getElementById("galeria-grid");
  const shapes = ["tile--wide", "", "tile--tall", "", "", "tile--wide"];
  grid.innerHTML = ROUTES.map((r, i) => `
    <figure class="tile ${shapes[i] || ""}">
      <div class="tile__fallback" style="position:absolute;inset:0;background:${r.color}"></div>
      <figcaption class="tile__label">${r.nombre}</figcaption>
    </figure>`).join("");

  ROUTES.forEach(async (r, i) => {
    const tile = grid.children[i];
    try {
      const data = await fetchSummary(r.wiki);
      const src = (data.originalimage && data.originalimage.source) ||
                  (data.thumbnail && data.thumbnail.source);
      setImage(tile, src, r.nombre);
    } catch (e) { /* conserva la franja de color */ }
  });
}

// ---------- Poblado del <select> del formulario ----------
function fillSelect() {
  const sel = document.getElementById("ruta");
  ROUTES.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.nombre;
    opt.textContent = `${r.nombre} · ${r.alt}`;
    sel.appendChild(opt);
  });
}

// ---------- Formulario de reserva (cliente) ----------
function initForm() {
  const form = document.getElementById("reserva-form");
  const status = document.getElementById("form-status");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    const ruta = form.ruta.value;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!nombre || !ruta) {
      status.textContent = "Completá tu nombre y elegí una ruta.";
      status.className = "form__status err";
      return;
    }
    if (!ok) {
      status.textContent = "Revisá el correo: no parece válido.";
      status.className = "form__status err";
      return;
    }
    // En producción (Azure Static Web Apps) este envío iría a una
    // Azure Function: POST /api/reservas. Aquí lo resolvemos en el cliente.
    status.textContent = `¡Gracias, ${nombre}! Te escribimos a ${email} sobre "${ruta}" en menos de 24 h.`;
    status.className = "form__status ok";
    form.reset();
  });
}

// ---------- Navegación móvil ----------
function initNav() {
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

// ---------- Reveal al hacer scroll ----------
function revealOnScroll(nodes) {
  if (!("IntersectionObserver" in window)) {
    nodes.forEach(n => n.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  nodes.forEach(n => io.observe(n));
}

// ---------- Arranque ----------
document.addEventListener("DOMContentLoaded", () => {
  renderRoutes();
  renderGallery();
  fillSelect();
  initForm();
  initNav();
});
