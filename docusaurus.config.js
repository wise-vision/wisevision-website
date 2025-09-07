// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'WiseVision',
  tagline: 'Open-source ROS 2 & IoT stack — Connect • Analyze • Automate',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://wisevision.tech',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Organization JSON-LD structured data
  headTags: [
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "WiseVision",
        "url": "https://wisevision.tech",
        "logo": "https://wisevision.tech/img/wisevision-logo.png",
        "description": "WiseVision builds open-source ROS 2 & IoT tools for autonomous robotics. Connect, analyze, and automate with our edge-native AI platform.",
        "foundingDate": "2024",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "ul. Floriańska 1",
          "addressLocality": "Kraków",
          "postalCode": "31-021",
          "addressCountry": "PL"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+48-12-345-6789",
          "contactType": "customer service",
          "email": "office@wisevision.tech"
        },
        "sameAs": [
          "https://github.com/wise-vision",
          "https://www.linkedin.com/company/wisevision"
        ],
        "industry": "Robotics and Automation",
        "keywords": ["ROS 2", "robotics", "IoT", "AI", "automation", "Model Context Protocol"]
      })
    }
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/og-default.png',
      metadata: [
        { name: 'keywords', content: 'ROS 2, robotics, AI, LoRaWAN, digital twin, WiseVision, Model Context Protocol, MCP' },
        { name: 'description', content: 'WiseVision builds ROS 2 + IoT tools for autonomous robotics. Connect, analyze, and automate with our edge-native AI platform.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'WiseVision' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@wisevision_tech' },
        { name: 'author', content: 'WiseVision' },
        { name: 'robots', content: 'index, follow' },
      ],
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'WiseVision',
        logo: {
          alt: 'WiseVision Logo',
          src: 'img/logo.svg',
        },
        items: [
          { to: '/', label: 'Home', position: 'left' },
          { to: '/products', label: 'Products', position: 'left' },
          { to: '/use-cases', label: 'Use Cases', position: 'left' },
          { to: '/technology', label: 'Technology', position: 'left' },
          { to: '/about', label: 'About', position: 'left' },
          { to: '/contact', label: 'Contact', position: 'left' },
          { href: 'https://app.easy.tools/ec/wisevision/wisevision-mcp-ros-2-pro', label: 'MCP Pro Store', position: 'right' },
          { href: 'https://github.com/wise-vision', className: 'header-github-link', 'aria-label': 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Products',
            items: [
              { label: 'MCP ROS 2 Pro', href: 'https://app.easy.tools/ec/wisevision/wisevision-mcp-ros-2-pro' },
            ],
          },
          {
            title: 'Company',
            items: [
              { label: 'About', to: '/about' },
              { label: 'Contact', to: '/contact' },
            ],
          },
          {
            title: 'Resources',
            items: [
              { label: 'GitHub', href: 'https://github.com/wise-vision' },
              { html: '<a href="https://www.linkedin.com/company/wisevision" target="_blank" rel="noopener">LinkedIn</a>' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} WiseVision`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
