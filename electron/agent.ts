import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

interface AgentOptions {
  instructions: string;
  directory: string;
}

async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory } = options;
  const absDir: string = path.resolve(process.cwd(), directory);

  console.log(`▶ Running in directory: ${absDir}`);
  console.log(`▶ Instructions: ${instructions}`);

  const claudeProc = spawn(
    'claude',
    ['-p', instructions, '--output-format', 'json'],
    {
      cwd: absDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

  claudeProc.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(data);
  });

  claudeProc.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data);
  });

  claudeProc.on('close', (code: number | null) => {
    if (code === 0) {
      console.log('\n✅ Claude exited successfully.');
      process.exit(0);
    } else {
      console.error(`\n❌ Claude exited with code ${code}.`);
      process.exit(code ?? 1);
    }
  });
}

// Example usage:
// startAgent({ instructions: "your instructions here", directory: "." }).catch((err: unknown) => {
//   console.error('Error running Claude:', err);
//   process.exit(1);
// });

// For backward compatibility, parse command-line arguments if no options are provided
const argv = process.argv.slice(2);
if (argv.length >= 2) {
  const [targetDir, ...promptParts] = argv;
  const prompt: string = promptParts.join(' ');
  startAgent({ instructions: prompt, directory: targetDir }).catch((err: unknown) => {
    console.error('Error running Claude:', err);
    process.exit(1);
  });
} else {
  console.error('Usage: run-claude.ts <targetDir> "<prompt text>"');
  process.exit(1);
}