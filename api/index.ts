import type { VercelRequest, VercelResponse } from '@vercel/node';
const app = require('../packages/backend/dist/index.js').default;

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
