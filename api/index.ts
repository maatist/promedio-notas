import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../packages/backend/src/index.ts';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
