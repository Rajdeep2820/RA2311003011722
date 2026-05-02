# Notification System Design

We need a flexible, reliable way to send notifications (SMS, Email, Push) without slowing down the core application. Here is a clean, event-driven approach.

## 1. Components
- **API Gateway**: Receives the initial notification request from the client and immediately returns a success response.
- **Message Queue (Redis or RabbitMQ)**: Holds the pending notifications. This acts as a buffer so if our email provider goes down, we don't drop messages.
- **Workers**: Small background Node.js processes that pull jobs from the queue and actually talk to third-party APIs (like SendGrid or Twilio).
- **Database**: A basic Postgres data store to track user preferences (e.g., `opt_out = true`) and to log delivery failures.

## 2. Basic Flow
1. The app drops a lightweight event into the queue (e.g. `{ type: "email", userId: 123, body: "Hello" }`).
2. The API instantly replies `202 Accepted` to keep things fast for the user.
3. The queue safely holds the event.
4. A background Worker picks it up, checks the DB to ensure the user didn't opt out, and fires the email via the SendGrid API.
5. If SendGrid errors out, the Worker shoves the job back into the queue to retry in a few minutes.

## 3. Why this works
- **It's fast**: The main server never waits for emails to actually send.
- **It scales**: If we suddenly get 10,000 signups, the queue just grows. We can spin up more workers to burn through the queue safely.
- **It's safe**: If a third-party API crashes, no data is lost. The queue simply holds the jobs until the API comes back online.
