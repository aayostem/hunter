import { Request, Response } from "express";
import { TrackingService } from "../../services/tracking-service";

export class TrackingController {
  private trackingService: TrackingService;

  constructor() {
    this.trackingService = new TrackingService();
  }

  serveTrackingPixel = async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;

      // Track the email open
      await this.trackingService.recordEmailOpen(trackingId, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });

      // Serve 1x1 transparent PNG
      const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
      );

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(pixel);
    } catch (error) {
      console.error("Error serving tracking pixel:", error);
      res.status(500).send();
    }
  };

  trackLinkClick = async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      const { url } = req.query;

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL parameter required" });
      }

      // Record the click
      await this.trackingService.recordLinkClick(trackingId, url, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });

      // Redirect to original URL
      res.redirect(302, url);
    } catch (error) {
      console.error("Error tracking link click:", error);
      res.redirect(
        302,
        typeof req.query.url === "string" ? req.query.url : "/"
      );
    }
  };

  trackEmailOpen = async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      await this.trackingService.recordEmailOpen(trackingId, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking email open:", error);
      res.status(500).json({ error: "Tracking failed" });
    }
  };

  getTrackingAnalytics = async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      const analytics = await this.trackingService.getAnalytics(trackingId);
      res.json(analytics);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  };
}
