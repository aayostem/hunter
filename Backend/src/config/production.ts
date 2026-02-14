export const productionConfig = {
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    },
  },
  redis: {
    url: process.env.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    autoResubscribe: true,
    lazyConnect: true,
  },
  server: {
    port: parseInt(process.env.PORT || "3001"),
    trustProxy: true, // Trust proxy headers for rate limiting
    bodyParser: {
      limit: "10mb",
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || [
        "https://app.emailsuite.com",
      ],
      credentials: true,
    },
  },
  security: {
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
    bcrypt: {
      rounds: 12,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    },
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: {
      default: "Email Suite <noreply@emailsuite.com>",
      support: "Support <support@emailsuite.com>",
    },
  },
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "production",
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"
      ),
    },
    prometheus: {
      enabled: process.env.PROMETHEUS_METRICS_ENABLED === "true",
      path: "/metrics",
    },
  },
  features: {
    ai: {
      enabled: process.env.AI_FEATURES_ENABLED === "true",
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      },
    },
    campaigns: {
      maxRecipients: {
        FREE: 100,
        PRO: 10000,
        BUSINESS: 50000,
        ENTERPRISE: 100000,
      },
      dailyLimit: {
        FREE: 50,
        PRO: 1000,
        BUSINESS: 10000,
        ENTERPRISE: 50000,
      },
    },
  },
};
