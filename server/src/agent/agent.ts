import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { agentStateManager } from './state.js';

interface AgentOptions {
  id: string;
  instructions: string;
  directory:    string;
}

interface AgentMessage {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<{
    type: string;
    text?: string;
    tool_use?: {
      id: string;
      name: string;
      input: Record<string, any>;
    };
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

const generalInstructions = `
You will be working with a Python project located in the current directory (which is 'drone-challenge').
Your primary task is to modify the existing file named 'drone.py'.

This file already contains a 'DroneClient' class designed to interact with a gRPC-based drone simulation.
The 'DroneClient' class structure, including gRPC setup, message handling, and logging, is already implemented.
It uses protobuf definitions from a 'generated' subdirectory.

Your main goal is to implement the core flight control logic within the 'control_drone(self)' method of the 'DroneClient' class in 'drone.py'.
- This method is called in the control loop after receiving a state update for the drone.
- Inside 'control_drone(self)', you should calculate appropriate 'throttle', 'pitch', and 'roll' values based on the drone's current 'self.position' and the 'self.goal_region'.
- After calculating these values, you must create a 'pb2.DroneClientMsg' and send it using 'self.send_queue.put(control_message)'.

If using PID controllers, follow these specific requirements:
1. PID Controller Structure:
   - Use separate PID controllers for roll, pitch, and throttle
   - Initialize with appropriate gains:
     * Roll/Pitch: kp=4.0, ki=0.2, kd=1.0
     * Throttle: kp=3.0, ki=0.2, kd=0.5
   - Include anti-windup protection by clamping integral term to [-100, 100]
   - Use proper float type conversion for all PID parameters

2. Control Direction Mapping:
   - Positive pitch moves forward (+x), negative pitch moves backward (-x)
   - Positive roll moves right (+y), negative roll moves left (-y)
   - Positive throttle moves up (+z)
   - Add base throttle of 50 to overcome gravity

3. Error Calculation:
   - Calculate error as (target - current) for each axis
   - Use minimal_point of goal_region for target position
   - Ensure proper time delta handling with fallback value of 0.1s

4. Output Clamping:
   - Roll/Pitch: -45 to 45 degrees
   - Throttle: 0 to 100 percent
   - Round final values to integers for control message

After implementing the control logic:
1. Run the implementation using 'python src/drone_challenge/drone.py'
2. Analyze the output data which shows position and error metrics
3. Based on the results, iterate on your implementation to improve performance
4. Focus on minimizing position errors and achieving stable flight

The simulation provides:
- Position updates every 100ms
- Control ranges: roll (-45 to 45), throttle (0-100), pitch (-45 to 45) (provided as int32)
- Wind simulation and battery impact on throttle
- Goal region to reach and maintain position

Do NOT modify the gRPC setup, the 'DroneConnection' handling, the 'SimulationState' enum, or the overall structure of the 'control_loop' unless explicitly asked.
The 'if __name__ == "__main__":' block for running the client is already present and configured with default HOST, PORT, and TOKEN.
Focus solely on the logic within 'control_drone(self)' using the provided experiment-specific instructions.
Make sure your Python code is valid and directly executable.
`;

async function runDroneImplementation(experimentId: string, dronePath: string): Promise<void> {
  try {
    const pythonPath = path.join(dronePath, 'src', 'drone_challenge', 'drone.py');
    
    // Run the drone implementation
    const droneProcess = spawn('python', [pythonPath], {
      cwd: dronePath,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let testData: any[] = [];
    let lastPosition = { x: 0, y: 0, z: 0 };
    let lastTimestamp = Date.now();

    // Process stdout for position and error data
    droneProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('timestamp,')) continue; // Skip header
        
        const [timestamp, posX, posY, posZ, errorX, errorY, errorZ] = line.split(',').map(Number);
        
        // Create test data point
        const testDataPoint = {
          position: { x: posX, y: posY, z: posZ },
          controls: {
            throttle: 0, // These will be updated when we receive control messages
            pitch: 0,
            roll: 0
          },
          timestamp: new Date(timestamp * 1000).toISOString()
        };
        
        testData.push(testDataPoint);
        
        // Store test data periodically
        if (testData.length >= 10) {
          fetch(`http://localhost:3000/api/store_test_data?id=${experimentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testData })
          }).catch(console.error);
          
          testData = [];
        }
      }
    });

    // Handle stderr
    droneProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      console.error(`Drone stderr: ${error}`);
      agentStateManager.addMessage(experimentId, `Drone error: ${error}`, 'error');
    });

    // Handle process completion
    droneProcess.on('close', (code) => {
      if (code === 0) {
        agentStateManager.addMessage(experimentId, 'Drone implementation completed successfully', 'success');
      } else {
        agentStateManager.addMessage(experimentId, `Drone implementation exited with code ${code}`, 'error');
      }
    });

  } catch (error) {
    console.error('Error running drone implementation:', error);
    agentStateManager.addMessage(experimentId, `Error running drone: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

export async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory, id } = options;
  const absExperimentDir = path.resolve(process.cwd(), directory); // e.g. /path/to/workspace/experiments/experiment_id

  // 0) Define paths and create target directory for drone challenge files
  const workspaceRoot = path.resolve(absExperimentDir, '..', '..'); // Assumes experiments dir is two levels down from workspace root
  const droneChallengeSrcPath = path.join(workspaceRoot, 'drone-challenge');
  const droneChallengeDestPath = path.join(absExperimentDir, 'drone-challenge');

  try {
    if (!fs.existsSync(droneChallengeSrcPath)) {
      const errorMsg = `Source drone-challenge directory not found at: ${droneChallengeSrcPath}`;
      console.error(`❌ ${errorMsg}`);
      agentStateManager.addMessage(id, errorMsg, 'error');
      agentStateManager.updateState(id, { status: 'error', error: errorMsg });
      return;
    }
    // Ensure the destination parent directory (absExperimentDir) exists; fs.cpSync requires this for recursive copy.
    if (!fs.existsSync(absExperimentDir)) {
        fs.mkdirSync(absExperimentDir, { recursive: true });
    }
    fs.cpSync(droneChallengeSrcPath, droneChallengeDestPath, { recursive: true });
    console.log(`✅ Copied 'drone-challenge' to: ${droneChallengeDestPath}`);
    agentStateManager.addMessage(id, `Copied 'drone-challenge' to: ${droneChallengeDestPath}`, 'info');
  } catch (copyError: any) {
    const errorMsg = `Failed to copy drone-challenge directory: ${copyError.message}`;
    console.error(`❌ ${errorMsg}`);
    agentStateManager.addMessage(id, errorMsg, 'error');
    agentStateManager.updateState(id, { status: 'error', error: errorMsg });
    return;
  }

  // 1) Verify the working directory (drone-challenge within experiment) exists
  if (!fs.existsSync(droneChallengeDestPath) || !fs.statSync(droneChallengeDestPath).isDirectory()) {
    console.error(`❌ Experiment drone-challenge directory not found: ${droneChallengeDestPath}`);
    agentStateManager.addMessage(id, `Experiment drone-challenge directory not found: ${droneChallengeDestPath}`, 'error');
    agentStateManager.updateState(id, {
      status: 'error',
      error: `Directory not found: ${droneChallengeDestPath}`
    });
    return;
  }

  console.log(`▶ Working directory for agent: ${droneChallengeDestPath}`);
  console.log(`▶ Prompt instructions: ${instructions}`);

  // Create a new state for this agent run
  agentStateManager.createState(id);
  agentStateManager.addMessage(id, 'Starting agent process...', 'info');

  // 2) Resolve the Claude binary
  let claudePath: string;
  try {
    claudePath = (await execSync('which claude')).toString().trim();
  } catch (err) {
    const errorMsg = 'Could not locate `claude` on PATH. Install it or adjust PATH.';
    console.error(`❌ ${errorMsg}`);
    agentStateManager.addMessage(id, errorMsg, 'error');
    agentStateManager.updateState(id, { 
      status: 'error',
      error: errorMsg
    });
    return;
  }

  if (!fs.existsSync(claudePath)) {
    const errorMsg = `Claude binary not found at: ${claudePath}`;
    console.error(`❌ ${errorMsg}`);
    agentStateManager.addMessage(id, errorMsg, 'error');
    agentStateManager.updateState(id, { 
      status: 'error',
      error: errorMsg
    });
    return;
  }
  console.log(`▶ Using claude at: ${claudePath}`);
  agentStateManager.addMessage(id, `Using claude at: ${claudePath}`, 'info');

  // 3) Spawn the process directly, passing each flag as a separate arg
  const claudeProc = spawn(
    claudePath,
    [
      '-p', instructions + ' ' + generalInstructions,
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions'
    ],
    {
      cwd: droneChallengeDestPath, // Agent works inside the copied drone-challenge directory
      env: process.env,
      shell: false,      // no /bin/sh involved
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  // 4) Always listen for the 'error' event to catch ENOENT or permission errors
  claudeProc.on('error', err => {
    const errorMsg = `Failed to start Claude process: ${err.message}`;
    console.error(`❌ ${errorMsg}`);
    agentStateManager.addMessage(id, errorMsg, 'error');
    agentStateManager.updateState(id, { 
      status: 'error',
      error: errorMsg
    });
  });

  // 5) Stream stdout/stderr and process messages
  claudeProc.stdout.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk);
    
    // Process the JSON messages
    try {
      const messages = chunk.toString().trim().split('\n');
      for (const msg of messages) {
        if (msg.startsWith('[')) continue; // Skip array markers
        try {
          const parsed = JSON.parse(msg) as AgentMessage;
          
          // Extract the main content text
          const content = parsed.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join(' ');
            
          if (content) {
            agentStateManager.addMessage(id, content, 'info');
          }
        } catch (parseErr) {
          // Log parsing errors but don't fail the process
          console.warn(`⚠️ Failed to parse message: ${msg}`);
          agentStateManager.addMessage(id, `Failed to parse message: ${msg}`, 'warning');
        }
      }
    } catch (err) {
      // Log chunk processing errors but don't fail the process
      console.warn(`⚠️ Failed to process chunk: ${err instanceof Error ? err.message : 'Unknown error'}`);
      agentStateManager.addMessage(id, `Failed to process chunk: ${err instanceof Error ? err.message : 'Unknown error'}`, 'warning');
    }
  });

  claudeProc.stderr.on('data', (chunk: Buffer) => {
    const errorMsg = chunk.toString();
    process.stderr.write(chunk);
    agentStateManager.addMessage(id, errorMsg, 'warning');
  });

  // 6) Handle exit
  claudeProc.on('close', async code => {
    if (code === 0) {
      console.log('\n✅ Claude exited successfully.');
      agentStateManager.addMessage(id, 'Claude exited successfully', 'success');
      
      // Run the drone implementation after Claude exits
      try {
        await runDroneImplementation(id, droneChallengeDestPath);
        agentStateManager.updateState(id, { status: 'completed' });
      } catch (error) {
        console.error('Error running drone implementation:', error);
        agentStateManager.addMessage(id, `Error running drone: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        agentStateManager.updateState(id, { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      const errorMsg = `Claude exited with code ${code}`;
      console.error(`\n❌ ${errorMsg}`);
      agentStateManager.addMessage(id, errorMsg, 'error');
      agentStateManager.updateState(id, { 
        status: 'error',
        error: errorMsg
      });
    }
  });
}