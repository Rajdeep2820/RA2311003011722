const axios = require('axios');
const Logger = require('../../logging_middleware');

class EvaluationService {
  constructor() {
    this.baseURL = process.env.EVALUATION_SERVICE_URL;
    this.logger = new Logger(this.baseURL);
    this.accessToken = null;
  }

  async authenticate() {
    const { 
      EVALUATION_SERVICE_URL, USER_EMAIL, USER_NAME, 
      USER_ROLL_NO, ACCESS_CODE, CLIENT_ID, CLIENT_SECRET
    } = process.env;

    if (!EVALUATION_SERVICE_URL || !CLIENT_ID || !CLIENT_SECRET) {
       await this.logger.log('backend', 'fatal', 'auth', 'Missing CLIENT_ID or CLIENT_SECRET in env.');
       throw new Error('Missing client credentials.');
    }

    try {
      await this.logger.log('backend', 'info', 'auth', 'Authenticating with Client Secrets...');

      const authPayload = { 
        email: USER_EMAIL,
        name: USER_NAME,
        rollNo: USER_ROLL_NO,
        accessCode: ACCESS_CODE,
        clientID: CLIENT_ID, 
        clientSecret: CLIENT_SECRET 
      };
      
      const authRes = await axios.post(`${this.baseURL}/evaluation-service/auth`, authPayload);
      const { access_token } = authRes.data;

      if (!access_token) throw new Error('No access token returned');

      this.accessToken = access_token;
      this.logger.setAuthToken(access_token);
      
      await this.logger.log('backend', 'info', 'auth', 'Authentication completed.');
      return this.accessToken;

    } catch (error) {
      const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      await this.logger.log('backend', 'error', 'auth', `Authentication failed: ${errMsg}`);
      throw error;
    }
  }

  getAuthorizedHeaders() {
    if (!this.accessToken) throw new Error('Not authenticated');
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getDepots() {
    try {
      await this.logger.log('backend', 'debug', 'service', 'Fetching depots data...');
      const response = await axios.get(`${this.baseURL}/evaluation-service/depots`, {
        headers: this.getAuthorizedHeaders()
      });
      return response.data;
    } catch (error) {
      await this.logger.log('backend', 'error', 'service', `Depot fetch failed: ${error.message}`);
      throw error;
    }
  }

  async getVehicles() {
    try {
      await this.logger.log('backend', 'debug', 'service', 'Fetching vehicles data...');
      const response = await axios.get(`${this.baseURL}/evaluation-service/vehicles`, {
        headers: this.getAuthorizedHeaders()
      });
      return response.data;
    } catch (error) {
      await this.logger.log('backend', 'error', 'service', `Vehicle fetch failed: ${error.message}`);
      throw error;
    }
  }

  async getNotifications() {
    try {
      await this.logger.log('backend', 'debug', 'service', 'Fetching Stage 6 notifications data...');
      // Note: Endpoint from Stage 6 is exactly: http://20.207.122.201/evaluation-service/notifications
      const response = await axios.get(`${this.baseURL}/evaluation-service/notifications`, {
        headers: this.getAuthorizedHeaders()
      });
      return response.data;
    } catch (error) {
      await this.logger.log('backend', 'error', 'service', `Notifications fetch failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EvaluationService();
