import { Router } from 'express';
import { z } from 'zod';
import { ensureExperimentDir, saveExperiment, loadExperiment } from '../filesystem.js';
import { startAgent } from '../agent/agent.js';
import { agentStateManager } from '../agent/state.js';

const router = Router();

const startExperimentSchema = z.object({
  id: z.string(),
  instructions: z.string()
});

const droneTestDataSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }),
  controls: z.object({
    throttle: z.number(),
    pitch: z.number(),
    roll: z.number()
  }),
  timestamp: z.string()
});

router.post('/start_experiment', async (req, res) => {
  try {
    const { id, instructions } = startExperimentSchema.parse(req.body);
    
    const experimentData = {
      id,
      instructions,
      status: 'started',
      startTime: new Date().toISOString(),
      testData: [] // Initialize empty array for test data
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

router.post('/store_test_data', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const testData = droneTestDataSchema.parse(req.body);
    const experiment = await loadExperiment(id);
    
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Add new test data point
    experiment.testData = experiment.testData || [];
    experiment.testData.push(testData);
    
    await saveExperiment(id, experiment);
    
    res.json({
      status: 'success',
      message: 'Test data stored',
      data: testData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid test data format',
        errors: error.errors
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/get_test_data', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const experiment = await loadExperiment(id);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({
      status: 'success',
      data: experiment.testData || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/get_experiment_state', async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ status: 'error', log: [] });
  }

  try {
    console.log(`[get_experiment_state] Getting state for experiment ${id}`);
    const state = agentStateManager.getState(id);
    
    if (!state) {
      console.log(`[get_experiment_state] No state found for experiment ${id}`);
      return res.status(200).json({
        status: 'pending',
        log: [{
          type: 'assistant',
          content: 'Waiting for agent to start...',
          timestamp: new Date().toISOString(),
          status: 'pending'
        }]
      });
    }

    // Transform the messages to include status information
    const transformedLog = state.messages.map((msg: any) => ({
      type: 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
      status: msg.type // Map the agent message type to status
    }));

    return res.status(200).json({
      status: state.status,
      log: transformedLog
    });
  } catch (error) {
    console.error('[get_experiment_state] Error:', error);
    return res.status(500).json({
      status: 'error',
      log: [{
        type: 'assistant',
        content: `Error getting experiment state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        status: 'error'
      }]
    });
  }
});

export default router;