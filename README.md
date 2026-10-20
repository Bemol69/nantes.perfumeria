# Nantes Perfumería — sitio web

Catálogo de decants de @nantes.perfumeria. Sitio estático (HTML/CSS/JS), sin build, listo para Vercel.

## Editar
- **Productos y precios:** `data/productos.json` (nombre, marca, colección `arabe` / `disenador` / `nicho`, descripción y precios por ml). Foto en `img/productos/<id>.webp`.
- **WhatsApp:** `WHATSAPP_NUMBER` al inicio de `js/main.js` (ej. `56912345678`). Mientras esté vacío, el pedido se copia y se abre el chat de Instagram.

## Local
`python3 -m http.server` y abrir http://localhost:8000
