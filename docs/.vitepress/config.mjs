import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ReqPilot',
  description: 'Docs for the ReqPilot local-first REST API client.',
  base: '/reqpilot/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Quick Start', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'UX Model', link: '/design-philosophy' },
      { text: 'Workspaces', link: '/workspaces-and-git' },
      { text: 'Testing', link: '/request-testing' },
      { text: 'Security', link: '/security-and-ssl' },
      { text: 'Screenshots', link: '/ui-preview' },
      { text: 'GitHub', link: 'https://github.com/toolstackhq/reqpilot' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Design Philosophy', link: '/design-philosophy' },
          { text: 'Core Features', link: '/features' },
          { text: 'Workspaces and Git', link: '/workspaces-and-git' },
          { text: 'Importing Collections', link: '/importing-collections' },
          { text: 'Environments and Variables', link: '/environments-and-variables' },
          { text: 'Request Testing', link: '/request-testing' },
          { text: 'Security and SSL', link: '/security-and-ssl' },
          { text: 'Screenshot Gallery', link: '/ui-preview' },
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
