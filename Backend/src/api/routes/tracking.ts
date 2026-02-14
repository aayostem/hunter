import express from "express";
import { TrackingController } from "../controllers/tracking-controller";

export const trackingRoutes = express.Router();
const trackingController = new TrackingController();

// Tracking pixel endpoint
trackingRoutes.get("/pixel/:trackingId", trackingController.serveTrackingPixel);

// Link click tracking endpoint
trackingRoutes.get("/click/:trackingId", trackingController.trackLinkClick);

// Email open tracking endpoint
trackingRoutes.post("/open/:trackingId", trackingController.trackEmailOpen);

// Get tracking analytics
trackingRoutes.get(
  "/analytics/:trackingId",
  trackingController.getTrackingAnalytics
);
