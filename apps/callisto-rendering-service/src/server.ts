import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import * as express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import bootstrap from './main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(
    process.cwd(),
    'dist/apps/callisto-rendering-service/browser'
  );
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? join(distFolder, 'index.original.html')
    : join(distFolder, 'index.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', distFolder);

  server.post('/render', async (req, res) => {
    const { component, schema, toolName } = req.body;

    if (!component || !schema) {
      return res
        .status(400)
        .send({ error: 'Component selector and schema are required.' });
    }

    try {
      // This is a simplified way to pass data. A real app might use TransferState.
      // We create a temporary document with the component tag and placeholders for inputs.
      // NOTE: This is a conceptual approach. In a real app, you'd likely use a
      // more robust method like a dedicated rendering module that can accept providers.
      // For now, we'll rely on the client to hydrate with the schema.
      const document = `<${component}></${component}>`;

      const html = await commonEngine.render({
        bootstrap,
        document,
        url: req.originalUrl,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: '/' }],
      });

      res.send({ html });
    } catch (err) {
      console.error('Error rendering component:', err);
      res.status(500).send({ error: 'Failed to render component.' });
    }
  });

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(distFolder, {
      maxAge: '1y',
    })
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
