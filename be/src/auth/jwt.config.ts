/**
 * Centralized JWT configuration to ensure the same secret is used
 * for both signing and verification
 */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET ?? 'changeme',
  expiresIn: '24h' as const,
  refreshExpiresIn: '7d' as const,
};

// Log warning if using default secret
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET environment variable is not set. Using default "changeme".');
  console.warn('⚠️  This is insecure for production and tokens may become invalid after server restart.');
  console.warn('⚠️  Please set JWT_SECRET environment variable to a secure random string.');
}

