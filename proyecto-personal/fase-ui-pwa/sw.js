'use strict';
// Service Worker PWA Offline-First para Navaja 27.
// Guarda las dos pantallas, los estilos, scripts, iconos, datos y recursos visuales locales.
const CACHE_NAME = "navaja27-barber-studio-v5-shell9-cortes-y-fotos";
const APP_SHELL = [
  "./",
  "./index.html",
  "./index.css",
  "./index.js",
  "./pwa.html",
  "./pwa.css",
  "./pwa.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/servicios.json",
  "./data/tendencias-2026.json",
  "./imagenes/barba.svg",
  "./imagenes/combo.svg",
  "./imagenes/corte.svg",
  "./imagenes/degradado.svg",
  "./imagenes/portada-barberia.svg",
  "./imagenes/corte-infantil.svg"
];
const JQUERY_CDN = "https://code.jquery.com/jquery-3.7.1.min.js";

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
  try {
    const response = await fetch(new Request(JQUERY_CDN, { mode: 'no-cors', cache: 'reload' }));
    if (response.ok || response.type === 'opaque') await cache.put(JQUERY_CDN, response);
  } catch (error) {
    console.warn('No se pudo precargar jQuery; se reintentará al recuperar conexión.', error);
  }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("navaja27-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isJQuery = url.href === JQUERY_CDN;
  if (url.searchParams.has("__n27_health")) { event.respondWith(fetch(request)); return; }
  const isPhoto = request.destination === 'image' && url.hostname === 'images.pexels.com';
  if (isPhoto) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(request);
      if (saved) return saved;
      try {
        const live = await fetch(request);
        if (live.ok || live.type === 'opaque') await cache.put(request, live.clone());
        return live;
      } catch (_) { return saved || Response.error(); }
    })());
    return;
  }
  if (!sameOrigin && !isJQuery) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const live = await fetch(request);
        if (live.ok) { const cache = await caches.open(CACHE_NAME); await cache.put(request, live.clone()); }
        return live;
      } catch (_) {
        const direct = await caches.match(request, { ignoreSearch: true });
        if (direct) return direct;
        const pwaTarget = url.pathname.endsWith('/pwa.html') ? './pwa.html' : './index.html';
        return (await caches.match(pwaTarget)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    try {
      const live = await fetch(request);
      if (live.ok || live.type === 'opaque') await cache.put(request, live.clone());
      return live;
    } catch (_) { return new Response('Recurso no disponible sin conexión.', { status: 503 }); }
  })());
});
