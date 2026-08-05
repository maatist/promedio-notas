import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Bug Condition Exploration Test - Prisma Client Missing Generate Causes Initialization Failure
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * This test reads the actual vercel.json and asserts that the deployment configuration
 * includes the necessary Prisma Client generation and bundling steps.
 *
 * EXPECTED: This test FAILS on unfixed code because:
 * - buildCommand does NOT contain 'prisma generate'
 * - includeFiles does NOT contain 'node_modules/.prisma/client/**'
 * - includeFiles does NOT contain 'node_modules/@prisma/client/**'
 * - includeFiles does NOT contain 'packages/backend/prisma/schema.prisma'
 */

interface VercelConfig {
  buildCommand: string;
  outputDirectory: string;
  framework: string;
  functions: Record<string, { includeFiles: string | string[] }>;
  rewrites: Array<{ source: string; destination: string }>;
}

function readVercelConfig(): VercelConfig {
  const vercelJsonPath = path.resolve(__dirname, '../../../../vercel.json');
  const content = fs.readFileSync(vercelJsonPath, 'utf-8');
  return JSON.parse(content);
}

function hasPrismaGenerate(buildCommand: string): boolean {
  return buildCommand.includes('prisma generate');
}

function getIncludeFiles(config: VercelConfig): string[] {
  const funcConfig = config.functions['api/index.ts'];
  if (!funcConfig) return [];
  const includeFiles = funcConfig.includeFiles;
  if (Array.isArray(includeFiles)) return includeFiles;
  if (typeof includeFiles === 'string') return includeFiles.split(',');
  return [];
}

function hasRequiredIncludeFile(includeFiles: string[], pattern: string): boolean {
  return includeFiles.some((f) => f.trim() === pattern);
}

/**
 * Determines if a deployment configuration is ready for Prisma Client to work on Vercel.
 * Both conditions must be met:
 * 1. buildCommand includes prisma generate
 * 2. includeFiles includes all required Prisma runtime files
 */
function isDeploymentReady(config: {
  buildCommand: string;
  includeFiles: string[];
}): boolean {
  const hasGenerate = hasPrismaGenerate(config.buildCommand);
  const hasPrismaClient = hasRequiredIncludeFile(
    config.includeFiles,
    'node_modules/.prisma/client/**'
  );
  const hasPrismaPackage = hasRequiredIncludeFile(
    config.includeFiles,
    'node_modules/@prisma/client/**'
  );
  const hasSchema = hasRequiredIncludeFile(
    config.includeFiles,
    'packages/backend/prisma/schema.prisma'
  );

  return hasGenerate && hasPrismaClient && hasPrismaPackage && hasSchema;
}

describe('Bug Condition Exploration: Prisma Client Vercel Initialization', () => {
  const vercelConfig = readVercelConfig();
  const includeFiles = getIncludeFiles(vercelConfig);

  it('buildCommand should include prisma generate step', () => {
    expect(hasPrismaGenerate(vercelConfig.buildCommand)).toBe(true);
  });

  it('includeFiles should contain node_modules/.prisma/client/**', () => {
    expect(hasRequiredIncludeFile(includeFiles, 'node_modules/.prisma/client/**')).toBe(true);
  });

  it('includeFiles should contain node_modules/@prisma/client/**', () => {
    expect(hasRequiredIncludeFile(includeFiles, 'node_modules/@prisma/client/**')).toBe(true);
  });

  it('includeFiles should contain packages/backend/prisma/schema.prisma', () => {
    expect(hasRequiredIncludeFile(includeFiles, 'packages/backend/prisma/schema.prisma')).toBe(
      true
    );
  });

  /**
   * Property-based test: For any generated configuration variant (with/without prisma generate,
   * with/without the required includeFiles), deployment readiness holds ONLY when both conditions
   * are met.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property: deployment readiness requires both prisma generate AND complete includeFiles', () => {
    const possibleBuildCommands = fc.oneof(
      // Current (unfixed) build command - no prisma generate
      fc.constant(
        'npm run build -w packages/shared && npm run build -w packages/backend && npm run build -w packages/frontend'
      ),
      // Fixed build command - has prisma generate
      fc.constant(
        'npm run build -w packages/shared && npm run db:generate -w packages/backend && npm run build -w packages/backend && npm run build -w packages/frontend'
      )
    );

    const possibleIncludeFiles = fc.oneof(
      // Current (unfixed) - only backend dist
      fc.constant(['packages/backend/dist/**']),
      // Fixed - includes all Prisma files
      fc.constant([
        'packages/backend/dist/**',
        'node_modules/.prisma/client/**',
        'node_modules/@prisma/client/**',
        'packages/backend/prisma/schema.prisma',
      ]),
      // Partial fix - missing schema
      fc.constant([
        'packages/backend/dist/**',
        'node_modules/.prisma/client/**',
        'node_modules/@prisma/client/**',
      ]),
      // Partial fix - missing @prisma/client
      fc.constant([
        'packages/backend/dist/**',
        'node_modules/.prisma/client/**',
        'packages/backend/prisma/schema.prisma',
      ])
    );

    fc.assert(
      fc.property(possibleBuildCommands, possibleIncludeFiles, (buildCommand, includeFiles) => {
        const ready = isDeploymentReady({ buildCommand, includeFiles });

        const hasGenerate = hasPrismaGenerate(buildCommand);
        const hasPrismaClientFile = hasRequiredIncludeFile(
          includeFiles,
          'node_modules/.prisma/client/**'
        );
        const hasPrismaPackageFile = hasRequiredIncludeFile(
          includeFiles,
          'node_modules/@prisma/client/**'
        );
        const hasSchemaFile = hasRequiredIncludeFile(
          includeFiles,
          'packages/backend/prisma/schema.prisma'
        );

        const allConditionsMet =
          hasGenerate && hasPrismaClientFile && hasPrismaPackageFile && hasSchemaFile;

        // Deployment readiness holds if and only if all conditions are met
        return ready === allConditionsMet;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: The CURRENT vercel.json configuration does NOT satisfy deployment
   * readiness. This test confirms the bug exists.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property: current vercel.json configuration is NOT deployment-ready (confirms bug exists)', () => {
    fc.assert(
      fc.property(fc.constant(vercelConfig), (config) => {
        const currentIncludeFiles = getIncludeFiles(config);
        const ready = isDeploymentReady({
          buildCommand: config.buildCommand,
          includeFiles: currentIncludeFiles,
        });

        // The current config SHOULD be deployment-ready (this will FAIL, confirming the bug)
        return ready === true;
      }),
      { numRuns: 1 }
    );
  });
});
