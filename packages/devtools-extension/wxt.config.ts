import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Hurum DevTools',
    description: 'DevTools extension for @hurum/core state management',
    permissions: [],
  },
})
