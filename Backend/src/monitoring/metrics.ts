import client from "prom-client";

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const emailTrackingMetrics = {
  emailsTracked: new client.Counter({
    name: "emails_tracked_total",
    help: "Total number of emails tracked",
    labelNames: ["user_plan"] as const,
  }),
  emailOpens: new client.Counter({
    name: "email_opens_total",
    help: "Total number of email opens",
    labelNames: ["user_plan", "device_type"] as const,
  }),
  linkClicks: new client.Counter({
    name: "link_clicks_total",
    help: "Total number of link clicks",
    labelNames: ["user_plan"] as const,
  }),
  campaignEmails: new client.Counter({
    name: "campaign_emails_sent_total",
    help: "Total number of campaign emails sent",
    labelNames: ["campaign_id", "status"] as const,
  }),
  apiRequests: new client.Counter({
    name: "api_requests_total",
    help: "Total number of API requests",
    labelNames: ["method", "route", "status_code"] as const,
  }),
  responseTime: new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
};

// Register custom metrics
Object.values(emailTrackingMetrics).forEach((metric) => {
  register.registerMetric(metric);
});

export { register };
