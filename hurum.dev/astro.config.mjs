import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightGithubAlerts from 'starlight-github-alerts'
import starlightPageActions from 'starlight-page-actions'
import hurumDark from './src/themes/hurum-dark.json'
import hurumLight from './src/themes/hurum-light.json'

export default defineConfig({
  site: 'https://hurum.dev',
  vite: {
    plugins: [
      {
        name: 'markdown-utf8',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.endsWith('.md')) {
              const origSetHeader = res.setHeader.bind(res)
              res.setHeader = function (name, value) {
                if (name.toLowerCase() === 'content-type' && typeof value === 'string' && value.includes('text/markdown')) {
                  return origSetHeader(name, 'text/markdown; charset=utf-8')
                }
                return origSetHeader(name, value)
              }
            }
            next()
          })
        },
      },
    ],
  },
  integrations: [
    starlight({
      plugins: [
        starlightGithubAlerts(),
        starlightPageActions({
          baseUrl: 'https://hurum.dev',
          prompt: 'I\'m reading the Hurum documentation. Hurum is a TypeScript state management library with the data flow: Intent → Command → Executor → Event → Store.on. Here is the page I\'m reading: {url}\n\nPlease answer my questions about this page and Hurum in general.',
          actions: {
            chatgpt: true,
            claude: true,
            t3chat: false,
            v0: false,
            markdown: true,
          },
          share: false,
        }),
      ],
      title: 'Hurum',
      description: 'Predictable state machines for TypeScript applications.',
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://hurum.dev/og-image.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://hurum.dev/og-image.png' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#0c0d14' } },
      ],
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ko: { label: '한국어', lang: 'ko' },
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: { ko: '시작하기' },
          items: [
            { slug: 'getting-started/introduction', label: 'Introduction', translations: { ko: '소개' } },
            { slug: 'getting-started/installation', label: 'Installation', translations: { ko: '설치' } },
            { slug: 'getting-started/quick-start', label: 'Quick Start', translations: { ko: '빠른 시작' } },
            { slug: 'getting-started/data-flow', label: 'Data Flow', translations: { ko: '데이터 흐름' } },
          ],
        },
        {
          label: 'Core Concepts',
          translations: { ko: '핵심 개념' },
          items: [
            { slug: 'concepts/event', label: 'Event' },
            { slug: 'concepts/command-executor', label: 'Command / CommandExecutor' },
            { slug: 'concepts/intent', label: 'Intent' },
            { slug: 'concepts/store', label: 'Store' },
            { slug: 'concepts/computed', label: 'Computed' },
            { slug: 'concepts/nested-store', label: 'Nested Store', translations: { ko: '중첩 Store' } },
            { slug: 'concepts/middleware', label: 'Middleware', translations: { ko: '미들웨어' } },
          ],
        },
        {
          label: 'Guides',
          translations: { ko: '가이드' },
          items: [
            { slug: 'guides/async-operations', label: 'Async Operations', translations: { ko: '비동기 작업' } },
            { slug: 'guides/error-handling', label: 'Error Handling', translations: { ko: '에러 핸들링' } },
            { slug: 'guides/intent-cancellation', label: 'Intent Cancellation', translations: { ko: 'Intent 취소' } },
            { slug: 'guides/dependency-injection', label: 'Dependency Injection', translations: { ko: '의존성 주입' } },
            { slug: 'guides/nested-stores', label: 'Nested Stores', translations: { ko: '중첩 Store' } },
            { slug: 'guides/ssr', label: 'SSR' },
            { slug: 'guides/migration', label: 'Migration', translations: { ko: '마이그레이션' } },
          ],
        },
        {
          label: 'React',
          translations: { ko: 'React 연동' },
          items: [
            { slug: 'react/overview', label: 'Overview', translations: { ko: '개요' } },
            { slug: 'react/use-store', label: 'useStore' },
            { slug: 'react/static-api', label: 'Static API (Store.use.*)' },
            { slug: 'react/provider', label: 'Provider & withProvider' },
            { slug: 'react/scoped-instances', label: 'Scoped Instances', translations: { ko: '스코프 인스턴스' } },
          ],
        },
        {
          label: 'Testing',
          translations: { ko: '테스팅' },
          items: [
            { slug: 'testing/overview', label: 'Overview', translations: { ko: '개요' } },
            { slug: 'testing/test-store', label: 'TestStore' },
            { slug: 'testing/test-executor', label: 'TestExecutor' },
            { slug: 'testing/test-reducer', label: 'TestReducer' },
            { slug: 'testing/test-computed', label: 'TestComputed' },
            { slug: 'testing/test-intent', label: 'TestIntent' },
          ],
        },
        {
          label: 'API Reference',
          translations: { ko: 'API 레퍼런스' },
          collapsed: true,
          items: [
            {
              label: '@hurum/core',
              items: [
                { slug: 'api/core/events', label: 'Events' },
                { slug: 'api/core/command-executor', label: 'Command / CommandExecutor' },
                { slug: 'api/core/intent', label: 'Intent' },
                { slug: 'api/core/store', label: 'Store' },
                { slug: 'api/core/computed', label: 'Computed' },
                { slug: 'api/core/nested', label: 'Nested' },
                { slug: 'api/core/middleware', label: 'Middleware' },
                { slug: 'api/core/types', label: 'Types' },
              ],
            },
            {
              label: '@hurum/react',
              items: [
                { slug: 'api/react/use-store', label: 'useStore' },
                { slug: 'api/react/provider', label: 'Provider' },
                { slug: 'api/react/with-provider', label: 'withProvider' },
                { slug: 'api/react/store-use', label: 'Store.use.*' },
              ],
            },
          ],
        },
        {
          label: 'Advanced',
          translations: { ko: '심화' },
          collapsed: true,
          items: [
            { slug: 'advanced/design-decisions', label: 'Design Decisions', translations: { ko: '설계 결정' } },
            { slug: 'advanced/architecture', label: 'Architecture', translations: { ko: '아키텍처' } },
          ],
        },
      ],
      expressiveCode: {
        themes: [hurumDark, hurumLight],
        useStarlightUiThemeColors: true,
        styleOverrides: {
          borderRadius: '0.5rem',
          borderColor: 'var(--sl-color-hairline)',
        },
      },
      customCss: ['./src/styles/custom.css'],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      lastUpdated: true,
    }),
  ],
})
