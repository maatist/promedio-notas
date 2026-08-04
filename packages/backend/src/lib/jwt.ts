/**
 * Returns the JWT secret from the environment.
 * Throws at startup if JWT_SECRET is not set, preventing insecure deployments.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Set it before starting the server.'
    );
  }
  return secret;
}
