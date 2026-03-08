import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ReqPilot',
  description: 'Documentation for the ReqPilot REST API client.',
  base: '/reqpilot/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Features', link: '/features' },
      { text: 'UI Preview', link: '/ui-preview' },
      { text: 'Security', link: '/security-and-ssl' },
      { text: 'GitHub', link: 'https://github.com/toolstackhq/reqpilot' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Features', link: '/features' },
          { text: 'UI Preview', link: '/ui-preview' },
          { text: 'Request Testing', link: '/request-testing' },
          { text: 'Security and SSL', link: '/security-and-ssl' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/toolstackhq/reqpilot' }],
    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © ReqPilot',
    },
  },
});
