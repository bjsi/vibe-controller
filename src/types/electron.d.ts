interface ElectronAPI {
  startExperiment: (controllers: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 