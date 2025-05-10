import { Router } from 'express';
import { z } from 'zod';
import { saveExperiment } from '../filesystem.js';
import { agentStateManager } from '../agent/state.js';
import { startAgent } from '../agent/agent.js';

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
    agentStateManager.createState(id);
    await startAgent({ instructions, directory: id });
    
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

export default router; 