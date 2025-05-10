import { join } from 'path'
import fs from 'fs'

const getRootPath = () => {
  const searchForRoot = (startDir: string): string | null => {
    let currentDir = startDir
    
    while (currentDir !== '/' && currentDir.length > 1) {
      try {
        const rootPath = join(currentDir, '.root')
        if (fs.existsSync(rootPath)) {
          return currentDir
        }
      } catch {
        currentDir = join(currentDir, '..')
      }
    }
    return null
  }

  return searchForRoot(process.cwd())
}

// Get the experiments directory path
const getExperimentsPath = () => {
  return join(getRootPath()!, 'experiments')
}

// Ensure the experiments directory exists
export const ensureExperimentsDir = () => {
  const experimentsPath = getExperimentsPath()
  try {
    fs.accessSync(experimentsPath)
  } catch {
    fs.mkdirSync(experimentsPath, { recursive: true })
  }
  return experimentsPath
}

// Ensure experiment directory exists
export const ensureExperimentDir = (experimentId: string) => {
  const experimentsPath = ensureExperimentsDir()
  const experimentPath = join(experimentsPath, experimentId)
  try {
    fs.accessSync(experimentPath)
  } catch {
    fs.mkdirSync(experimentPath, { recursive: true })
  }
  return experimentPath
}

// Save experiment data
export const saveExperiment = async (experimentId: string, data: any) => {
  const experimentPath = ensureExperimentDir(experimentId)
  const filePath = join(experimentPath, 'experiment.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  return filePath
}

// Load experiment data
export const loadExperiment = async (experimentId: string) => {
  const experimentsPath = getExperimentsPath()
  const filePath = join(experimentsPath, experimentId, 'experiment.json')
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Failed to load experiment ${experimentId}:`, error)
    return null
  }
}