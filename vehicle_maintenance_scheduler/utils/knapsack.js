function optimizeTasksForDepot(depot, allTasks) {
  const capacity = Math.floor(depot.mechanicHours) || 0;
  const n = allTasks.length;

  const dp = new Array(capacity + 1).fill(0);
  const keep = Array.from({ length: n }, () => new Array(capacity + 1).fill(false));

  for (let i = 0; i < n; i++) {
    const task = allTasks[i];
    const w = Math.round(task.duration);
    const v = task.impact;

    for (let currentCap = capacity; currentCap >= w; currentCap--) {
      if (dp[currentCap - w] + v > dp[currentCap]) {
        dp[currentCap] = dp[currentCap - w] + v;
        keep[i][currentCap] = true; 
      }
    }
  }

  const selectedTasks = [];
  let remainingCap = capacity;
  let totalCalculatedDuration = 0;

  for (let i = n - 1; i >= 0; i--) {
    if (keep[i][remainingCap]) {
      selectedTasks.push(allTasks[i].taskId);
      remainingCap -= Math.round(allTasks[i].duration);
      totalCalculatedDuration += allTasks[i].duration;
    }
  }

  return {
    depotId: depot.id,
    selectedTasks: selectedTasks.reverse(),
    totalImpact: dp[capacity],
    totalDuration: totalCalculatedDuration
  };
}

module.exports = { optimizeTasksForDepot };
