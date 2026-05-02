const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/ScheduleController');

router.get('/schedule', scheduleController.generateSchedule);

module.exports = router;
