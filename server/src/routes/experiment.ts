import { Router } from 'express';
import { z } from 'zod';
import { ensureExperimentDir, saveExperiment, loadExperiment } from '../filesystem.js';
import { startAgent } from '../agent/agent.js';
import { agentStateManager } from '../agent/state.js';
import fs from 'node:fs';
import path from 'node:path';

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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ status: 'error', log: [] });
  }

  try {
    console.log(`[get_experiment_state] Fetching state for experiment ${id}`);
    const response = await fetch(`http://localhost:3001/get_experiment_state?id=${id}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[get_experiment_state] Response status: ${response.status}`);
    console.log(`[get_experiment_state] Response headers:`, response.headers);
    
    const responseText = await response.text();
    console.log(`[get_experiment_state] Raw response:`, responseText.substring(0, 200) + '...');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }
    
    let stateData;
    try {
      stateData = JSON.parse(responseText);
    } catch (e) {
      console.error('[get_experiment_state] Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
    }
    
    // Transform the messages to include status information
    const transformedLog = stateData.messages.map((msg: any) => ({
      type: 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
      status: msg.type // Map the agent message type to status
    }));

    return res.status(200).json({
      status: stateData.status,
      log: transformedLog
    });
  } catch (error) {
    console.error('[get_experiment_state] Error:', error);
    return res.status(500).json({
      status: 'error',
      log: [{
        type: 'assistant',
        content: `Error fetching experiment state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        status: 'error'
      }]
    });
  }
});

export default router;