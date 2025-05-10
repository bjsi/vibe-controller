import { Router } from 'express';
import { z } from 'zod';
import { ensureExperimentDir, saveExperiment } from '../filesystem.js';
import { startAgent } from '../agent/agent.js';
import { agentStateManager } from '../agent/state.js';


const router = Router();

const startExperimentSchema = z.object({
  id: z.string(),
  instructions: z.string()
});

router.post('/start_experiment', async (req, res) => {
  try {
    const { id, instructions } = startExperimentSchema.parse(req.body);
    
    const experimentData = {
      id,
      instructions,
      status: 'started',
      startTime: new Date().toISOString()
    };
    
    await saveExperiment(id, experimentData);
    const experimentsDir = ensureExperimentDir(id);
    await startAgent({ id, instructions, directory: experimentsDir });
    
    res.json({
      status: 'success',
      message: 'Experiment started',
      data: experimentData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.errors
      });
    } else {
      throw error;
    }
  }
});

async function getExperimentState(id: string) {
  if (!id) {
    throw new Error('Experiment ID is required');
  }

  const state = agentStateManager.getState(id);
  if (!state) {
    throw new Error(`No state found for experiment ID: ${id}`);
  }

  return state;
}

router.get('/get_experiment_state', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const state = await getExperimentState(id);
    res.json(state);
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router; 