import { Router } from 'express';
import { z } from 'zod';
import { ensureExperimentDir, saveExperiment, loadExperiment, listExperiments } from '../filesystem.js';
import { startAgent } from '../agent/agent.js';
import { agentStateManager } from '../agent/state.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

    const { testData } = req.body;
    if (!Array.isArray(testData)) {
      return res.status(400).json({ error: 'Invalid test data format - expected array' });
    }

    // Validate each test data point
    for (const point of testData) {
      try {
        droneTestDataSchema.parse(point);
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid test data point format',
          errors: error instanceof z.ZodError ? error.errors : ['Invalid data point']
        });
      }
    }

    const experiment = await loadExperiment(id);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Add new test data points
    experiment.testData = experiment.testData || [];
    experiment.testData.push(...testData);
    
    await saveExperiment(id, experiment);
    
    res.json({
      status: 'success',
      message: 'Test data stored',
      data: { count: testData.length }
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

router.get('/list_experiments', async (req, res) => {
  try {
    const experiments = await listExperiments();
    res.json({
      status: 'success',
      data: experiments.map(exp => ({
        id: exp.id,
        status: exp.status,
        startTime: exp.startTime,
        instructions: exp.instructions
      }))
    });
  } catch (error) {
    console.error('[list_experiments] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list experiments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/execute_drone', async (req, res) => {
  try {
    // Get the experiment directory path
    const experimentsDir = path.resolve(process.cwd(), 'experiments');
    const experimentId = req.body.id;
    
    if (!experimentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Experiment ID is required'
      });
    }

    const experimentDir = path.join(experimentsDir, experimentId, 'drone-challenge');
    const dronePath = path.join(experimentDir, 'src', 'drone_challenge', 'drone.py');

    if (!fs.existsSync(dronePath)) {
      return res.status(404).json({
        status: 'error',
        message: `Drone script not found at: ${dronePath}`
      });
    }

    // Execute the drone script using poetry
    const droneProcess = spawn('poetry', ['run', 'python', 'src/drone_challenge/drone.py'], {
      cwd: experimentDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Handle process output
    droneProcess.stdout.on('data', (data) => {
      console.log(`Drone stdout: ${data}`);
    });

    droneProcess.stderr.on('data', (data) => {
      console.error(`Drone stderr: ${data}`);
    });

    // Handle process completion
    droneProcess.on('close', (code) => {
      console.log(`Drone process exited with code ${code}`);
    });

    res.json({
      status: 'success',
      message: 'Drone execution started'
    });
  } catch (error) {
    console.error('Error executing drone:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to execute drone: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

router.post('/stop_experiment', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Experiment ID is required'
      });
    }

    // Update the experiment state to 'ended'
    const state = agentStateManager.getState(id);
    if (state) {
      agentStateManager.updateState(id, { 
        status: 'ended',
        error: 'Experiment stopped by user'
      });
      agentStateManager.addMessage(id, 'Experiment stopped by user', 'info');
    }

    res.json({
      status: 'success',
      message: 'Experiment stopped'
    });
  } catch (error) {
    console.error('Error stopping experiment:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to stop experiment: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

export default router;