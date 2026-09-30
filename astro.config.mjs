// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import starlightLlmsTxt from 'starlight-llms-txt';
import { CF_BEACON, CF_BEACON_SRC } from './src/lib/site.mjs';

export default defineConfig({
  site: 'https://wisevision.tech',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    starlight({
      title: 'WiseVision Docs',
      description: 'Documentation for ROS2 MCP and WiseOS by WiseVision.',
      disable404Route: true,
      logo: { src: './src/assets/logo.svg', replacesTitle: true },
      favicon: '/favicon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        // Cloudflare Web Analytics (cookieless) so /docs is counted too (launch audit F3).
        { tag: 'script', attrs: { defer: true, src: CF_BEACON_SRC, 'data-cf-beacon': CF_BEACON } },
      ],
      customCss: ['./src/styles/tokens.css', './src/styles/starlight.css'],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wise-vision' }],
      routeMiddleware: './src/lib/route-md-twin.ts',
      components: {
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      sidebar: [
        { label: 'Overview', link: '/docs/' },
        {
          label: 'ROS2 MCP',
          items: [
            { label: 'Quickstart (Docker, 5 min)', link: '/docs/ros2-mcp/quickstart/' },
            { label: 'Connect your agent', link: '/docs/ros2-mcp/connect/' },
            { label: 'Security model', link: '/docs/ros2-mcp/security/' },
            { label: 'Tool reference', link: '/docs/ros2-mcp/tools/' },
            { label: 'Prompts', link: '/docs/ros2-mcp/prompts/' },
            { label: 'Data Black Box', link: '/docs/ros2-mcp/data-black-box/' },
          ],
        },
        { label: 'WiseOS (early access)', link: '/docs/wiseos/' },
        { label: 'FAQ', link: '/docs/faq/' },
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: 'WiseVision',
          description:
            'WiseVision builds the AI layer for ROS 2 robots. ROS2 MCP is an open-source (MPL-2.0) Model Context Protocol server for ROS 2 Humble and Jazzy. WiseOS is in early access.',
        }),
      ],
    }),
    sitemap(),
  ],
});
