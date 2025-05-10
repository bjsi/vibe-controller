import type { Request, Response } from 'express';

type ExperimentState = {
  status: 'running' | 'completed' | 'error' | 'ended';
  log: Array<{
    type: 'assistant' | 'user';
    content: string;
    timestamp: string;
    status?: 'info' | 'warning' | 'error' | 'success';
  }>;
};

export default async function handler(
  req: Request,
  res: Response<ExperimentState>
) {
  // Set proper headers for JSON response
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', log: [] });
  }

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
} 