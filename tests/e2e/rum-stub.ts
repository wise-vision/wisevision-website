// The Cloudflare Web Analytics beacon POSTs to cloudflareinsights.com/cdn-cgi/rum, which only allows the
// production origin via CORS. On astro preview (localhost) that is a console error, so e2e tests answer the
// collector locally. The beacon script itself (static.cloudflareinsights.com) still loads for real.
import type { Page } from '@playwright/test';

export async function stubRum(page: Page): Promise<string[]> {
  const posts: string[] = [];
  await page.route('https://cloudflareinsights.com/cdn-cgi/rum**', (route) => {
    posts.push(route.request().method());
    const origin = route.request().headers()['origin'] ?? '*';
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-credentials': 'true',
      },
    });
  });
  return posts;
}
