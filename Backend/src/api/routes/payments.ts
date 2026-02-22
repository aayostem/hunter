import express from "express";
import { PaymentService } from "../../services/payment-service";
import { authenticate } from "../middleware/auth";

export const paymentRoutes = express.Router();
const paymentService = new PaymentService();

paymentRoutes.post(
  "/create-checkout-session",
  authenticate,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { plan, successUrl, cancelUrl } = req.body;

      const session = await paymentService.createCheckoutSession(
        user.id,
        plan,
        successUrl,
        cancelUrl
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

paymentRoutes.post("/create-portal-session", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { returnUrl } = req.body;

    const session = await paymentService.createCustomerPortalSession(
      user.id,
      returnUrl
    );
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

paymentRoutes.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const result = await paymentService.handleWebhook(req.body, signature);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

paymentRoutes.get("/subscription", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const status = await paymentService.getSubscriptionStatus(user.id);
    res.json(status);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
