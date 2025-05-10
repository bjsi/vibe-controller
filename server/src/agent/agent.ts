import { spawn, execSync, exec } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

interface AgentOptions {
  instructions: string;
  directory: string;
}

export async function startAgent(options: AgentOptions): Promise<void> {
  const { instructions, directory } = options;

  console.log(`▶ Running in directory: ${directory}`);
  console.log(`▶ Instructions: ${instructions}`);

  const claudePath = execSync('which claude').toString().trim();
  const claudeProc = exec(
    `${claudePath} -p "${instructions}" --output-format stream-json --dangerously-skip-permissions`,
    {
      cwd: directory,
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