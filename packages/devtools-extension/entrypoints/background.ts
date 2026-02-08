export default defineBackground(() => {
  // Map of tabId → connected devtools panel port
  const panelPorts = new Map<number, browser.Runtime.Port>()

  // Panel connects via port
  browser.runtime.onConnect.addListener((port) => {
    if (!port.name.startsWith('hurum-panel-')) return

    const tabId = parseInt(port.name.replace('hurum-panel-', ''), 10)
    if (isNaN(tabId)) return

    panelPorts.set(tabId, port)

    port.onDisconnect.addListener(() => {
      panelPorts.delete(tabId)
    })
  })

  // Content script sends messages
  browser.runtime.onMessage.addListener((message, sender) => {
    if (!sender.tab?.id) return
    const tabId = sender.tab.id

    const port = panelPorts.get(tabId)
    if (port) {
      port.postMessage({ ...message, tabId })
    }
  })
})
