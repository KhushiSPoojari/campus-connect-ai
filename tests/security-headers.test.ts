import { describe, it, expect, afterEach } from 'vitest';
import nextConfig from '@/../next.config';

describe('HTTP Security Headers Configuration (Task 3)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it('declares essential defense-in-depth security headers for all routes', async () => {
    expect(nextConfig.headers).toBeDefined();
    const headersConfig = await nextConfig.headers!();

    expect(Array.isArray(headersConfig)).toBe(true);
    expect(headersConfig.length).toBeGreaterThan(0);

    const rootRule = headersConfig.find((rule) => rule.source === '/:path*');
    expect(rootRule).toBeDefined();

    const headersMap = new Map<string, string>();
    for (const h of rootRule!.headers) {
      headersMap.set(h.key, h.value);
    }

    // Verify MIME-sniffing protection
    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');

    // Verify Clickjacking protection
    expect(headersMap.get('X-Frame-Options')).toBe('DENY');

    // Verify Referrer Policy
    expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // Verify Permissions Policy restricts sensitive hardware
    const permissionsPolicy = headersMap.get('Permissions-Policy');
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain('camera=()');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=()');
  });

  it('includes Strict-Transport-Security header when built for production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const headersConfig = await nextConfig.headers!();
    const rootRule = headersConfig.find((rule) => rule.source === '/:path*');
    const headersMap = new Map<string, string>();
    for (const h of rootRule!.headers) {
      headersMap.set(h.key, h.value);
    }

    expect(headersMap.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });
});
