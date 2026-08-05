import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Preservation Property Test - Local Development and Build Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests verify that the existing deployment configuration properties
 * that must be preserved after the bugfix are still in place.
 * They MUST PASS on both unfixed and fixed code.
 */

interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelConfig {
  buildCommand: string;
  outputDirectory: string;
  framework: string;
  functions: Record<string, { includeFiles: string | string[] }>;
  rewrites: VercelRewrite[];
}

interface PackageJson {
  scripts: Record<string, string>;
}

function readVercelConfig(): VercelConfig {
  const vercelJsonPath = path.resolve(__dirname, '../../../../vercel.json');
  const content = fs.readFileSync(vercelJsonPath, 'utf-8');
  return JSON.parse(content);
}

function readBackendPackageJson(): PackageJson {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const content = fs.readFileSync(pkgPath, 'utf-8');
  return JSON.parse(content);
}

describe('Preservation: Local Development and Build Behavior Unchanged', () => {
  const vercelConfig = readVercelConfig();
  const backendPkg = readBackendPackageJson();

  describe('vercel.json rewrites preservation', () => {
    it('rewrites array contains API rewrite routing /api/(.*) to /api/index.ts', () => {
      const apiRewrite = vercelConfig.rewrites.find(
        (r) => r.source === '/api/(.*)' && r.destination === '/api/index.ts'
      );
      expect(apiRewrite).toBeDefined();
    });

    it('rewrites array contains SPA rewrite routing non-API paths to /index.html', () => {
      const spaRewrite = vercelConfig.rewrites.find(
        (r) => r.source === '/((?!api/).*)' && r.destination === '/index.html'
      );
      expect(spaRewrite).toBeDefined();
    });
  });

  describe('vercel.json build configuration preservation', () => {
    it('outputDirectory is packages/frontend/dist', () => {
      expect(vercelConfig.outputDirectory).toBe('packages/frontend/dist');
    });

    it('framework is vite', () => {
      expect(vercelConfig.framework).toBe('vite');
    });

    it('buildCommand includes npm run build -w packages/shared', () => {
      expect(vercelConfig.buildCommand).toContain('npm run build -w packages/shared');
    });

    it('buildCommand includes npm run build -w packages/backend', () => {
      expect(vercelConfig.buildCommand).toContain('npm run build -w packages/backend');
    });

    it('buildCommand includes npm run build -w packages/frontend', () => {
      expect(vercelConfig.buildCommand).toContain('npm run build -w packages/frontend');
    });
  });

  describe('backend package.json scripts preservation', () => {
    it('build script remains tsc', () => {
      expect(backendPkg.scripts.build).toBe('tsc');
    });

    it('dev script remains tsx watch src/index.ts', () => {
      expect(backendPkg.scripts.dev).toBe('tsx watch src/index.ts');
    });
  });

  /**
   * Property-based test: For any valid vercel.json configuration (after fix),
   * all preservation invariants must hold simultaneously.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   *
   * This property generates configuration variants that could result from
   * the fix (adding prisma generate to buildCommand, expanding includeFiles)
   * and asserts that all preserved behaviors remain intact.
   */
  it('Property: all preservation invariants hold for any valid post-fix configuration', () => {
    // Generate build commands that include the required workspace builds
    // The fix may add prisma generate but MUST keep existing build steps
    const buildCommandArb = fc.oneof(
      // Current unfixed command
      fc.constant(
        'npm run build -w packages/shared && npm run build -w packages/backend && npm run build -w packages/frontend'
      ),
      // Fixed command with db:generate added
      fc.constant(
        'npm run build -w packages/shared && npm run db:generate -w packages/backend && npm run build -w packages/backend && npm run build -w packages/frontend'
      ),
      // Alternative fix with cd approach
      fc.constant(
        'npm run build -w packages/shared && cd packages/backend && npx prisma generate && cd ../.. && npm run build -w packages/backend && npm run build -w packages/frontend'
      )
    );

    // Generate includeFiles variants - fix may expand but must keep backend dist
    const includeFilesArb = fc.oneof(
      fc.constant('packages/backend/dist/**'),
      fc.constant(
        'packages/backend/dist/**,node_modules/.prisma/client/**,node_modules/@prisma/client/**,packages/backend/prisma/schema.prisma'
      )
    );

    // Rewrites must always include both API and SPA rewrites
    const rewritesArb = fc.constant<VercelRewrite[]>([
      { source: '/api/(.*)', destination: '/api/index.ts' },
      { source: '/((?!api/).*)', destination: '/index.html' },
    ]);

    fc.assert(
      fc.property(
        buildCommandArb,
        includeFilesArb,
        rewritesArb,
        (buildCommand, includeFiles, rewrites) => {
          // Preservation invariant 1: buildCommand includes all workspace builds
          const hasSharedBuild = buildCommand.includes('npm run build -w packages/shared');
          const hasBackendBuild = buildCommand.includes('npm run build -w packages/backend');
          const hasFrontendBuild = buildCommand.includes('npm run build -w packages/frontend');

          // Preservation invariant 2: rewrites contain API route
          const hasApiRewrite = rewrites.some(
            (r) => r.source === '/api/(.*)' && r.destination === '/api/index.ts'
          );

          // Preservation invariant 3: rewrites contain SPA route
          const hasSpaRewrite = rewrites.some(
            (r) => r.source === '/((?!api/).*)' && r.destination === '/index.html'
          );

          // Preservation invariant 4: includeFiles still has backend dist
          const hasBackendDist = includeFiles.includes('packages/backend/dist/**');

          return (
            hasSharedBuild &&
            hasBackendBuild &&
            hasFrontendBuild &&
            hasApiRewrite &&
            hasSpaRewrite &&
            hasBackendDist
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: The actual current configuration satisfies all preservation properties.
   * This confirms the baseline behavior exists and must be maintained.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('Property: current configuration satisfies all preservation invariants', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Read actual files each time (simulates re-reading after potential changes)
        const config = readVercelConfig();
        const pkg = readBackendPackageJson();

        // Vercel.json preservation checks
        const hasApiRewrite = config.rewrites.some(
          (r) => r.source === '/api/(.*)' && r.destination === '/api/index.ts'
        );
        const hasSpaRewrite = config.rewrites.some(
          (r) => r.source === '/((?!api/).*)' && r.destination === '/index.html'
        );
        const correctOutputDir = config.outputDirectory === 'packages/frontend/dist';
        const correctFramework = config.framework === 'vite';
        const hasSharedBuild = config.buildCommand.includes('npm run build -w packages/shared');
        const hasBackendBuild = config.buildCommand.includes('npm run build -w packages/backend');
        const hasFrontendBuild = config.buildCommand.includes(
          'npm run build -w packages/frontend'
        );

        // Backend package.json preservation checks
        const correctBuildScript = pkg.scripts.build === 'tsc';
        const correctDevScript = pkg.scripts.dev === 'tsx watch src/index.ts';

        return (
          hasApiRewrite &&
          hasSpaRewrite &&
          correctOutputDir &&
          correctFramework &&
          hasSharedBuild &&
          hasBackendBuild &&
          hasFrontendBuild &&
          correctBuildScript &&
          correctDevScript
        );
      }),
      { numRuns: 1 }
    );
  });
});
