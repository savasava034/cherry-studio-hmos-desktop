const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Load a small placeholder HTML via data URL. This makes the packaged app runnable
  // even if renderer build artifacts are not present. Replace with your real renderer
  // URL/file when integrating into the full project.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cherry Studio</title></head><body><h2>Cherry Studio (placeholder)</h2><p>If you see this, the app started successfully.</p></body></html>`
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
