const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    startExperiment: (controllers: string) => {
      ipcRenderer.send('start-experiment', controllers)
    }
  }
)

export {} 