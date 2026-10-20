// Nantes Perfumería: catálogo, selector de ml, carrito y pedido por WhatsApp

// Número de WhatsApp de la tienda: código de país + número, sin "+" ni espacios (ej: 56912345678).
// Mientras esté vacío, el pedido se copia y se abre el chat de Instagram.
const WHATSAPP_NUMBER = '';
const INSTAGRAM_URL = 'https://ig.me/m/nantes.perfumeria';

const CATS = { arabe: 'Árabe', disenador: 'Diseñador', nicho: 'Nicho' };
const SPRAYS = { 1: '15–20', 3: '40–45', 5: '65–75', 10: '135–150', 15: '200–225', 30: '400–450' };
const CART_KEY = 'nantes-carrito';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clp = (n) => '$' + n.toLocaleString('es-CL');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let PRODUCTS = [];
const state = { cat: 'todos', q: '', sort: '' };

// ===== Carrito (se guarda en el navegador) =====
let CART = [];
try { CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { CART = []; }
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(CART)); } catch {} };

function addToCart(id, ml, qty) {
  const item = CART.find((i) => i.id === id && i.ml === ml);
  if (item) item.qty += qty;
  else CART.push({ id, ml, qty });
  saveCart();
  renderCart();
}
function changeQty(id, ml, delta) {
  const item = CART.find((i) => i.id === id && i.ml === ml);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) CART = CART.filter((i) => i !== item);
  saveCart();
  renderCart();
}
const lines = () => CART.map((i) => {
  const p = PRODUCTS.find((x) => x.id === i.id);
  const size = p && p.precios.find((s) => s.ml === i.ml);
  return size ? { ...i, p, precio: size.precio } : null;
}).filter(Boolean);
const cartTotal = () => lines().reduce((t, l) => t + l.precio * l.qty, 0);

const lineHtml = (l) => `<div class="line">
  <img src="img/productos/${l.p.id}.webp" alt="" width="60" height="60" loading="lazy">
  <div><h4>${esc(l.p.nombre)}</h4><p>${esc(l.p.marca)} · ${l.ml} ml · ${clp(l.precio)} c/u</p>
    <div class="qty"><button type="button" data-qty="-1" data-id="${l.p.id}" data-ml="${l.ml}" aria-label="Quitar uno"><svg><use href="#i-minus"/></svg></button><span>${l.qty}</span><button type="button" data-qty="1" data-id="${l.p.id}" data-ml="${l.ml}" aria-label="Agregar uno"><svg><use href="#i-plus"/></svg></button></div>
  </div>
  <div class="line-price">${clp(l.precio * l.qty)}</div>
</div>`;

function renderCart() {
  const ls = lines();
  const count = ls.reduce((t, l) => t + l.qty, 0);
  const total = clp(cartTotal());
  $$('[data-cart-count]').forEach((el) => { el.textContent = count; });
  $('[data-fab-total]').textContent = total;
  $('.fab').hidden = count === 0;
  $('[data-cart-total]').textContent = total;
  $('[data-cart-list]').innerHTML = ls.length ? ls.map(lineHtml).join('') : '<p class="cart-empty">Tu carrito está vacío.<br>Toca “Seleccionar” en un perfume para agregarlo.</p>';
  $('[data-summary]').innerHTML = ls.length
    ? `${ls.map(lineHtml).join('')}<div class="sum-total"><span>Total estimado</span><b>${total}</b></div>`
    : '<p class="muted">Tu carrito está vacío. <a href="#catalogo">Elige tus perfumes</a> o escríbenos en comentarios qué estás buscando.</p>';
}

document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-qty]');
  if (q) changeQty(q.dataset.id, +q.dataset.ml, +q.dataset.qty);
});

// ===== Panel del carrito =====
const drawer = $('[data-drawer]');
const openCart = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
const closeCart = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', openCart));
$$('[data-close-cart]').forEach((b) => b.addEventListener('click', closeCart));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

let toastTimer;
function toast(msg) {
  const t = $('[data-toast]');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2400);
}

// ===== Catálogo =====
const minPrice = (p) => Math.min(...p.precios.map((s) => s.precio));

const card = (p, i) => `<article class="card" data-open="${p.id}" style="animation-delay:${Math.min(i, 12) * 40}ms">
  <div class="card-media"><img src="img/productos/${p.id}.webp" alt="${esc(p.nombre)} de ${esc(p.marca)}" width="900" height="727" loading="lazy" decoding="async"><span class="tag">${CATS[p.cat]}</span></div>
  <div class="card-body">
    <span class="card-brand">${esc(p.marca)}</span>
    <h3>${esc(p.nombre)}</h3>
    <p class="card-desc">${esc(p.desc)}</p>
    <div class="card-foot">
      <div class="from"><small>Desde</small><b>${clp(minPrice(p))}</b></div>
      <button type="button" class="select-btn" aria-label="Seleccionar ${esc(p.nombre)}"><span>Seleccionar</span><svg><use href="#i-plus"/></svg></button>
    </div>
  </div>
</article>`;

function filtered() {
  const q = norm(state.q.trim());
  let list = PRODUCTS.filter((p) =>
    (state.cat === 'todos' || p.cat === state.cat) &&
    (!q || norm(`${p.nombre} ${p.marca} ${p.desc} ${CATS[p.cat]}`).includes(q)));
  if (state.sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
  if (state.sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
  if (state.sort === 'az') list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return list;
}

function renderGrid() {
  const list = filtered();
  $('[data-grid]').innerHTML = list.map(card).join('');
  $('[data-empty]').hidden = list.length > 0;
}

function setCat(cat) {
  state.cat = cat;
  $$('.seg-btn').forEach((x) => { const on = x.dataset.cat === cat; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on); });
  renderGrid();
}
$$('.seg-btn').forEach((b) => b.addEventListener('click', () => setCat(b.dataset.cat)));
$$('[data-go-cat]').forEach((b) => b.addEventListener('click', () => {
  setCat(b.dataset.goCat);
  $('#catalogo').scrollIntoView({ behavior: 'smooth' });
}));
let searchTimer;
$('[data-search]').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120);
});
$('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

// ===== Selector de ml =====
const sheet = $('[data-sheet]');
const pick = { p: null, ml: 0, qty: 1 };

function renderPick() {
  const size = pick.p.precios.find((s) => s.ml === pick.ml);
  $$('.ml', sheet).forEach((b) => { const on = +b.dataset.ml === pick.ml; b.classList.toggle('is-active', on); b.setAttribute('aria-checked', on); });
  $('[data-sheet-qty-n]').textContent = pick.qty;
  $('[data-sheet-price]').textContent = clp(size.precio * pick.qty);
  $('[data-sheet-hint]').innerHTML = SPRAYS[pick.ml] ? `<svg><use href="#i-drop"/></svg> ${pick.ml} ml rinde aprox. ${SPRAYS[pick.ml]} atomizaciones` : '';
}

function openPick(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  Object.assign(pick, { p, ml: p.precios[0].ml, qty: 1 });
  const img = $('[data-sheet-img]');
  img.src = `img/productos/${p.id}.webp`;
  img.alt = `${p.nombre} de ${p.marca}`;
  img.parentElement.style.setProperty('--img', `url("${new URL(`img/productos/${p.id}.webp`, location.href).href}")`);
  $('[data-sheet-cat]').textContent = CATS[p.cat];
  $('[data-sheet-brand]').textContent = p.marca;
  $('[data-sheet-name]').textContent = p.nombre;
  $('[data-sheet-desc]').textContent = p.desc;
  $('[data-sheet-sizes]').innerHTML = p.precios.map((s) => `<button type="button" class="ml" role="radio" aria-checked="false" data-ml="${s.ml}"><b>${s.ml} ml</b><span>${clp(s.precio)}</span></button>`).join('');
  renderPick();
  sheet.showModal();
}

$('[data-grid]').addEventListener('click', (e) => {
  const c = e.target.closest('[data-open]');
  if (c) openPick(c.dataset.open);
});
$('[data-sheet-sizes]').addEventListener('click', (e) => {
  const b = e.target.closest('.ml');
  if (!b) return;
  pick.ml = +b.dataset.ml;
  renderPick();
});
$$('[data-sheet-qty]').forEach((b) => b.addEventListener('click', () => {
  pick.qty = Math.max(1, pick.qty + +b.dataset.sheetQty);
  renderPick();
}));
$('[data-sheet-add]').addEventListener('click', () => {
  addToCart(pick.p.id, pick.ml, pick.qty);
  sheet.close();
  toast(`${pick.p.nombre} ${pick.ml} ml agregado al carrito`);
});
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // clic fuera del cuadro

// ===== Envío por WhatsApp =====
function send(text) {
  if (WHATSAPP_NUMBER) {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return;
  }
  const go = () => window.open(INSTAGRAM_URL, '_blank', 'noopener');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { toast('Pedido copiado: pégalo en el chat'); go(); }, go);
  else go();
}

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
  if (!ls.length && !mensaje) { err.textContent = 'Agrega al menos un perfume al carrito o cuéntanos en comentarios qué buscas.'; err.hidden = false; return; }
  err.hidden = true;

  const out = ['Hola Nantes Perfumería! Quiero hacer este pedido:', ''];
  ls.forEach((l) => out.push(`• ${l.p.nombre} (${l.p.marca}) · ${l.ml} ml x${l.qty} · ${clp(l.precio * l.qty)}`));
  if (ls.length) out.push('', `Total estimado: ${clp(cartTotal())}`);
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
    $('[data-total]').textContent = data.length;
    $('[data-min]').textContent = clp(Math.min(...data.map(minPrice)));
    $$('[data-coll-n]').forEach((el) => { el.textContent = `${data.filter((p) => p.cat === el.dataset.collN).length} fragancias`; });
    renderGrid();
    renderCart();
  })
  .catch(() => { $('[data-grid]').innerHTML = '<p class="empty">No pudimos cargar el catálogo. Recarga la página.</p>'; });
