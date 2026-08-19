import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const app = require('../backend/server.js');

export default function handler(req, res) {
  return app(req, res);
}
