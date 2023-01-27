importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

let CACHE_STATIC_NAME = "static-v18";
let CACHE_DYNAMIC_NAME = "dynamic-v4";
let STATIC_FILES = [
  "/", // must add '/', for we cache urls not files. we cache requests
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/utility.js",
  "/src/js/feed.js",
  "/src/css/feed.css",
  "/src/css/idb.css",
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
    caches.open(CACHE_STATIC_NAME).then(function (cache) {
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
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log("[Service Worker] Removing old cache.", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// #1 cache with network fallback
// self.addEventListener("fetch", function (event) {
//   event.respondWith(
//     caches.match(event.request).then(function (response) {
//       if (response) {
//         return response;
//       } else {
//         return fetch(event.request)
//           .then(function (res) {
//             return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//               // trimCache(CACHE_DYNAMIC_NAME, 3);
//               cache.put(event.request.url, res.clone()); //dynamic caching
//               return res;
//             });
//           })
//           .catch(function (err) {
//             return caches.open(CACHE_STATIC_NAME).then(function (cache) {
//               return cache.match("/offline.html");
//             });
//           });
//       }
//     })
//   );
// });

// #2 cache-only
// self.addEventListener("fetch", function (event) {
//   event.respondWith(caches.match(event.request));
// });

// #3 Network-only (like normal req res)
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });

// #4 Network with cache FallBack (wait to network failed to req then search the cache to match)
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// #5 Network with DYNAMIC cache FallBack (wait to network failed to req then search the cache to match But dynamically)
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

// #6 cache then network
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
// #7 cache then network for selected url | cache with network fallback for other requests
self.addEventListener("fetch", function (event) {
  var url = "https://httpbin.org/get";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        let clonedRes = res.clone();
        clearAllData("posts")
          .then(function () {
            return clonedRes.json();
          })
          .then(function (data) {
            for (let key in data) {
              writeData("posts", data[key]);
            }
          });
        return res;
      })
    );
    // event.respondWith(
    //   caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
    //     return fetch(event.request).then(function (res) {
    //       // trimCache(CACHE_DYNAMIC_NAME, 3);
    //       cache.put(event.request, res.clone());
    //       return res;
    //     });
    //   })
    // );
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

self.addEventListener("sync", function (event) {
  console.log("[Service Worker] Background syncing", event);
  if (event.tag === "sync-new-posts") {
    console.log("[Service Worker] Syncing new Posts");
    event.waitUntil(
      readAllData("sync-posts").then(function (data) {
        for (var dt of data) {
          var postData = new FormData();
          postData.append("id", dt.id);
          postData.append("title", dt.title);
          postData.append("location", dt.location);
          postData.append("file", dt.picture, dt.id + ".png");

          fetch(
            "https://us-central1-pwagram-99adf.cloudfunctions.net/storePostData",
            {
              method: "POST",
              body: postData,
            }
          )
            .then(function (res) {
              console.log("Sent data", res);
              if (res.ok) {
                deleteItemFromData("sync-posts", dt.id); // Isn't working correctly!
              }
            })
            .catch(function (err) {
              console.log("Error while sending data", err);
            });
        }
      })
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if (action === "confirm") {
    console.log("Confirm was chosen");
    notification.close();
  } else {
    console.log(action);
    event.waitUntil(
      clients.matchAll().then(function (clis) {
        var client = clis.find(function (c) {
          return c.visibilityState === "visible";
        });

        if (client !== undefined) {
          client.navigate(notification.data.url);
          client.focus();
        } else {
          clients.openWindow(notification.data.url);
        }
        notification.close();
      })
    );
  }
});

self.addEventListener("notificationclose", function (event) {
  console.log("Notification was closed", event);
});

self.addEventListener("push", function (event) {
  console.log("Push Notification received", event);

  var data = {
    title: "New!",
    content: "Something new happened!",
    openUrl: "/",
  };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  var options = {
    body: data.content,
    icon: "/src/images/icons/app-icon-96x96.png",
    badge: "/src/images/icons/app-icon-96x96.png",
    data: {
      url: data.openUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
