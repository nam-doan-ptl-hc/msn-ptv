
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "preload": [
      "chunk-BIKNVPBQ.js"
    ],
    "route": "/"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-IQ43VTYY.js",
      "chunk-VWZ2PS4B.js"
    ],
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-5RXZ4GB3.js",
      "chunk-VWZ2PS4B.js"
    ],
    "route": "/dashboard-hds"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 5954, hash: '7d8c0f7cefc3088d76ae621ee926c92be891739a11d08120840b53b2b6b236eb', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1889, hash: '9a1ccf971384b6e93ee5879651fc26b993e3f59c0817cedd4241dd48b8384421', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 15581, hash: '28b329c2a7a1e8ce338680b2c352a4dae5071c0964b7447e7fe9b965bd19851c', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 122286, hash: 'a33a9c66c3aa313d9364800f281367da6cfb255c5290068247466f51d08b5c5b', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'dashboard-hds/index.html': {size: 43009, hash: 'aa77cfce7a21999805700c26e209ee53f6b2ede9b795e39053f5143e259c1247', text: () => import('./assets-chunks/dashboard-hds_index_html.mjs').then(m => m.default)},
    'styles-WZWKPSNS.css': {size: 231855, hash: 'UXYwVZF3jI8', text: () => import('./assets-chunks/styles-WZWKPSNS_css.mjs').then(m => m.default)}
  },
};
