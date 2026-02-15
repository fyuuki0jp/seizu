import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://fyuuki0jp.github.io',
  base: '/rise',
  integrations: [
    starlight({
      title: 'kata',
      locales: {
        en: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
      },
      defaultLocale: 'en',
      sidebar: [
        {
          label: 'Overview',
          translations: { ja: '概要' },
          slug: 'index',
        },
        {
          label: 'kata-cli Contracts',
          translations: { ja: 'kata-cli Contract仕様' },
          slug: 'contracts',
        },
      ],
    }),
    mermaid(),
  ],
});
