# Notification System Design

## Task 1: Core System Architecture

We need a flexible, reliable way to send notifications (SMS, Email, Push) without slowing down the core application. Here is a clean, event-driven approach.

### 1. Components
- **API Gateway**: Receives the initial notification request from the client and immediately returns a success response.
- **Message Queue (Redis or RabbitMQ)**: Holds the pending notifications. This acts as a buffer so if our email provider goes down, we don't drop messages.
- **Workers**: Small background Node.js processes that pull jobs from the queue and actually talk to third-party APIs (like SendGrid or Twilio).
- **Database**: A basic Postgres data store to track user preferences (e.g., `opt_out = true`) and to log delivery failures.

### 2. Basic Flow
1. The app drops a lightweight event into the queue (e.g. `{ type: "email", userId: 123, body: "Hello" }`).
2. The API instantly replies `202 Accepted` to keep things fast for the user.
3. The queue safely holds the event.
4. A background Worker picks it up, checks the DB to ensure the user didn't opt out, and fires the email via the SendGrid API.
5. If SendGrid errors out, the Worker shoves the job back into the queue to retry in a few minutes.

### 3. Why this works
- **It's fast**: The main server never waits for emails to actually send.
- **It scales**: If we suddenly get 10,000 signups, the queue just grows. We can spin up more workers to burn through the queue safely.
- **It's safe**: If a third-party API crashes, no data is lost. The queue simply holds the jobs until the API comes back online.

---

## Task 2: Incremental Database & API Scaling

### Stage 1
Assume a front-end developer colleague has asked you for REST API design to display notifications when users are logged in.

**1. Fetch User Notifications**
**Endpoint:** `GET /api/v1/notifications`
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Accept": "application/json"
}
```
**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86",
      "type": "Result",
      "message": "mid-sem marks published",
      "timestamp": "2026-04-22T17:51:30Z",
      "isRead": false
    }
  ],
  "meta": { "unreadCount": 1, "page": 1 }
}
```

**2. Mark Notification as Read**
**Endpoint:** `PATCH /api/v1/notifications/:id/read`
**Request:** `{ "isRead": true }`
**Response (200 OK):** `{ "success": true }`

### Stage 2
**Recommended Database:** Relational Database (PostgreSQL).

**Why?**
Notifications have a highly structured schema (`userID`, `type`, `message`, `timestamp`). PostgreSQL is ACID compliant, scales well for high-read scenarios, and allows for powerful Composite Indexing as data approaches millions of rows.

**Database Schema (SQL):**
```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id INT NOT NULL,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Stage 3

**The Problematic Query:**
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;
```
**Why is this slow?**
Without an index, the engine executes a sequential Table Scan. It iterates through all 5,000,000 rows resulting in massive Disk I/O bottlenecks. **Computation Cost:** `O(N)`.

**"Adding indexes on every column to be safe" - Is this advice effective?**
**No.** For every index created, the database must write to a B-Tree structure on disk when a new notification is inserted. Indexing every column causes massive Write-Amplification (crippling insert speed) and explodes storage costs. Only index query-heavy columns.

**Optimized Index Solution:**
```sql
CREATE INDEX idx_student_unread ON notifications(student_id, is_read, created_at DESC);
```

**Query (Placement in last 7 days):**
```sql
SELECT * FROM notifications 
WHERE type = 'Placement' 
AND created_at >= NOW() - INTERVAL '7 days';
```

### Stage 4
If the database is being overwhelmed on every page load to fetch notifications, we must remove the database from the direct read path.

**Solution: Redis Caching**
1. The payload is cached in Redis with a TTL.
2. The frontend asks the backend for notifications; the backend intercepts this and returns the data from Redis instantly (milliseconds), bypassing Postgres.

**Tradeoffs:**
- **Pros:** Sub-millisecond latency. Drops DB CPU utilization.
- **Cons:** "Eventual consistency" complexity. A user might refresh and see a ghost notification before the cache invalidates safely.

### Stage 5

**Shortcomings of the Provided Pseudocode:**
1. **Synchronous Loop Blocking:** Finding 50,000 students and calling an external Email API inside a `for` loop blocks the main Node thread. 
2. **Partial Failures:** If the loop crashes at user 200, users 201 to 50,000 will *never* receive their emails.
3. **Tight Coupling:** The DB and Email mechanisms are chained. If the DB goes down, the email doesn't send. 

**Redesign: Message Queuing (Producer/Consumer)**
We decouple the process. The Producer drops 50,000 items in a Queue instantly. Async background workers process them, log to DB, and send the email reliably.

**Revised Pseudocode:**
```python
function trigger_notify_all(student_ids, message):
  for student_id in student_ids:
    push_to_message_queue({ id: student_id, msg: message })
  return HTTP_200("Notifications Queued")

function process_queue_job(job):
    try:
        save_to_db(job.id, job.msg)
        send_email(job.id, job.msg)
        push_to_app(job.id, job.msg) 
        job.mark_completed()
    except ThirdPartyEmailApiFailure:
        # Fails safely and retry later without crashing
        job.mark_retry_later()
```

### Stage 6
Please refer to the `node notification_app_be/index.js` script to validate the Priority Inbox array sorting algorithm.
