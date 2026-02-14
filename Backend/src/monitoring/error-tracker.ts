import * as Sentry from "@sentry/node";
import { RewriteFrames } from "@sentry/integrations";
import { logger } from "./logger";

export class ErrorTracker {
  static initialize() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "development",
        integrations: [
          new RewriteFrames({
            root: process.cwd(),
          }),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Prisma(),
        ],
        tracesSampleRate: parseFloat(
          process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"
        ),
      });
    }
  }

  static captureError(error: Error, context: any = {}) {
    logger.error("Error captured", {
      error: error.message,
      stack: error.stack,
      ...context,
    });

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(error);
      });
    }
  }

  static captureMessage(
    message: string,
    level: Sentry.SeverityLevel = "info",
    context: any = {}
  ) {
    logger.info("Message captured", { message, ...context });

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        scope.setLevel(level);
        Sentry.captureMessage(message);
      });
    }
  }

  static async flush(timeout = 2000) {
    if (process.env.SENTRY_DSN) {
      await Sentry.flush(timeout);
    }
  }
}

// Initialize on import
ErrorTracker.initialize();
