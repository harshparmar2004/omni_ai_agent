const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

let microserviceProcess = null;
let isStarting = false;

const MICROSERVICE_PORT = 8001;
const MICROSERVICE_URL = `http://127.0.0.1:${MICROSERVICE_PORT}`;

/**
 * Checks if the Python microservice is alive and responsive
 */
async function isMicroserviceRunning() {
  try {
    const res = await axios.get(`${MICROSERVICE_URL}/`, { timeout: 2500 });
    return res.data?.status === 'online';
  } catch (e) {
    return false;
  }
}

/**
 * Spawns and supervises the Python instagrapi microservice on port 8001
 */
async function startMicroserviceDaemon() {
  if (microserviceProcess || isStarting) return;
  isStarting = true;

  const alreadyRunning = await isMicroserviceRunning();
  if (alreadyRunning) {
    console.log(`[Microservice Daemon] 🟢 Python instagrapi microservice already running on :${MICROSERVICE_PORT}`);
    isStarting = false;
    return;
  }

  const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'instagram_microservice.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  console.log(`[Microservice Daemon] 🚀 Spawning Instagram Mobile Microservice on port ${MICROSERVICE_PORT}...`);

  try {
    microserviceProcess = spawn(pythonCmd, [scriptPath], {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(MICROSERVICE_PORT) }
    });

    microserviceProcess.stdout.on('data', data => {
      const line = data.toString().trim();
      if (line && !line.includes('GET /direct/inbox_shares') && !line.includes('200 OK')) {
        console.log(`[Microservice :${MICROSERVICE_PORT}] ${line}`);
      }
    });

    microserviceProcess.stderr.on('data', data => {
      const line = data.toString().trim();
      if (line && !line.includes('GET /direct/inbox_shares') && !line.includes('200 OK')) {
        console.warn(`[Microservice :${MICROSERVICE_PORT} stderr] ${line}`);
      }
    });

    microserviceProcess.on('exit', (code, signal) => {
      console.warn(`[Microservice Daemon] ⚠️ Process exited (code ${code}, signal ${signal}). Will restart in 8s if needed.`);
      microserviceProcess = null;
      setTimeout(() => {
        startMicroserviceDaemon().catch(() => {});
      }, 8000);
    });

    // Wait up to 10s for the microservice to be healthy
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isMicroserviceRunning()) {
        console.log(`[Microservice Daemon] 🟢 Python instagrapi microservice online and listening on :${MICROSERVICE_PORT}`);
        break;
      }
    }
  } catch (err) {
    console.warn(`[Microservice Daemon] Failed to spawn microservice: ${err.message}`);
  } finally {
    isStarting = false;
  }
}

module.exports = {
  startMicroserviceDaemon,
  isMicroserviceRunning,
  MICROSERVICE_URL
};
