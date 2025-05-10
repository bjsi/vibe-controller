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
Please use Python.
Implement your solution in a single file called main.py.`

export async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory, id } = options;
  const absDir = path.resolve(process.cwd(), directory);

  // 1) Verify the working directory exists
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`❌ Experiment directory not found: ${absDir}`);
    agentStateManager.addMessage(id, `Experiment directory not found: ${absDir}`, 'error');
    agentStateManager.updateState(id, { 
      status: 'error',
      error: `Directory not found: ${absDir}`
    });
    return;
  }

  console.log(`▶ Working directory: ${absDir}`);
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
      cwd: absDir,
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
  claudeProc.on('close', code => {
    if (code === 0) {
      console.log('\n✅ Claude exited successfully.');
      agentStateManager.addMessage(id, 'Claude exited successfully', 'success');
      agentStateManager.updateState(id, { status: 'completed' });
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