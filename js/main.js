// Nantes Perfumería: catálogo, pedido y envío por WhatsApp

// Número de WhatsApp de la tienda: código de país + número, sin "+" ni espacios (ej: 56912345678).
// Mientras esté vacío, los pedidos se copian y se abre el Instagram de la tienda.
const WHATSAPP_NUMBER = '';
const INSTAGRAM_URL = 'https://ig.me/m/nantes.perfumeria';

const CATS = { arabe: 'Árabe', disenador: 'Diseñador', nicho: 'Nicho' };
const BAG_KEY = 'nantes-pedido';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clp = (n) => '$' + n.toLocaleString('es-CL');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let PRODUCTS = [];
const state = { cat: 'todos', q: '', brand: '', sort: '' };
const chosen = {}; // tamaño elegido por producto

// ===== Pedido (se guarda en el navegador) =====
let BAG = [];
try { BAG = JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); } catch { BAG = []; }
const saveBag = () => { try { localStorage.setItem(BAG_KEY, JSON.stringify(BAG)); } catch {} };

function addToBag(id, ml) {
  const item = BAG.find((i) => i.id === id && i.ml === ml);
  if (item) item.qty += 1;
  else BAG.push({ id, ml, qty: 1 });
  saveBag();
  renderBag();
}
function changeQty(id, ml, delta) {
  const item = BAG.find((i) => i.id === id && i.ml === ml);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) BAG = BAG.filter((i) => i !== item);
  saveBag();
  renderBag();
}
const lines = () => BAG.map((i) => {
  const p = PRODUCTS.find((x) => x.id === i.id);
  const size = p && p.precios.find((s) => s.ml === i.ml);
  return p && size ? { ...i, p, precio: size.precio } : null;
}).filter(Boolean);
const bagTotal = () => lines().reduce((t, l) => t + l.precio * l.qty, 0);

function lineHtml(l) {
  return `<div class="line">
    <img src="img/productos/${l.p.id}.webp" alt="" width="56" height="56" loading="lazy">
    <div><h4>${esc(l.p.nombre)}</h4><p>${esc(l.p.marca)} · ${l.ml} ml</p>
      <div class="qty"><button type="button" data-qty="-1" data-id="${l.p.id}" data-ml="${l.ml}" aria-label="Quitar uno"><svg><use href="#i-minus"/></svg></button><span>${l.qty}</span><button type="button" data-qty="1" data-id="${l.p.id}" data-ml="${l.ml}" aria-label="Agregar uno"><svg><use href="#i-plus"/></svg></button></div>
    </div>
    <div class="line-price">${clp(l.precio * l.qty)}</div>
  </div>`;
}

function renderBag() {
  const ls = lines();
  const count = ls.reduce((t, l) => t + l.qty, 0);
  $$('[data-bag-count]').forEach((el) => { el.textContent = count; el.hidden = count === 0 && el.classList.contains('bag-count'); });
  $('.fab').hidden = count === 0;
  $('[data-bag-total]').textContent = clp(bagTotal());
  $('[data-bag-list]').innerHTML = ls.length ? ls.map(lineHtml).join('') : '<p class="drawer-empty">Aún no agregas perfumes.<br>Elige un tamaño en el catálogo y toca “Agregar”.</p>';
  $('[data-summary]').innerHTML = ls.length
    ? `<h3>Tu pedido</h3>${ls.map(lineHtml).join('')}<div class="summary-total"><span>Total estimado</span><b>${clp(bagTotal())}</b></div>`
    : '<h3>Tu pedido</h3><p class="muted">Todavía no agregas perfumes. <a href="#catalogo">Elige en el catálogo</a> o escribe en comentarios qué estás buscando.</p>';
}

document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-qty]');
  if (q) changeQty(q.dataset.id, +q.dataset.ml, +q.dataset.qty);
});

// ===== Panel lateral =====
const drawer = $('[data-drawer]');
const openBag = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
const closeBag = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
$$('[data-open-bag]').forEach((b) => b.addEventListener('click', openBag));
$$('[data-close-bag]').forEach((b) => b.addEventListener('click', closeBag));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBag(); });

let toastTimer;
function toast(msg) {
  const t = $('[data-toast]');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
}

// ===== Catálogo =====
function card(p, i) {
  const sel = chosen[p.id] ?? p.precios[0].ml;
  return `<article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms">
    <div class="card-media"><img src="img/productos/${p.id}.webp" alt="${esc(p.nombre)} de ${esc(p.marca)}" width="640" height="503" loading="lazy" decoding="async"><span class="card-tag">${CATS[p.cat]}</span></div>
    <div class="card-body">
      <span class="card-brand">${esc(p.marca)}</span>
      <h3>${esc(p.nombre)}</h3>
      <p class="card-desc">${esc(p.desc)}</p>
      <div class="sizes" role="radiogroup" aria-label="Tamaño de ${esc(p.nombre)}">
        ${p.precios.map((s) => `<button type="button" class="size${s.ml === sel ? ' is-active' : ''}" role="radio" aria-checked="${s.ml === sel}" data-size="${s.ml}" data-id="${p.id}"><b>${s.ml} ml</b><span>${clp(s.precio)}</span></button>`).join('')}
      </div>
      <button type="button" class="add" data-add="${p.id}"><svg><use href="#i-bag"/></svg> Agregar</button>
    </div>
  </article>`;
}

function filtered() {
  const q = norm(state.q.trim());
  let list = PRODUCTS.filter((p) =>
    (state.cat === 'todos' || p.cat === state.cat) &&
    (!state.brand || p.marca === state.brand) &&
    (!q || norm(`${p.nombre} ${p.marca} ${p.desc} ${CATS[p.cat]}`).includes(q)));
  const min = (p) => p.precios[0].precio;
  if (state.sort === 'asc') list = [...list].sort((a, b) => min(a) - min(b));
  if (state.sort === 'desc') list = [...list].sort((a, b) => min(b) - min(a));
  if (state.sort === 'az') list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return list;
}

function renderGrid() {
  const list = filtered();
  $('[data-grid]').innerHTML = list.map(card).join('');
  $('[data-empty]').hidden = list.length > 0;
  $('[data-results]').textContent = `${list.length} ${list.length === 1 ? 'fragancia' : 'fragancias'}`;
}

$('[data-grid]').addEventListener('click', (e) => {
  const size = e.target.closest('[data-size]');
  if (size) {
    chosen[size.dataset.id] = +size.dataset.size;
    $$(`[data-size][data-id="${size.dataset.id}"]`).forEach((b) => {
      const on = b === size;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on);
    });
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    const p = PRODUCTS.find((x) => x.id === add.dataset.add);
    const ml = chosen[p.id] ?? p.precios[0].ml;
    addToBag(p.id, ml);
    toast(`${p.nombre} ${ml} ml agregado a tu pedido`);
    add.classList.add('is-done');
    add.innerHTML = '<svg><use href="#i-check"/></svg> Agregado';
    setTimeout(() => { add.classList.remove('is-done'); add.innerHTML = '<svg><use href="#i-bag"/></svg> Agregar'; }, 1400);
  }
});

$$('.tab').forEach((t) => t.addEventListener('click', () => {
  state.cat = t.dataset.cat;
  $$('.tab').forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
  renderGrid();
}));
let searchTimer;
$('[data-search]').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120);
});
$('[data-brand]').addEventListener('change', (e) => { state.brand = e.target.value; renderGrid(); });
$('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

// ===== Envío por WhatsApp =====
function send(text) {
  if (WHATSAPP_NUMBER) {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return;
  }
  // Sin número configurado: se copia el pedido y se abre el chat de Instagram
  const go = () => window.open(INSTAGRAM_URL, '_blank', 'noopener');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { toast('Pedido copiado: pégalo en el chat'); go(); }, go);
  else go();
}

$$('[data-wa-direct]').forEach((a) => a.addEventListener('click', (e) => {
  if (!WHATSAPP_NUMBER) return; // sin número, el enlace baja al formulario
  e.preventDefault();
  send('Hola Nantes Perfumería! Quiero consultar por sus decants.');
}));

const form = $('[data-form]');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('[data-form-error]');
  const nombre = form.nombre.value.trim();
  const ciudad = form.ciudad.value.trim();
  const mensaje = form.mensaje.value.trim();
  form.nombre.classList.toggle('is-invalid', !nombre);
  form.ciudad.classList.toggle('is-invalid', !ciudad);
  const ls = lines();
  if (!nombre || !ciudad) { err.textContent = 'Completa tu nombre y tu comuna o ciudad.'; err.hidden = false; return; }
  if (!ls.length && !mensaje) { err.textContent = 'Agrega al menos un perfume desde el catálogo o escríbenos qué buscas en comentarios.'; err.hidden = false; return; }
  err.hidden = true;

  const out = ['Hola Nantes Perfumería! Quiero hacer este pedido:', ''];
  ls.forEach((l) => out.push(`• ${l.p.nombre} (${l.p.marca}) · ${l.ml} ml x${l.qty} · ${clp(l.precio * l.qty)}`));
  if (ls.length) out.push('', `Total estimado: ${clp(bagTotal())}`);
  out.push('', `Nombre: ${nombre}`, `Comuna / ciudad: ${ciudad}`, `Entrega: ${form.entrega.value}`);
  if (mensaje) out.push(`Comentarios: ${mensaje}`);
  send(out.join('\n'));
});

// ===== Inicio =====
$('[data-year]').textContent = new Date().getFullYear();
fetch('data/productos.json')
  .then((r) => r.json())
  .then((data) => {
    PRODUCTS = data;
    $$('[data-n]').forEach((el) => {
      const c = el.dataset.n;
      el.textContent = c === 'todos' ? data.length : data.filter((p) => p.cat === c).length;
    });
    $('[data-count-total]').textContent = data.length;
    const brands = [...new Set(data.map((p) => p.marca))].sort((a, b) => a.localeCompare(b, 'es'));
    $('[data-brand]').insertAdjacentHTML('beforeend', brands.map((b) => `<option>${esc(b)}</option>`).join(''));
    renderGrid();
    renderBag();
  })
  .catch(() => { $('[data-results]').textContent = 'No pudimos cargar el catálogo. Recarga la página.'; });
