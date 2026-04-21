// Service Worker for Map It PWA
const CACHE_NAME = 'map-it-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle share target: redirect /share?url=...&title=... to /#/share?...
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share' && event.request.method === 'GET') {
    const sharedUrl = url.searchParams.get('url') || '';
    const sharedTitle = url.searchParams.get('title') || '';
    const sharedText = url.searchParams.get('text') || '';
    // Redirect to the app with share params in hash
    const redirectUrl = `/?share_url=${encodeURIComponent(sharedUrl)}&share_title=${encodeURIComponent(sharedTitle)}&share_text=${encodeURIComponent(sharedText)}`;
    event.respondWith(Response.redirect(redirectUrl, 302));
    return;
  }
  event.respondWith(fetch(event.request));
});
