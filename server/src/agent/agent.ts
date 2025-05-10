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

export async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory, id } = options;
  const absDir = path.resolve(process.cwd(), directory);

  // 1) Verify the working directory exists
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`❌ Experiment directory not found: ${absDir}`);
    return;
  }

  console.log(`▶ Working directory: ${absDir}`);
  console.log(`▶ Prompt instructions: ${instructions}`);

  // Create a new state for this agent run
  agentStateManager.createState(id);

  // 2) Resolve the Claude binary
  let claudePath: string;
  try {
    claudePath = (await execSync('which claude')).toString().trim();
  } catch (err) {
    console.error('❌ Could not locate `claude` on PATH. Install it or adjust PATH.');
    agentStateManager.addMessage(id, 'Could not locate claude on PATH', 'error');
    return;
  }

  if (!fs.existsSync(claudePath)) {
    console.error(`❌ Claude binary not found at: ${claudePath}`);
    agentStateManager.addMessage(id, `Claude binary not found at: ${claudePath}`, 'error');
    return;
  }
  console.log(`▶ Using claude at: ${claudePath}`);
  agentStateManager.addMessage(id, `Using claude at: ${claudePath}`, 'info');

  // 3) Spawn the process directly, passing each flag as a separate arg
  const claudeProc = spawn(
    claudePath,
    [
      '-p', instructions,
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
    console.error('❌ Failed to start Claude process:', err);
    agentStateManager.addMessage(id, `Failed to start Claude process: ${err.message}`, 'error');
  });

  // 5) Stream stdout/stderr and process messages
  claudeProc.stdout.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk);
    
    // Process the JSON messages
    try {
      const messages = chunk.toString().trim().split('\n');
      for (const msg of messages) {
        if (msg.startsWith('[')) continue; // Skip array markers
        const parsed = JSON.parse(msg) as AgentMessage;
        
        // Extract the main content text
        const content = parsed.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join(' ');
          
        if (content) {
          agentStateManager.addMessage(id, content, 'info');
        }
      }
    } catch (err) {
      // Ignore JSON parsing errors for non-JSON output
    }
  });

  claudeProc.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
    agentStateManager.addMessage(id, chunk.toString(), 'warning');
  });

  // 6) Handle exit
  claudeProc.on('close', code => {
    if (code === 0) {
      console.log('\n✅ Claude exited successfully.');
      agentStateManager.addMessage(id, 'Claude exited successfully', 'success');
      agentStateManager.updateState(id, { status: 'completed' });
    } else {
      console.error(`\n❌ Claude exited with code ${code}.`);
      agentStateManager.addMessage(id, `Claude exited with code ${code}`, 'error');
      agentStateManager.updateState(id, { 
        status: 'error',
        error: `Process exited with code ${code}`
      });
    }
  });
}