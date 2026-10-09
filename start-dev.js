const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const windows = process.platform === 'win32';
const python = path.join(__dirname, 'backend', '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) throw new Error('Install the backend dependencies in backend/.venv first; see README.md.');

const children = [
  spawn(python, ['-m', 'uvicorn', 'app.main:app', '--reload'], { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' }),
  spawn(windows ? 'npm.cmd' : 'npm', ['run', 'dev'], { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit', shell: windows }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
