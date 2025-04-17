// Script to run both frontend and backend concurrently
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the project directories
const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Check if the directories exist
if (!fs.existsSync(frontendDir)) {
  console.error(`Frontend directory not found: ${frontendDir}`);
  process.exit(1);
}

if (!fs.existsSync(backendDir)) {
  console.error(`Backend directory not found: ${backendDir}`);
  process.exit(1);
}

console.log('Starting IntelliApply application...');
console.log('--------------------------------------');

// Function to start a process with color-coded output
function startProcess(name, command, args, cwd, color) {
  const colorCodes = {
    blue: '\x1b[34m',
    green: '\x1b[32m',
    reset: '\x1b[0m'
  };

  console.log(`${colorCodes[color]}[${name}] Starting...${colorCodes.reset}`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    shell: true,
    stdio: 'pipe'
  });

  // Handle process output with prefixes and colors
  process.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colorCodes[color]}[${name}]${colorCodes.reset} ${line}`);
      }
    });
  });

  process.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colorCodes[color]}[${name}] ERROR:${colorCodes.reset} ${line}`);
      }
    });
  });

  process.on('close', (code) => {
    console.log(`${colorCodes[color]}[${name}] Process exited with code ${code}${colorCodes.reset}`);
  });

  return process;
}

// Start backend
const backendProcess = startProcess(
  'BACKEND',
  'python',
  ['-m', 'uvicorn', 'app.main:app', '--reload'],
  backendDir,
  'blue'
);

// Start frontend (with a slight delay to let backend start first)
setTimeout(() => {
  const frontendProcess = startProcess(
    'FRONTEND',
    'npm',
    ['run', 'dev'],
    frontendDir,
    'green'
  );

  // Handle frontend process termination
  frontendProcess.on('close', () => {
    console.log('Frontend process terminated, shutting down backend...');
    backendProcess.kill();
  });
}, 2000);

// Handle script termination
process.on('SIGINT', () => {
  console.log('\nShutting down all processes...');
  backendProcess.kill();
  process.exit(0);
});

console.log('Press Ctrl+C to stop all services.');
