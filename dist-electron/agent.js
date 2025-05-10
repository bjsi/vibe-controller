#!/usr/bin/env ts-node
import { spawn } from 'child_process';
import path from 'path';
import process from 'process';
async function main() {
    const argv = process.argv.slice(2);
    const [targetDir, ...promptParts] = argv;
    if (!targetDir || promptParts.length === 0) {
        console.error('Usage: run-claude.ts <targetDir> "<prompt text>"');
        process.exit(1);
    }
    const prompt = promptParts.join(' ');
    const absDir = path.resolve(process.cwd(), targetDir);
    console.log(`▶ Running in directory: ${absDir}`);
    console.log(`▶ Prompt: ${prompt}`);
    const claudeProc = spawn('claude', ['-p', prompt, '--output-format', 'json'], {
        cwd: absDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
    });
    claudeProc.stdout?.on('data', (data) => {
        process.stdout.write(data);
    });
    claudeProc.stderr?.on('data', (data) => {
        process.stderr.write(data);
    });
    claudeProc.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Claude exited successfully.');
            process.exit(0);
        }
        else {
            console.error(`\n❌ Claude exited with code ${code}.`);
            process.exit(code ?? 1);
        }
    });
}
main().catch((err) => {
    console.error('Error running Claude:', err);
    process.exit(1);
});
