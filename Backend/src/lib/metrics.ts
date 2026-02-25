import { logger } from './logger';
import { redis } from './redis';

interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private buffer: MetricPoint[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.flushInterval = setInterval(() => this.flush(), 10000); // Flush every 10 seconds
  }

  increment(name: string, tags?: Record<string, string>): void {
    this.buffer.push({
      name,
      value: 1,
      tags,
      timestamp: Date.now()
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push({
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.buffer.push({
      name: `${name}_ms`,
      value: duration,
      tags,
      timestamp: Date.now()
    });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const points = [...this.buffer];
    this.buffer = [];

    try {
      // Store in Redis for real-time dashboards
      const pipeline = redis.pipeline();
      
      for (const point of points) {
        const key = `metric:${point.name}:${new Date().toISOString().split('T')[0]}`;
        pipeline.hincrby(key, point.value.toString(), 1);
        pipeline.expire(key, 7 * 24 * 60 * 60); // Keep for 7 days
      }

      await pipeline.exec();

      // Log to logger (for Better Stack)
      points.forEach(point => {
        logger.info('metric', {
          metric: point.name,
          value: point.value,
          tags: point.tags,
          timestamp: new Date(point.timestamp).toISOString()
        });
      });
    } catch (error) {
      logger.error('Failed to flush metrics:', error);
    }
  }

  async getMetrics(name: string, date: string): Promise<Record<string, number>> {
    const key = `metric:${name}:${date}`;
    const data = await redis.hgetall(key);
    
    return Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = parseInt(value);
      return acc;
    }, {} as Record<string, number>);
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush(); // Final flush
  }
}

export const metrics = new MetricsCollector();