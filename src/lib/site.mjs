// Site-wide constants and pure helpers (tested in tests/site.test.mjs).
export const SITE = {
  name: 'WiseVision',
  url: 'https://wisevision.tech',
  email: 'hello@wisevision.tech',
  github: 'https://github.com/wise-vision',
  repo: 'https://github.com/wise-vision/ros2_mcp',
  description: 'WiseVision is the AI layer for ROS 2 robots: agents that see, understand and operate your fleet.',
};

export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'ROS2 MCP', href: '/ros2-mcp/' },
  { label: 'WiseOS', href: '/wiseos/' },
  { label: 'Defence & dual-use', href: '/defence/' },
  { label: 'Docs', href: '/docs/' },
  { label: 'Contact', href: '/contact/' },
];

// Cloudflare Web Analytics (cookieless RUM beacon, launch audit F3). The token is a PUBLIC site token.
export const CF_BEACON_TOKEN = '74bf92e463694feb871bc3f0a6e8abc3';
export const CF_BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
export const CF_BEACON = JSON.stringify({ token: CF_BEACON_TOKEN });

/**
 * Inline loader for the beacon: the official <script defer src data-cf-beacon> tag, but inserted after the
 * `load` event once the main thread is idle, so its ~200-600 ms of mobile scripting never lands in TBT/LCP.
 * The beacon reads the Navigation/Paint Timing buffers, so late insertion still reports the full page load.
 */
export function cfBeaconLoader(src = CF_BEACON_SRC, beacon = CF_BEACON) {
  const s = JSON.stringify;
  return (
    `(function(){function a(){var s=document.createElement('script');s.defer=true;s.src=${s(src)};` +
    `s.setAttribute('data-cf-beacon',${s(beacon)});document.head.appendChild(s)}` +
    `function i(){'requestIdleCallback' in window?requestIdleCallback(a,{timeout:4000}):setTimeout(a,2000)}` +
    `document.readyState==='complete'?i():addEventListener('load',i,{once:true})})();`
  );
}

export const CTA = { label: 'Try ROS2 MCP', href: '/ros2-mcp/#install' };

const withSlash = (p) => (p.endsWith('/') ? p : `${p}/`);

export function isActive(href, pathname) {
  const path = withSlash(pathname);
  if (href === '/') return path === '/';
  return path.startsWith(href);
}

export function canonicalFor(pathname) {
  const last = pathname.split('/').pop() ?? '';
  const p = last.includes('.') ? pathname : withSlash(pathname);
  return new URL(p, SITE.url).href;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
    email: SITE.email,
    description: SITE.description,
    sameAs: [SITE.github],
  };
}
