import { prisma } from './prisma';
import { logger } from './logger';
import { Request } from 'express';

interface AuditLogData {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  /**
   * Log an audit event
   */
  async log(
    userId: string,
    action: string,
    data?: Partial<Omit<AuditLogData, 'userId' | 'action'>>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType: data?.entityType,
          entityId: data?.entityId,
          oldValues: data?.oldValues || undefined,
          newValues: data?.newValues || undefined,
          ipAddress: data?.ipAddress,
          userAgent: data?.userAgent,
          metadata: data?.metadata || undefined,
        }
      });

      // Also log to security logger
      securityLogger.info(`Audit: ${action}`, {
        userId,
        action,
        ...data
      });
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log from Express request
   */
  async logFromRequest(
    req: Request,
    userId: string,
    action: string,
    data?: Partial<Omit<AuditLogData, 'userId' | 'action' | 'ipAddress' | 'userAgent'>>
  ): Promise<void> {
    await this.log(userId, action, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      ...data
    });
  }

  /**
   * Log entity changes (before/after)
   */
  async logChanges(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const changes: Record<string, { from: any; to: any }> = {};
    
    Object.keys(newValues).forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = { from: oldValues[key], to: newValues[key] };
      }
    });

    if (Object.keys(changes).length === 0) return;

    await this.log(userId, 'UPDATE', {
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata: { changes, ...metadata }
    });
  }

  /**
   * Log bulk actions
   */
  async logBulk(
    userId: string,
    action: string,
    entityType: string,
    entityIds: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(userId, `BULK_${action}`, {
      entityType,
      metadata: { entityIds, count: entityIds.length, ...metadata }
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
      actions?: string[];
    }
  ) {
    const where: any = { userId };

    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    if (options?.actions?.length) {
      where.action = { in: options.actions };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs, total };
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Export audit logs
   */
  async exportLogs(
    options?: {
      fromDate?: Date;
      toDate?: Date;
      format?: 'json' | 'csv';
    }
  ): Promise<string | any[]> {
    const where: any = {};
    
    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (options?.format === 'csv') {
      // Convert to CSV format
      const headers = ['Timestamp', 'User', 'Action', 'Entity', 'IP Address', 'Details'];
      const rows = logs.map(log => [
        log.createdAt.toISOString(),
        log.user?.email || 'System',
        log.action,
        `${log.entityType}:${log.entityId || 'N/A'}`,
        log.ipAddress || 'N/A',
        JSON.stringify(log.metadata || {})
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return logs;
  }
}

export const auditLog = new AuditLogger();

// Security logger alias
export const securityLogger = logger.child({ type: 'security' });