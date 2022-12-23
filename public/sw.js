var STATIC_FILES = [
  "/", // must add '/', for we cache urls not files. we cache requests
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/css/feed.css",
  "/src/js/material.min.js",
  "/src/css/app.css",
  "/src/images/main-image.jpg",
  "https://fonts.googleapis.com/css?family=Roboto:400,700", // be aware  that third party pre-caching service must set cors header to not throw us error
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
];

// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function (cache) {
//       return cache.keys()
//         .then(function (keys) {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         });
//     })
// }

self.addEventListener("install", function (event) {
  console.log("[Service Worker] Installing Service Worker ...", event);
  event.waitUntil(
    caches.open("static").then(function (cache) {
      console.log("[service worker] precaching App Shell");
      cache.addAll(STATIC_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("[Service Worker] Activating Service Worker ...", event);
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map((key) => {
          if (key !== "static-v2" && key !== "dynamic") {
            console.log("[Service Worker] Removing old cache.", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// cache with network fallback
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      } else {
        return fetch(event.request)
          .then(function (res) {
            return caches.open("dynamic").then(function (cache) {
              // trimCache(CACHE_DYNAMIC_NAME, 3);
              cache.put(event.request.url, res.clone()); //dynamic caching
              return res;
            });
          })
          .catch(function (err) {
            return caches.open(CACHE_STATIC_NAME).then(function (cache) {
              return cache.match("/offline.html");
            });
          });
      }
    })
  );
});

// cache-only
// self.addEventListener("fetch", function (event) {
//   event.respondWith(caches.match(event.request));
// });

// Network-only (like normal req res)
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });

// Network with cache FallBack (wait to network failed to req then search the cache to match)
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// Network with DYNAMIC cache FallBack (wait to network failed to req then search the cache to match But dynamically)
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// cache then network
// self.addEventListener("fetch", function (event) {
//   event.respondWith(
//     caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//       return fetch(event.request).then(function (res) {
//         cache.put(event.request, res.clone());
//         return res;
//       });
//     })
//   );
// });

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log("matched ", string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

// ***Advance Strategy***
// cache then network for selected url | cache with network fallback for other requests
self.addEventListener("fetch", function (event) {
  var url = "https://httpbin.org/get";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
        return fetch(event.request).then(function (res) {
          // trimCache(CACHE_DYNAMIC_NAME, 3);
          cache.put(event.request, res.clone());
          return res;
        });
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(function (res) {
              return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
                // trimCache(CACHE_DYNAMIC_NAME, 3);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(function (err) {
              return caches.open(CACHE_STATIC_NAME).then(function (cache) {
                // custom choice for fallback not to all pages
                // *** we can chaeck if request headers accept image and its failed
                // simply return dummy image as fallback
                if (event.request.headers.get("accept").includes("text/html")) {
                  return cache.match("/offline.html");
                }
              });
            });
        }
      })
    );
  }
});
