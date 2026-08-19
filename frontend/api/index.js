import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default function handler(req, res) {
  try {
    const app = require('../backend/server.js');
    return app(req, res);
  } catch (err) {
    console.error("Vercel Invocation Error:", err);
    res.status(500).json({ error: "Vercel Invocation Error", message: err.message, stack: err.stack });
  }
}
