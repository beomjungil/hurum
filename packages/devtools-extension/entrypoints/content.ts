import { isHurumPageMessage } from '../src/protocol'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  main() {
    // Listen for messages from the page (sent by createDevtools() middleware)
    window.addEventListener('message', (event) => {
      if (event.source !== window) return
      if (!isHurumPageMessage(event.data)) return

      // Forward to background script
      browser.runtime.sendMessage({
        type: 'HURUM_ENTRY',
        entry: event.data.entry,
      }).catch(() => {
        // Extension context invalidated — ignore
      })
    })
  },
})
