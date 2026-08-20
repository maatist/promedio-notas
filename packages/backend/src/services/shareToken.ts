import { prisma } from '../lib/prisma';

export async function validateShareToken(token: string): Promise<
  | { valid: true; subjectId: string }
  | { valid: false; status: 404 | 410; error: string }
> {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
  });

  if (!shareToken) {
    return { valid: false, status: 404, error: 'Share link not found' };
  }

  if (shareToken.expiresAt < new Date()) {
    return { valid: false, status: 410, error: 'Share link has expired' };
  }

  return { valid: true, subjectId: shareToken.subjectId };
}
