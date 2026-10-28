/* Recensement des racks : derniere version si reseau, copie locale sinon (chambre froide) */
var CACHE = 'recensement-racks-v7';
var FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
e.waitUntil(caches.open(CACHE).then(function (c) {
return Promise.all(FICHIERS.map(function (f) { return fetch(f, { cache: 'reload' }).then(function (r) { if (r && r.ok) return c.put(f, r); }).catch(function () { }); }));
}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
e.waitUntil(caches.keys().then(function (ks) {
return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
}).then(function () { return self.clients.claim(); }));
});
function estPage(req, url) { return req.mode === 'navigate' || /\/$|\.html$|\.webmanifest$/.test(url.pathname); }
self.addEventListener('fetch', function (e) {
var req = e.request, url = new URL(req.url);
if (req.method !== 'GET' || url.origin !== location.origin) return;
if (estPage(req, url)) {
/* reseau d'abord (4 s max), copie locale si pas de reseau */
e.respondWith(caches.open(CACHE).then(function (c) {
return new Promise(function (resolve) {
var fini = false;
function rendre(r) { if (!fini && r) { fini = true; resolve(r); } }
var t = setTimeout(function () { c.match(req, { ignoreSearch: true }).then(rendre); }, 4000);
fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
if (r && r.ok) c.put(req, r.clone());
clearTimeout(t); rendre(r);
}).catch(function () {
clearTimeout(t);
c.match(req, { ignoreSearch: true }).then(function (h) { rendre(h || Response.error()); });
});
});
}));
return;
}
/* icones : copie locale d'abord */
e.respondWith(caches.open(CACHE).then(function (c) {
return c.match(req, { ignoreSearch: true }).then(function (hit) {
var reseau = fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(function () { return hit; });
return hit || reseau;
});
}));
});
