const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const BACKEND_PORT = 3002;

// Ensure data and uploads directories exist
const backendDir = path.join(__dirname, 'backend');
const dataDir = path.join(backendDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const uploadsDir = '/data/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sync database schema before starting
try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
  });
  console.log('Database schema synced successfully.');
} catch (e) {
  console.error('Database sync failed:', e.stderr?.toString() || e.message);
  console.error('Continuing anyway...');
}

const backend = spawn('node', ['backend/dist/main.js'], {
  env: { ...process.env, PORT: String(BACKEND_PORT) },
  stdio: 'inherit',
});

function startFrontend() {
  const frontend = spawn('node', ['frontend/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });

  frontend.on('close', (code) => {
    backend.kill();
    process.exit(code ?? 0);
  });
}

backend.on('spawn', () => {
  setTimeout(startFrontend, 2000);
});

process.on('SIGTERM', () => {
  backend.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  backend.kill('SIGINT');
  process.exit(0);
});
