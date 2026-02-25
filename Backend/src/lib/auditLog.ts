import { prisma } from './prisma';
import { logger } from './logger';
import { Prisma } from '@prisma/client';


export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFIED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'SUSPICIOUS_LOGIN'
  | 'PROFILE_UPDATED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED';

export interface AuditContext {
  ip?: string;
  userAgent?: string;
  attempt?: number;
  [key: string]: any;
}

class AuditLogger {
  /**
   * Log an audit event to the database.
   * Fails silently — audit logging should never crash the main flow.
   */
  async log(userId: string, action: AuditAction | string, ctx?: AuditContext): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          ipAddress: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
        //   metadata: ctx ? JSON.stringify(ctx) : null,
            metadata: ctx ? (ctx as Prisma.InputJsonValue) : Prisma.JsonNull,
          createdAt: new Date()
        }
      });
    } catch (error) {
      // Never throw — log to console so it's visible without crashing the caller
      logger.error('AuditLog write failed', { userId, action, error });
    }
  }

  /**
   * Retrieve recent audit events for a user.
   */
  async getRecent(userId: string, limit = 20) {
    try {
      return await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('AuditLog read failed', { userId, error });
      return [];
    }
  }

  /**
   * Retrieve audit events filtered by action within a time window.
   */
  async getByAction(userId: string, action: AuditAction | string, sinceMs = 1800000, limit = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: {
          userId,
          action,
          createdAt: { gt: new Date(Date.now() - sinceMs) }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('AuditLog query failed', { userId, action, error });
      return [];
    }
  }
}

export const auditLog = new AuditLogger();