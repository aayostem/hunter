import { Request, Response } from 'express';
import { TrackingService } from '../../services/tracking-service';

const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export class TrackingController {
  private svc: TrackingService;

  constructor() {
    this.svc = new TrackingService();
  }

  // --- Helpers ---

  private meta = (req: Request) => ({
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('User-Agent') ?? 'unknown',
    timestamp: new Date()
  });

  private tid(req: Request, res: Response): string | null {
    const id = req.params.trackingId;
    if (!id) { res.status(400).json({ error: 'Tracking ID is required' }); return null; }
    return id;
  }

  // --- Handlers ---

  serveTrackingPixel = async (req: Request, res: Response) => {
    try {
      const id = this.tid(req, res); if (!id) return;
      await this.svc.recordEmailOpen(id, this.meta(req));
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(TRACKING_PIXEL);
    } catch (e) {
      console.error('Error serving tracking pixel:', e);
      res.status(500).send();
    }
  };

  trackLinkClick = async (req: Request, res: Response) => {
    const fallback = typeof req.query.url === 'string' ? req.query.url : '/';
    try {
      const id = this.tid(req, res); if (!id) return;
      const { url } = req.query;
      if (!url || typeof url !== 'string') return void res.status(400).json({ error: 'URL parameter required' });
      await this.svc.recordLinkClick(id, url, this.meta(req));
      res.redirect(302, url);
    } catch (e) {
      console.error('Error tracking link click:', e);
      res.redirect(302, fallback);
    }
  };

  trackEmailOpen = async (req: Request, res: Response) => {
    try {
      const id = this.tid(req, res); if (!id) return;
      await this.svc.recordEmailOpen(id, this.meta(req));
      res.json({ success: true });
    } catch (e) {
      console.error('Error tracking email open:', e);
      res.status(500).json({ error: 'Tracking failed' });
    }
  };

  getTrackingAnalytics = async (req: Request, res: Response) => {
    try {
      const id = this.tid(req, res); if (!id) return;
      res.json(await this.svc.getAnalytics(id));
    } catch (e) {
      console.error('Error getting analytics:', e);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  };
}