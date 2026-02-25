import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

export { Sentry };

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) return logger.warn('⚠️ SENTRY_DSN missing: Sentry disabled.');

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.RELEASE_VERSION,
      integrations: [
        Sentry.httpIntegration({ tracing: true, breadcrumbs: true }),
        Sentry.httpIntegration({ tracing: true, breadcrumbs: true }),
        // Note: Sentry v8 often bundles Postgres/Prisma. If they show as undefined, 
        // ensure you have @sentry/integrations or @sentry/prisma installed.
    
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      attachStacktrace: true,
      
      // Filter common noise
      ignoreErrors: ['Unauthorized', 'Forbidden', 'Not Found', 'Rate limit exceeded', 'Token expired'],
      denyUrls: [/health/, /metrics/, /favicon/],

      beforeSend(event, hint) {
        const error = hint.originalException;
        if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Not Found'))) return null;

        // Sanitize headers and PII
        if (event.request?.headers) {
          ['authorization', 'cookie', 'x-api-key'].forEach(h => delete event.request!.headers![h]);
        }
        if (event.user) event.user = { id: event.user.id }; // Keep only ID
        return event;
      },
      spotlight: process.env.NODE_ENV === 'development',
    });

    logger.info('✅ Sentry initialized');
    return Sentry;
  } catch (e) {
    logger.error('❌ Sentry init failed:', e);
    return null;
  }
};

/**
 * Capture exceptions with a clean, functional approach
 */
export const captureException = (err: any, ctx?: Record<string, any>, level: Sentry.SeverityLevel = 'error') => {
  if (process.env.NODE_ENV === 'test') return;
  
  const eventId = Sentry.captureException(err, {
    extra: ctx,
    level,
    tags: { component: ctx?.component || 'api', userId: ctx?.userId, ...ctx?.tags }
  });

  if (process.env.NODE_ENV !== 'production') logger.error(`[Sentry:${eventId}]`, { err, ctx });
  return eventId;
};

// --- Context Helpers ---

export const setUser = (id: string, email?: string) => 
  Sentry.setUser({ id, email: email?.replace(/(?<=.{2}).(?=.*@)/g, '*') });

export const clearUser = () => Sentry.setUser(null);

export const addBreadcrumb = (message: string, category?: string, data?: any) => 
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });

export const setExtra = (key: string, value: any) => Sentry.setExtra(key, value);

export const setTags = (tags: Record<string, string>) => Sentry.setTags(tags);