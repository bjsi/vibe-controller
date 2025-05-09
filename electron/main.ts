import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
}

log('Starting Electron app...')
log(`__dirname: ${__dirname}`)

function createWindow() {
  log('Creating window...')
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: join(__dirname, 'preload.cjs')
    }
  })

  log('Window created, loading URL...')
  // In development, load from the dev server
  if (process.env.NODE_ENV === 'development') {
    const url = 'http://localhost:5173'
    log(`Loading development URL: ${url}`)
    win.loadURL(url)
    win.webContents.openDevTools()
  } else {
    // In production, load the built files
    const filePath = join(__dirname, '../dist/index.html')
    log(`Loading production file: ${filePath}`)
    win.loadFile(filePath)
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} ${errorDescription}`)
  })
}

// Handle IPC messages
ipcMain.on('start-experiment', (event, controllers) => {
  log('----------------------------------------')
  log('🚀 Start Experiment Message Received!')
  log(`Controllers: ${controllers}`)
  log(`Sender: ${event.sender.getTitle()}`)
  log('----------------------------------------')
  // TODO: Implement actual experiment logic
})

app.whenReady().then(() => {
  log('App is ready, creating window...')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error}`)
}) 