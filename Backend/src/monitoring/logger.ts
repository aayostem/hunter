import winston from "winston";
import fs from "fs";

const logDir = process.env.NODE_ENV === "production" ? "/tmp/logs" : "logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  new winston.transports.File({
    filename: `${logDir}/error.log`,
    level: "error",
    maxsize: 5242880,
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: `${logDir}/combined.log`,
    maxsize: 5242880,
    maxFiles: 5,
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "email-suite-api" },
  transports,
});