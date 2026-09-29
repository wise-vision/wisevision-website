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
