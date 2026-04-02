const net = require('net');
const { exec } = require('child_process');

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      const address = server.address();
      server.close(() => {
        resolve(true); // Port is free
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        reject(err);
      }
    });
  });
}

async function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti:${port}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve(false); // No process found
        return;
      }
      
      if (process.platform === 'win32') {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            pids.add(parts[4]);
          }
        });
        
        if (pids.size === 0) {
          resolve(false);
          return;
        }
        
        // Kill each process
        let killedCount = 0;
        const totalPids = pids.size;
        
        pids.forEach(pid => {
          exec(`taskkill /F /PID ${pid}`, (killError) => {
            killedCount++;
            if (killedCount === totalPids) {
              resolve(true);
            }
          });
        });
      } else {
        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length === 0) {
          resolve(false);
          return;
        }
        
        exec(`kill -9 ${pids.join(' ')}`, (killError) => {
          resolve(!killError);
        });
      }
    });
  });
}

async function ensurePortFree(port) {
  try {
    const isFree = await checkPort(port);
    
    if (isFree) {
      console.log(`✅ Port ${port} is free`);
      return true;
    }
    
    console.log(`⚠️ Port ${port} is in use, attempting to free it...`);
    const killed = await killProcessOnPort(port);
    
    if (killed) {
      console.log(`✅ Successfully freed port ${port}`);
      return true;
    } else {
      console.log(`❌ Failed to free port ${port}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error checking port ${port}:`, error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const port = process.argv[2] || 8000;
  ensurePortFree(port).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkPort, killProcessOnPort, ensurePortFree };
