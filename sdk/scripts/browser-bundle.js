const path = require('path')

// NOTE: The node-fetch code uses `window.fetch.bind(window)` which leads to "Illegal invocation" errors.
const fetchPlugin = {
  name: 'node-fetch',
  setup(build) {
    build.onResolve({ filter: /^node-fetch$/ }, (args) => ({
      path: args.path,
      namespace: 'node-fetch',
    }))

    build.onLoad({ filter: /.*/, namespace: 'node-fetch' }, () => ({
      contents: `
        "use strict";
        function f(...args) {
          return window.fetch(...args)
        }
        module.exports = exports = f
        module.exports.default = f
        exports.Headers = window.Headers;
        exports.Request = window.Request;
        exports.Response = window.Response;
      `,
      loader: 'js',
    }))
  },
}

require('esbuild')
  .build({
    entryPoints: [path.resolve(__dirname, '../src/index-browser.ts')],
    tsconfig: path.resolve(__dirname, '../tsconfig-build.json'),
    bundle: true,
    outfile: path.resolve(__dirname, '../dist-browser/bundle.js'),
    plugins: [fetchPlugin],
    sourcemap: true,
    logLevel: 'info',
    logLimit: 0,
    target: 'esnext',
    format: 'esm',
  })
  .catch(() => {
    process.exit(1)
  })
