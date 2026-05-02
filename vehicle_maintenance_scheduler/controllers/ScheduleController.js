const evaluationService = require('../services/EvaluationService');
const { optimizeTasksForDepot } = require('../utils/knapsack');

exports.generateSchedule = async (req, res) => {
  try {
    const logger = evaluationService.logger;
    await logger.log('backend', 'info', 'controller', 'Received request to generate schedule');

    let depotsData, vehiclesData;
    try {
      [depotsData, vehiclesData] = await Promise.all([
        evaluationService.getDepots(),
        evaluationService.getVehicles()
      ]);
    } catch (error) {
      return res.status(502).json({ error: 'Failed to retrieve external data' });
    }

    const rawDepots = Array.isArray(depotsData) ? depotsData : (depotsData.depots || depotsData.data || []);
    const rawVehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.vehicles || vehiclesData.data || []);

    if (!rawDepots.length) {
      await logger.log('backend', 'warn', 'controller', 'Depots data is empty');
      return res.status(400).json({ error: 'No depot data available' });
    }

    const normalizedDepots = rawDepots.map(d => ({
      id: d.ID || d.id,
      mechanicHours: d.MechanicHours || d.mechanicHours
    }));

    let allTasks = [];
    rawVehicles.forEach(vehicle => {
      if (vehicle.tasks && Array.isArray(vehicle.tasks)) {
         allTasks = allTasks.concat(vehicle.tasks.map(t => ({
           taskId: t.TaskID || t.taskId,
           duration: t.Duration || t.duration,
           impact: t.Impact || t.impact
         })));
      } else if (vehicle.TaskID || vehicle.taskId) {
         allTasks.push({
           taskId: vehicle.TaskID || vehicle.taskId,
           duration: vehicle.Duration || vehicle.duration,
           impact: vehicle.Impact || vehicle.impact
         });
      }
    });

    if (!allTasks.length) {
      await logger.log('backend', 'warn', 'controller', 'No tasks found in vehicles payload');
      return res.status(200).json({ results: [] });
    }

    await logger.log('backend', 'info', 'controller', `Processing ${normalizedDepots.length} depots with ${allTasks.length} tasks`);
    const results = normalizedDepots.map(depot => optimizeTasksForDepot(depot, allTasks));

    await logger.log('backend', 'info', 'controller', 'Successfully calculated schedule');
    res.status(200).json({ results });

  } catch (error) {
    console.error('Controller Error:', error);
    if (evaluationService.logger) {
      await evaluationService.logger.log('backend', 'error', 'controller', `Fatal error: ${error.message}`);
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
