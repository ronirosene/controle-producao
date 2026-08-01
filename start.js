const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BACKEND_PORT = 3002;
const backendDir = path.join(__dirname, 'backend');
const databaseUrl = process.env.DATABASE_URL || 'file:/data/controle.db';
const databasePath = databaseUrl.startsWith('file:') ? databaseUrl.slice(5) : null;
const uploadsDir = '/data/uploads';
const backupsDir = '/data/backups';

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

function backupDatabase() {
  if (!databasePath || !fs.existsSync(databasePath)) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupsDir, `controle-${timestamp}.db`);
  fs.copyFileSync(databasePath, target);
  const backups = fs.readdirSync(backupsDir)
    .filter((name) => name.endsWith('.db'))
    .sort()
    .reverse();
  for (const oldBackup of backups.slice(14)) {
    fs.unlinkSync(path.join(backupsDir, oldBackup));
  }
  console.log(JSON.stringify({ event: 'database_backup_created', target }));
}

try {
  backupDatabase();
  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
} catch (error) {
  console.error(JSON.stringify({ event: 'database_schema_failed', message: error.message }));
  process.exit(1);
}

let shuttingDown = false;
let backend;
let frontend;

function stop(signal = 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (frontend && !frontend.killed) frontend.kill(signal);
  if (backend && !backend.killed) backend.kill(signal);
  setTimeout(() => process.exit(exitCode), 2_000).unref();
}

function waitForBackend(attempt = 0) {
  const request = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (response) => {
    response.resume();
    if (response.statusCode === 200) return startFrontend();
    retry(attempt);
  });
  request.on('error', () => retry(attempt));
  request.setTimeout(1_000, () => request.destroy());
}

function retry(attempt) {
  if (attempt >= 29) {
    console.error(JSON.stringify({ event: 'backend_readiness_timeout' }));
    return stop('SIGTERM', 1);
  }
  setTimeout(() => waitForBackend(attempt + 1), 1_000);
}

function startFrontend() {
  if (frontend || shuttingDown) return;
  frontend = spawn('node', ['frontend/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });
  frontend.on('error', (error) => {
    console.error(JSON.stringify({ event: 'frontend_spawn_failed', message: error.message }));
    stop('SIGTERM', 1);
  });
  frontend.on('close', (code, signal) => {
    if (!shuttingDown) {
      console.error(JSON.stringify({ event: 'frontend_stopped', code, signal }));
      stop('SIGTERM', code || 1);
    }
  });
}

backend = spawn('node', ['backend/dist/main.js'], {
  env: { ...process.env, PORT: String(BACKEND_PORT) },
  stdio: 'inherit',
});
backend.on('error', (error) => {
  console.error(JSON.stringify({ event: 'backend_spawn_failed', message: error.message }));
  stop('SIGTERM', 1);
});
backend.on('close', (code, signal) => {
  if (!shuttingDown) {
    console.error(JSON.stringify({ event: 'backend_stopped', code, signal }));
    stop('SIGTERM', code || 1);
  }
});
backend.on('spawn', () => waitForBackend());

process.on('SIGTERM', () => stop('SIGTERM', 0));
process.on('SIGINT', () => stop('SIGINT', 0));
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({ event: 'uncaught_exception', message: error.message, stack: error.stack }));
  stop('SIGTERM', 1);
});
process.on('unhandledRejection', (error) => {
  console.error(JSON.stringify({ event: 'unhandled_rejection', message: String(error) }));
  stop('SIGTERM', 1);
});
