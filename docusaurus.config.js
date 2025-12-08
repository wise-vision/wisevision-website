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
  tagline: 'Operating System for Robotics, IoT & Digital Twins',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://wisevision.tech',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'wise-vision',
  projectName: 'wisevision-website',

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
      attributes: {
        id: 'Cookiebot',
        src: 'https://consent.cookiebot.com/uc.js',
        'data-cbid': '24595929-19c7-44ae-b97c-3d9af81ee156',
        'data-blockingmode': 'auto',
        type: 'text/javascript',
      },
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "WiseVision",
        "description": "WiseVision is a deep-tech company building an operating system for distributed robotics and IoT. We connect robots, drones, sensors and digital twins into one coherent operational layer.",
        "url": "https://wisevision.tech",
        "logo": "/img/wisevision_horizontal_logo.png",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "office@wisevision.tech",
          "contactType": "customer service",
          "areaServed": "Worldwide",
          "availableLanguage": "English"
        },
        "sameAs": [
          "https://github.com/wise-vision",
          "https://app.easy.tools/ec/wisevision"
        ],
        "founder": {
          "@type": "Organization",
          "name": "WiseVision"
        },
        "foundingDate": "2023",
        "industry": "Robotics and IoT Technology",
        "keywords": ["WiseOS", "MCP ROS2", "Digital Twins", "ROS 2", "robotics", "IoT", "O3DE", "NVIDIA Isaac Sim", "Genesis"]
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
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/wisevision-social-card.jpg',
      metadata: [
        { name: 'keywords', content: 'WiseOS, MCP ROS2, Digital Twins, ROS 2, robotics, IoT, O3DE, NVIDIA Isaac Sim, Genesis, distributed robotics' },
        { name: 'description', content: 'WiseVision is a deep-tech company building an operating system for distributed robotics and IoT. Connect robots, drones, sensors and digital twins into one coherent operational layer.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'WiseVision' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@WiseVision' },
        { name: 'author', content: 'WiseVision' },
        { name: 'robots', content: 'index, follow' },
      ],
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'WiseVision',
        logo: {
          alt: 'WiseVision Logo - AI, IoT & Robotics Platform',
          src: 'img/favicon.png',
        },
        items: [
          {
            label: 'Products',
            position: 'left',
            items: [
              {
                label: 'WiseOS',
                to: '/wiseos',
              },
              {
                label: 'MCP ROS2',
                to: '/mcp-ros2',
              },
              {
                label: 'Digital Twins',
                to: '/digital-twins',
              },
            ],
          },
          {
            label: 'Solutions',
            position: 'left',
            to: '/solutions',
          },
          {
            label: 'Case Studies',
            position: 'left',
            to: '/case-studies',
          },
          {
            label: 'Contact',
            position: 'right',
            to: '/contact',
          },
          {
            label: 'See Demo',
            position: 'right',
            to: '/demo',
            className: 'navbar-cta-button',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Products',
            items: [
              {
                label: 'WiseOS Platform',
                to: '/wiseos',
              },
              {
                label: 'MCP ROS2 Bridge',
                to: '/mcp-ros2',
              },
              {
                label: 'Digital Twins',
                to: '/digital-twins',
              },
            ],
          },
          {
            title: 'Company',
            items: [
              {
                label: 'About Us',
                to: '/about',
              },
              {
                label: 'Case Studies',
                to: '/case-studies',
              },
              {
                label: 'Solutions',
                to: '/solutions',
              },
              {
                label: 'Contact',
                to: '/contact',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/wise-vision',
              },
              {
                label: 'MCP Market',
                href: 'https://app.easy.tools/ec/wisevision',
              },
              {
                label: 'Schedule Demo',
                to: '/demo',
              },
              {
                label: 'Join Discord (MCP ROS2)',
                href: 'https://discord.gg/a27PTWcV',
              },
            ],
          },
          {
            title: 'Contact',
            items: [
              {
                label: 'office@wisevision.tech',
                href: 'mailto:office@wisevision.tech',
              },
              {
                label: 'Get Support',
                to: '/contact',
              },
              {
                label: 'Request Demo',
                to: '/demo',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} WiseVision. Bridging AI, IoT & Robotics for a Smarter Future.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
