var CACHE = 'joc-v1';
var ASSETS = [
  '/journey-of-champions/',
  '/journey-of-champions/index.html',
  '/journey-of-champions/icon-192.png',
  '/journey-of-champions/icon-512.png',
  '/journey-of-champions/manifest.json'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  // For Firebase requests always go to network
  if(e.request.url.indexOf('firebase')>-1||e.request.url.indexOf('googleapis')>-1){
    e.respondWith(fetch(e.request).catch(function(){return new Response('',{status:503});}));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r || fetch(e.request).then(function(resp){
        var clone = resp.clone();
        caches.open(CACHE).then(function(c){c.put(e.request, clone);});
        return resp;
      });
    }).catch(function(){
      return caches.match('/journey-of-champions/index.html');
    })
  );
});
