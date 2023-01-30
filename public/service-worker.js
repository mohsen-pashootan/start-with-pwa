importScripts("workbox-sw.prod.v2.0.0.js");
importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "google-fonts",
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    },
  })
);

workboxSW.router.registerRoute(
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "material-css",
  })
);

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "post-images",
  })
);

workboxSW.router.registerRoute(
  "https://pwagram-99adf.firebaseio.com/posts.json",
  async function (args) {
    return fetch(args.event.request).then(function (res) {
      var clonedRes = res.clone();
      clearAllData("posts")
        .then(function () {
          return clonedRes.json();
        })
        .then(function (data) {
          for (var key in data) {
            writeData("posts", data[key]);
          }
        });
      return res;
    });
  }
);

workboxSW.router.registerRoute(
  function (routeData) {
    // actualy this line will return all routes that match the condition
    return routeData.event.request.headers.get("accept").includes("text/html");
  },
  async function (args) {
    return caches.match(args.event.request).then(function (response) {
      if (response) {
        return response;
      } else {
        return fetch(args.event.request)
          .then(function (res) {
            return caches.open("dynamic").then(function (cache) {
              cache.put(args.event.request.url, res.clone());
              return res;
            });
          })
          .catch(function (err) {
            return caches.match("/offline.html").then(function (res) {
              return res;
            });
          });
      }
    });
  }
);

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "8fe220dcc939c1ef67184a974074e31c"
  },
  {
    "url": "manifest.json",
    "revision": "af71e1b0dacceba1d9f4329a3cff9043"
  },
  {
    "url": "offline.html",
    "revision": "2a9fa08197dfe05ee32c23bf30ca5288"
  },
  {
    "url": "service-worker.js",
    "revision": "be1e33eca3019643b5f9fbc12b15c4c6"
  },
  {
    "url": "src/css/app.css",
    "revision": "dc2e7652d77e3e0ce746641592abc77f"
  },
  {
    "url": "src/css/feed.css",
    "revision": "9c14600aa6d902ebb15220b4ef641699"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/js/app.js",
    "revision": "ab0ee5ca623f3482208530c7582594c7"
  },
  {
    "url": "src/js/feed.js",
    "revision": "3523829b3003c92b363a0d2e09f51366"
  },
  {
    "url": "src/js/idb.js",
    "revision": "017ced36d82bea1e08b08393361e354d"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "e68511951f1285c5cbf4aa510e8a2faf"
  },
  {
    "url": "src/js/utility.js",
    "revision": "fb86976be5ae0b61118617f07d5b07f6"
  },
  {
    "url": "sw-base.js",
    "revision": "014dd48bac09fccb5c8b9bbe93901e67"
  },
  {
    "url": "sw.js",
    "revision": "5397316ce80e8f3077122724c0240c0d"
  },
  {
    "url": "workbox-sw.prod.v2.1.3.js",
    "revision": "a9890beda9e5f17e4c68f42324217941"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  }
]);

// staleWhileRevalidate is like :
// "cache then network for selected url | cache with network fallback for other requests" strategy
