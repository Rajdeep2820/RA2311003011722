const axios = require('axios');

class Logger {
  /**
   * Initializes the Logger.
   * @param {string} baseURL The base URL for the evaluation-service
   */
  constructor(baseURL) {
    if (!baseURL) {
      throw new Error('Logger requires a baseURL');
    }
    this.baseURL = baseURL;
    this.authToken = null;
    
    // Strict definitions based on assignment requirements
    this.VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
    this.VALID_PACKAGES = new Set([
      'controller', 'service', 'repository', 'route', 'handler', 'db', 'cache', 'cron_job',
      'auth', 'config', 'middleware', 'utils'
    ]);
  }

  /**
   * Stores the auth token to be automatically attached to logs.
   * @param {string} token 
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Sends a structured log to the evaluation-service automatically.
   * 
   * @param {string} stack - e.g. "backend"
   * @param {string} level - debug | info | warn | error | fatal
   * @param {string} pkg - The package name (controller, service, etc.)
   * @param {string} message - Description of the log event
   */
  async log(stack, level, pkg, message) {
    if (stack !== 'backend') {
      console.warn(`[Logger] Stack must be "backend", overriding ${stack}`);
      stack = 'backend';
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Attach Auth Token automatically
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const payload = { stack, level, package: pkg, message };

      // Log locally so we can track what's happening during development
      if (level === 'error' || level === 'fatal') {
        console.error(`[${level.toUpperCase()}] [${pkg}] ${message}`);
      } else {
        console.log(`[${level.toUpperCase()}] [${pkg}] ${message}`);
      }

      // Call the API endpoint
      await axios.post(`${this.baseURL}/evaluation-service/logs`, payload, {
        headers,
        timeout: 5000 // Failsafe timeout
      });
      
    } catch (error) {
       // Graceful failure - logging shouldn't crash the main app
      console.warn('[Logger Error] Failed to send log to external API:', error?.response?.status || error.message);
    }
  }
}

// Export as a singleton instance so it can be shared across the system
module.exports = Logger;
