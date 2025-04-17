/**
 * Development server starter script
 * This script starts both the backend and frontend servers concurrently
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Determine if we're on Windows
const isWindows = os.platform() === 'win32';

// Define commands for different platforms
const commands = {
  backend: {
    cmd: isWindows ? 'uvicorn' : 'uvicorn',
    args: ['app.main:app', '--reload'],
    cwd: path.join(__dirname, 'backend')
  },
  frontend: {
    cmd: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.join(__dirname, 'frontend')
  }
};

// Function to start a process
function startProcess(name, config) {
  console.log(`Starting ${name}...`);
  
  const process = spawn(config.cmd, config.args, {
    cwd: config.cwd,
    shell: true,
    stdio: 'pipe'
  });
  
  // Handle process output
  process.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });
  
  process.stderr.on('data', (data) => {
    console.error(`[${name}] ${data.toString().trim()}`);
  });
  
  // Handle process exit
  process.on('close', (code) => {
    if (code !== 0) {
      console.log(`[${name}] process exited with code ${code}`);
    }
  });
  
  return process;
}

// Start both servers
console.log('Starting development servers...');
const backendProcess = startProcess('backend', commands.backend);
const frontendProcess = startProcess('frontend', commands.frontend);

// Handle script termination
process.on('SIGINT', () => {
  console.log('Stopping development servers...');
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(0);
});

console.log('\nDevelopment servers started!');
console.log('- Backend: http://localhost:8000');
console.log('- Frontend: http://localhost:5173');
console.log('\nPress Ctrl+C to stop both servers.\n');
