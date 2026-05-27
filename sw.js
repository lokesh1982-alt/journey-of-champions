// Journey of Champions Service Worker v3
// Caches app shell for instant loading

var CACHE = 'joc-v3';
var APP_SHELL = [
  '/journey-of-champions/',
  '/journey-of-champions/index.html',
  '/journey-of-champions/icon-192.png',
  '/journey-of-champions/icon-512.png',
  '/journey-of-champions/manifest.json'
];
var FIREBASE_CACHE = 'joc-firebase-v3';
var FIREBASE_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
];

// Install — cache everything immediately
self.addEventListener('install', function(e){
  e.waitUntil(
    Promise.all([
      caches.open(CACHE).then(function(c){ return c.addAll(APP_SHELL); }),
      caches.open(FIREBASE_CACHE).then(function(c){ return c.addAll(FIREBASE_SCRIPTS); })
    ])
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k!==CACHE && k!==FIREBASE_CACHE; })
          .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, update in background
self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // Firebase API calls — always network only (real-time data)
  if(url.indexOf('firestore.googleapis.com')>-1 ||
     url.indexOf('identitytoolkit')>-1 ||
     url.indexOf('securetoken')>-1){
    e.respondWith(fetch(e.request).catch(function(){
      return new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}});
    }));
    return;
  }

  // Firebase SDK scripts — cache first (they rarely change)
  if(url.indexOf('gstatic.com/firebasejs')>-1){
    e.respondWith(
      caches.open(FIREBASE_CACHE).then(function(c){
        return c.match(e.request).then(function(cached){
          if(cached) return cached;
          return fetch(e.request).then(function(resp){
            c.put(e.request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var networkFetch = fetch(e.request).then(function(resp){
        // Update cache in background
        if(resp.ok){
          caches.open(CACHE).then(function(c){ c.put(e.request, resp.clone()); });
        }
        return resp;
      }).catch(function(){return cached;});
      // Return cache immediately if available, else wait for network
      return cached || networkFetch;
    })
  );
});
