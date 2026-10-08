import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const venv = path.join(root, 'backend', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.INTELLIAPPLY_PYTHON || (existsSync(venv) ? venv : 'python');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const [command, args, cwd] of [
  [python, ['-m', 'pytest'], 'backend'],
  [python, ['-m', 'flake8', 'app', 'tests', 'migrations', '--select=F,E9'], 'backend'],
  [npm, ['run', 'lint', '--', '--max-warnings=0'], 'frontend'],
  [npm, ['test'], 'frontend'],
]) {
  const result = spawnSync(command, args, { cwd: path.join(root, cwd), stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
