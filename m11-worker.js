#!/usr/bin/env node
/**
 * Kxko M11 request worker
 * Polls Supabase public.server_requests and executes owner-approved jobs on the M11.
 * Requires Node 18+ and environment variables in ~/server/services/.env.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnv(path.join(__dirname, '.env'));

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OWNER_USER_ID = process.env.OWNER_USER_ID || 'ea1b170e-192b-43c6-a25a-e5e6bef7e6e2';
const WORKDIR = process.env.SERVER_WORKDIR || os.homedir();
const POLL_MS = Math.max(750, Number(process.env.WORKER_POLL_MS || 1200));
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT = 45000;
const running = new Map();
let polling = false;
let stopping = false;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[kxko-worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in services/.env');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

function log(message) {
  console.log(`[kxko-worker] ${new Date().toISOString()} ${message}`);
}

async function rest(tableQuery, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableQuery}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${body.slice(0, 1000)}`);
  if (!body) return null;
  return JSON.parse(body);
}

async function updateRequest(id, values, extraFilter = '') {
  const query = `server_requests?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(OWNER_USER_ID)}${extraFilter}`;
  return rest(query, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
}

async function finish(id, status, output) {
  try {
    await updateRequest(id, {
      status,
      output: String(output || '').slice(-MAX_OUTPUT),
      finished_at: new Date().toISOString(),
    });
    log(`request ${id} -> ${status}`);
  } catch (error) {
    log(`could not save result for ${id}: ${error.message}`);
  }
}

function commandFor(row) {
  switch (row.preset) {
    case 'status':
      return 'printf "=== DEVICE ===\\n"; getprop ro.build.version.release 2>/dev/null || true; printf "\\n=== UPTIME ===\\n"; uptime; printf "\\n=== DISK ===\\n"; df -h "$HOME"; printf "\\n=== MEMORY ===\\n"; grep -E "MemTotal|MemAvailable" /proc/meminfo 2>/dev/null; printf "\\n=== NODE ===\\n"; node -v';
    case 'processes':
      return 'ps -A | head -n 40';
    case 'logs':
      return 'pm2 logs --nostream --lines 50 2>&1';
    case 'pm2_list':
      return 'pm2 status';
    case 'pm2_restart':
      if (row.target && row.target !== 'kxko-test') throw new Error('Only the kxko-test process is allowed for this preset.');
      return 'pm2 restart kxko-test';
    case 'pm2_start':
      if (row.target && row.target !== 'kxko-test') throw new Error('Only the kxko-test process is allowed for this preset.');
      return 'pm2 restart kxko-test 2>/dev/null || pm2 start "$HOME/server/services/test-server.js" --name kxko-test';
    case 'custom':
      if (typeof row.command !== 'string' || !row.command.trim()) throw new Error('No command was supplied.');
      if (row.command.length > 500) throw new Error('Command is longer than 500 characters.');
      return row.command;
    default:
      throw new Error(`Unsupported preset: ${row.preset}`);
  }
}

function killJob(job) {
  if (!job || !job.child || job.child.exitCode !== null) return false;
  try {
    if (job.child.pid) process.kill(-job.child.pid, 'SIGTERM');
    else job.child.kill('SIGTERM');
  } catch {
    try { job.child.kill('SIGTERM'); } catch {}
  }
  return true;
}

async function handleStop(row) {
  const targetId = row.target;
  const job = targetId ? running.get(targetId) : null;
  if (!job) {
    await finish(row.id, 'done', targetId ? `No active command found for request ${targetId}.` : 'No target request was supplied.');
    return;
  }
  job.stopRequested = true;
  killJob(job);
  await finish(row.id, 'done', `Stop signal sent to request ${targetId}.`);
}

async function execute(row) {
  if (row.preset === 'stop') return handleStop(row);

  let command;
  try {
    command = commandFor(row);
  } catch (error) {
    await finish(row.id, 'error', error.message);
    return;
  }

  const job = { child: null, output: '', stopRequested: false, timer: null };
  running.set(row.id, job);
  log(`running ${row.preset} request ${row.id}`);

  const child = spawn(command, {
    cwd: WORKDIR,
    shell: true,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  job.child = child;

  const append = (chunk) => {
    job.output = (job.output + chunk.toString()).slice(-MAX_OUTPUT);
    // Keep the website's live output field refreshed while a command is running.
    updateRequest(row.id, { output: job.output }).catch((error) => log(`live output update failed: ${error.message}`));
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);

  job.timer = setTimeout(() => {
    job.output += '\\n[Worker] Command timed out after 10 minutes.';
    killJob(job);
  }, COMMAND_TIMEOUT_MS);

  child.on('error', async (error) => {
    clearTimeout(job.timer);
    running.delete(row.id);
    await finish(row.id, 'error', `${job.output}\\n${error.message}`);
  });

  child.on('close', async (code, signal) => {
    clearTimeout(job.timer);
    running.delete(row.id);
    const timedOut = job.output.includes('Command timed out after 10 minutes');
    const status = code === 0 && !timedOut && !job.stopRequested ? 'done' : (job.stopRequested ? 'done' : 'error');
    const ending = job.stopRequested ? '\\n[Worker] Stopped by request.' : (timedOut ? '' : `\\n[Worker] Exit code: ${code}; signal: ${signal || 'none'}.`);
    await finish(row.id, status, job.output + ending || '(no output)');
  });
}

async function poll() {
  if (polling || stopping) return;
  polling = true;
  try {
    const rows = await rest(
      `server_requests?select=id,user_id,preset,status,target,command,created_at&user_id=eq.${encodeURIComponent(OWNER_USER_ID)}&status=eq.pending&order=created_at.asc&limit=5`
    );
    for (const row of rows || []) {
      if (stopping) break;
      // Claim atomically: only one worker can change pending -> running.
      const claimed = await updateRequest(row.id, { status: 'running', output: 'Accepted by the M11 worker…' }, '&status=eq.pending');
      if (!claimed || claimed.length === 0) continue;
      execute(row).catch(async (error) => {
        log(`request ${row.id} failed: ${error.message}`);
        await finish(row.id, 'error', error.message);
      });
    }
  } catch (error) {
    log(`poll failed: ${error.message}`);
  } finally {
    polling = false;
  }
}

async function startupCleanup() {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await rest(
    `server_requests?user_id=eq.${encodeURIComponent(OWNER_USER_ID)}&status=eq.pending&created_at=lt.${encodeURIComponent(cutoff)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'error',
        output: 'Expired: this request was still pending when the M11 worker started. Please submit it again.',
        finished_at: new Date().toISOString(),
      }),
    }
  );
  await rest(
    `server_requests?user_id=eq.${encodeURIComponent(OWNER_USER_ID)}&status=eq.running`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'error',
        output: 'Worker restarted before this command completed. Please submit it again.',
        finished_at: new Date().toISOString(),
      }),
    }
  );
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log(`${signal} received; stopping active commands…`);
  for (const job of running.values()) killJob(job);
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

(async () => {
  log(`starting for owner ${OWNER_USER_ID}; workdir=${WORKDIR}`);
  await startupCleanup();
  await poll();
  setInterval(poll, POLL_MS);
  log('online and polling Supabase server_requests');
})().catch((error) => {
  console.error('[kxko-worker] startup failed:', error);
  process.exit(1);
});
