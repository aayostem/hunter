// src/utils/logging.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Using 'unknown' instead of 'any' to satisfy ESLint 
 * and ensure type safety for arbitrary data.
 */
type LogContext = Record<string, unknown>;

/**
 * Base logging function
 */
const log = (level: LogLevel, message: string, context?: LogContext): void => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(context || {}),
  };

  // Vite specific environment check
  // import.meta.env.DEV is true when running 'vite' (local dev)
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #6c757d',
      info: 'color: #0d6efd',
      warn: 'color: #ffc107',
      error: 'color: #dc3545',
    };

    console.log(`%c[${level.toUpperCase()}] ${message}`, styles[level], context || '');
  } else {
    // Production: Use appropriate console method
    const consoleMethod = (console[level] as (...args: unknown[]) => void) || console.log;
    consoleMethod(JSON.stringify(logEntry));
  }
};

/**
 * Log debug message
 */
export const logDebug = (message: string, context?: LogContext): void => {
  log('debug', message, context);
};

/**
 * Log info message
 */
export const logInfo = (message: string, context?: LogContext): void => {
  log('info', message, context);
};

/**
 * Log warning message
 */
export const logWarn = (message: string, context?: LogContext): void => {
  log('warn', message, context);
};

/**
 * Log error message
 */
export const logError = (message: string, error?: Error | LogContext): void => {
  if (error instanceof Error) {
    // Cast to LogContext to match the expected parameter type
    log('error', message, { 
      errorMessage: error.message || 'Unknown error', 
      stack: error.stack || '' 
    } as LogContext);
  } else {
    log('error', message, error || {});
  }
};