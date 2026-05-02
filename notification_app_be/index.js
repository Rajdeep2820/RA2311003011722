const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const evaluationService = require('../vehicle_maintenance_scheduler/services/EvaluationService');

// Define priority weights (higher number = mathematically more important)
const PRIORITY_WEIGHTS = {
  'Placement': 3,
  'Result': 2,
  'Event': 1
};

async function executePriorityInboxLogic() {
  try {
    console.log('🚀 Booting up Stage 6 Priority Inbox System...');
    
    // Step 1: Execute the multi-stage handshake to the Evaluation Service using our secure class
    console.log('🔑 Authenticating seamlessly with Evaluation Service...');
    await evaluationService.authenticate();
    
    // Step 2: Fetch the protected payload utilizing the bearer token
    console.log('📡 Fetching secure notification payload...');
    const data = await evaluationService.getNotifications();
    const notifications = data.notifications || [];

    if (!notifications.length) {
      console.log('⚠️ No notifications found to process.');
      return;
    }

    console.log(`📦 Unpacked ${notifications.length} raw notifications.`);

    // Step 3: Implement algorithm to mathematically sort by Weight (Primary) and Recency (Secondary)
    console.log('⚖️ Sorting Inbox algorithmically (Placement > Result > Event + Recency)...');
    
    const sortedNotifications = notifications.sort((a, b) => {
      // Extract numeric weight using map, defaulting to 0 for unknown types
      const weightA = PRIORITY_WEIGHTS[a.Type] || 0;
      const weightB = PRIORITY_WEIGHTS[b.Type] || 0;

      // Primary Sort: By Mathematical Weight (Descending)
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // Secondary Sort (Tie-Breaker): By Chronological Recency (Descending)
      // Convert standard ISO Timestamps to Unix Epoch MS for perfect delta math
      const timeA = new Date(a.Timestamp).getTime();
      const timeB = new Date(b.Timestamp).getTime();
      return timeB - timeA;
    });

    // Step 4: Isolate top 'N' constraints dynamically (in this case, TOP 10)
    const N = 10;
    const topNInbox = sortedNotifications.slice(0, N);

    console.log(`\n================= TOP ${N} PRIORITY INBOX =================\n`);
    
    topNInbox.forEach((note, index) => {
        console.log(`[${index + 1}] ⭐ Type: ${note.Type}`);
        console.log(`    Date: ${note.Timestamp}`);
        console.log(`    Msg:  "${note.Message}"`);
        console.log(`    ID:   ${note.ID}\n`);
    });

    console.log(`[Algorithm Complete] Filtered ${notifications.length} rows to Top ${N} using B-Tree sort concepts.`);
    console.log('\nTake your screenshot of this CLI output for your Stage 6 Repository Submit!');

  } catch (error) {
    console.error('Fatal Inbox Error:', error.message);
  }
}

executePriorityInboxLogic();
