const axios = require('axios');

class Logger {
  constructor(baseURL) {
    if (!baseURL) throw new Error('Logger requires a baseURL');
    
    this.baseURL = baseURL;
    this.authToken = null;
    
    this.VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
    this.VALID_PACKAGES = new Set([
      'controller', 'service', 'repository', 'route', 'handler', 'db', 'cache', 'cron_job',
      'auth', 'config', 'middleware', 'utils'
    ]);
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  async log(stack, level, pkg, message) {
    if (stack !== 'backend') stack = 'backend';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

      const payload = { stack, level, package: pkg, message };

      if (level === 'error' || level === 'fatal') {
        console.error(`[${level.toUpperCase()}] [${pkg}] ${message}`);
      } else {
        console.log(`[${level.toUpperCase()}] [${pkg}] ${message}`);
      }

      await axios.post(`${this.baseURL}/evaluation-service/logs`, payload, {
        headers,
        timeout: 5000
      });
      
    } catch (error) {
      console.warn('[Logger Error] Failed to send log:', error?.response?.status || error.message);
    }
  }
}

module.exports = Logger;
