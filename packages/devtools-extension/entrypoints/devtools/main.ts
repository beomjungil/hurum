// Register the Hurum DevTools panel in Chrome DevTools
browser.devtools.panels.create(
  'Hurum',            // panel title
  '/icon-48.png',     // icon
  '/devtools-panel.html', // panel page
)
