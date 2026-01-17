import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env.E2E_ENV === 'production' ? '.env.production' : '.env.staging';
dotenv.config({ path: path.resolve(__dirname, envFile) });

export default defineConfig({
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL from environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (CI only to save resources)
    video: process.env.CI ? 'on-first-retry' : 'off',
  },

  // Configure projects for different environments
  projects: [
    // Staging - full test suite
    {
      name: 'staging',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STAGING_URL || 'https://staging.recaprabbit.com',
        // HTTP Basic Auth for staging environment
        httpCredentials: process.env.STAGING_HTTP_USER ? {
          username: process.env.STAGING_HTTP_USER,
          password: process.env.STAGING_HTTP_PASS || '',
        } : undefined,
      },
      testIgnore: /smoke\.spec\.ts/,  // Don't run smoke tests in staging suite
    },

    // Production - smoke tests only
    {
      name: 'production',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PROD_URL || 'https://recaprabbit.com',
      },
      testMatch: /smoke\.spec\.ts/,  // Only run smoke tests in prod
    },
  ],

  // Global timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
