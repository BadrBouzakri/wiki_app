const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const chokidar = require('chokidar');
const io = require('socket.io-client');
const logger = require('../server/utils/logger');

class SystemMonitor {
  constructor() {
    this.socket = null;
    this.watchers = new Map();
    this.commandHistory = new Set();
    this.activeProcesses = new Map();
    this.monitoringInterval = process.env.MONITOR_INTERVAL || 5000;
    this.isRunning = false;
  }

  async start() {
    try {
      await this.connectToServer();
      this.setupCommandWatcher();
      this.setupFileWatcher();
      this.setupProcessWatcher();
      this.setupNetworkWatcher();
      this.setupLogWatcher();
      
      this.isRunning = true;
      logger.info('🔍 System Monitor started successfully');
      
      // Start periodic context analysis
      this.startContextAnalysis();
    } catch (error) {
      logger.error('Failed to start System Monitor:', error);
      throw error;
    }
  }

  async connectToServer() {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    this.socket = io(serverUrl);
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        logger.info('Connected to Wiki App server');
        resolve();
      });
      
      this.socket.on('disconnect', () => {
        logger.warn('Disconnected from Wiki App server');
      });
      
      this.socket.on('connect_error', (error) => {
        logger.error('Connection error:', error);
        reject(error);
      });
    });
  }

  setupCommandWatcher() {
    const historyFiles = [
      path.join(process.env.HOME, '.bash_history'),
      path.join(process.env.HOME, '.zsh_history'),
      path.join(process.env.HOME, '.history')
    ];

    historyFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const watcher = chokidar.watch(file, { persistent: true });
        watcher.on('change', () => this.analyzeCommandHistory(file));
        this.watchers.set(`history:${file}`, watcher);
        logger.info(`Watching command history: ${file}`);
      }
    });
  }

  setupFileWatcher() {
    const watchPaths = [
      process.cwd(), // Current working directory
      '/etc', // System config files
      path.join(process.env.HOME, '.ssh'), // SSH configs
      path.join(process.env.HOME, '.kube'), // Kubernetes configs
    ];

    watchPaths.forEach(watchPath => {
      if (fs.existsSync(watchPath)) {
        const watcher = chokidar.watch(watchPath, {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true,
          depth: 2
        });
        
        watcher.on('change', (path) => this.analyzeFileChange(path));
        this.watchers.set(`files:${watchPath}`, watcher);
        logger.info(`Watching files in: ${watchPath}`);
      }
    });
  }

  setupProcessWatcher() {
    setInterval(() => {
      this.analyzeRunningProcesses();
    }, this.monitoringInterval);
  }

  setupNetworkWatcher() {
    setInterval(() => {
      this.analyzeNetworkActivity();
    }, this.monitoringInterval);
  }

  setupLogWatcher() {
    const logPaths = [
      '/var/log/syslog',
      '/var/log/messages',
      '/var/log/kern.log',
      '/var/log/auth.log'
    ];

    logPaths.forEach(logPath => {
      if (fs.existsSync(logPath)) {
        const watcher = chokidar.watch(logPath, { persistent: true });
        watcher.on('change', () => this.analyzeLogChanges(logPath));
        this.watchers.set(`logs:${logPath}`, watcher);
        logger.info(`Watching log file: ${logPath}`);
      }
    });
  }

  async analyzeCommandHistory(historyFile) {
    try {
      const content = fs.readFileSync(historyFile, 'utf8');
      const commands = content.split('\n').filter(cmd => cmd.trim());
      const recentCommands = commands.slice(-10); // Last 10 commands
      
      const newCommands = recentCommands.filter(cmd => !this.commandHistory.has(cmd));
      
      if (newCommands.length > 0) {
        newCommands.forEach(cmd => this.commandHistory.add(cmd));
        
        const contextData = {
          type: 'command_execution',
          commands: newCommands,
          timestamp: Date.now(),
          source: historyFile
        };
        
        this.sendContextUpdate(contextData);
        logger.debug('New commands detected:', newCommands);
      }
    } catch (error) {
      logger.error('Error analyzing command history:', error);
    }
  }

  analyzeFileChange(filePath) {
    const contextData = {
      type: 'file_modification',
      file: filePath,
      timestamp: Date.now(),
      extension: path.extname(filePath),
      directory: path.dirname(filePath)
    };
    
    this.sendContextUpdate(contextData);
    logger.debug('File changed:', filePath);
  }

  async analyzeRunningProcesses() {
    try {
      exec('ps aux --sort=-%cpu | head -20', (error, stdout) => {
        if (error) return;
        
        const processes = stdout.split('\n')
          .slice(1) // Skip header
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              user: parts[0],
              pid: parts[1],
              cpu: parts[2],
              mem: parts[3],
              command: parts.slice(10).join(' ')
            };
          });
        
        const contextData = {
          type: 'process_analysis',
          processes: processes.slice(0, 10), // Top 10 processes
          timestamp: Date.now()
        };
        
        this.sendContextUpdate(contextData);
      });
    } catch (error) {
      logger.error('Error analyzing processes:', error);
    }
  }

  async analyzeNetworkActivity() {
    try {
      exec('netstat -tuln | grep LISTEN', (error, stdout) => {
        if (error) return;
        
        const connections = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              protocol: parts[0],
              localAddress: parts[3],
              state: parts[5]
            };
          });
        
        const contextData = {
          type: 'network_activity',
          connections: connections,
          timestamp: Date.now()
        };
        
        this.sendContextUpdate(contextData);
      });
    } catch (error) {
      logger.error('Error analyzing network:', error);
    }
  }

  async analyzeLogChanges(logPath) {
    try {
      exec(`tail -10 ${logPath}`, (error, stdout) => {
        if (error) return;
        
        const logEntries = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => ({
            message: line,
            timestamp: Date.now(),
            source: logPath
          }));
        
        const contextData = {
          type: 'log_update',
          entries: logEntries,
          logFile: logPath,
          timestamp: Date.now()
        };
        
        this.sendContextUpdate(contextData);
      });
    } catch (error) {
      logger.error('Error analyzing logs:', error);
    }
  }

  startContextAnalysis() {
    setInterval(() => {
      if (this.isRunning) {
        this.generateContextSummary();
      }
    }, this.monitoringInterval * 2); // Every 10 seconds by default
  }

  generateContextSummary() {
    const summary = {
      type: 'context_summary',
      timestamp: Date.now(),
      recentCommands: Array.from(this.commandHistory).slice(-5),
      activeWatchers: this.watchers.size,
      systemLoad: this.getSystemLoad()
    };
    
    this.sendContextUpdate(summary);
  }

  getSystemLoad() {
    try {
      const uptime = require('os').loadavg();
      return {
        load1: uptime[0],
        load5: uptime[1],
        load15: uptime[2]
      };
    } catch (error) {
      return null;
    }
  }

  sendContextUpdate(contextData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('context-update', contextData);
      logger.debug('Context update sent:', contextData.type);
    }
  }

  async stop() {
    this.isRunning = false;
    
    // Close all file watchers
    this.watchers.forEach((watcher, key) => {
      watcher.close();
      logger.info(`Stopped watching: ${key}`);
    });
    
    // Disconnect from server
    if (this.socket) {
      this.socket.disconnect();
    }
    
    logger.info('System Monitor stopped');
  }
}

// Start the monitor if this file is run directly
if (require.main === module) {
  const monitor = new SystemMonitor();
  
  monitor.start().catch(error => {
    logger.error('Failed to start monitor:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, stopping monitor...');
    await monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, stopping monitor...');
    await monitor.stop();
    process.exit(0);
  });
}

module.exports = SystemMonitor;