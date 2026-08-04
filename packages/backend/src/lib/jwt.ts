/**
 * Validates and caches the JWT secret from the environment.
 * Throws at module load time if JWT_SECRET is not set, preventing insecure deployments.
 * In serverless environments (Vercel), this crashes the cold start immediately,
 * which surfaces as a deploy-time error.
 */
let _jwtSecret: string | undefined;

export function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Set it before starting the server.'
    );
  }
  _jwtSecret = secret;
  return _jwtSecret;
}

// Validate JWT_SECRET at module load time - fails fast in any environment
getJwtSecret();
