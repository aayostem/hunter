import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Custom format for console in development
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Create transports array
const transports: winston.transport[] = [];

// Console transport for all environments
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    })
  );
}

// Add Logtail (Better Stack) in production
if (process.env.NODE_ENV === 'production' && process.env.LOGTAIL_SOURCE_TOKEN) {
  try {
    const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
    transports.push(new LogtailTransport(logtail));
  } catch (error) {
    console.error('Failed to initialize Logtail:', error);
  }
}

// File transport for errors in all environments
transports.push(
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  })
);

// File transport for all logs
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { 
    service: 'emailsuite-backend',
    environment: process.env.NODE_ENV 
  },
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports,
  exitOnError: false
});

// Create a child logger with request context
export const createRequestLogger = (req: any) => {
  return logger.child({
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

// Metrics logger
export const metricsLogger = logger.child({ type: 'metric' });

// Security logger for audit trails
export const securityLogger = logger.child({ type: 'security' });