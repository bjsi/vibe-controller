import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

interface AgentOptions {
  instructions: string;
  directory: string;
}

export async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory } = options;
  const absDir: string = path.resolve(process.cwd(), directory);

  console.log(`▶ Running in directory: ${absDir}`);
  console.log(`▶ Instructions: ${instructions}`);

  const claudePath = execSync('which claude').toString().trim();
  const claudeProc = spawn(
    claudePath,
    ['-p', instructions, '--output-format', 'json', '--dangerously-skip-permissions'],
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