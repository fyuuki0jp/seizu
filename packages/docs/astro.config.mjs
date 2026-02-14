import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fyuuki0jp.github.io',
  base: '/rise',
  integrations: [
    starlight({
      title: 'kata',
      sidebar: [
        { label: 'Overview', slug: 'index' },
        { label: 'kata-cli Contracts', slug: 'contracts' },
      ],
    }),
  ],
});
