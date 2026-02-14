import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config";

export class PaymentService {
  private stripe: Stripe;
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16" as any,
    });
    this.prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
    this.redis = new Redis(config.redis.url);
  }

  async createCheckoutSession(
    userId: string,
    plan: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const priceId = this.getPriceIdForPlan(plan);

    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        trial_period_days: plan === "PRO" ? 14 : 0,
      },
    });

    // Store session in Redis for webhook verification
    await this.redis.setex(
      `checkout_session:${session.id}`,
      3600, // 1 hour
      JSON.stringify({ userId, plan })
    );

    return session;
  }

  async createCustomerPortalSession(userId: string, returnUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user || !user.subscriptions[0]?.stripeCustomerId) {
      throw new Error("No subscription found");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.subscriptions[0].stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  async handleWebhook(payload: any, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ) {
    const { userId, plan } = session.metadata!;

    // Get subscription details
    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Update user plan
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan },
    });

    // Create subscription record
    await this.prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Clear session from Redis
    await this.redis.del(`checkout_session:${session.id}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      include: { user: true },
    });

    // If subscription canceled, downgrade to FREE
    if (
      subscription.status === "canceled" ||
      subscription.cancel_at_period_end
    ) {
      await this.prisma.user.update({
        where: { id: sub.userId },
        data: { plan: "FREE" },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: true,
      },
    });

    // Downgrade user to FREE
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (sub) {
      await this.prisma.user.update({
        where: { id: sub.userId },
        data: { plan: "FREE" },
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (subscription) {
      // Send payment failure notification
      await this.redis.publish(
        "payment_events",
        JSON.stringify({
          userId: subscription.userId,
          type: "payment_failed",
          data: {
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
            attemptCount: invoice.attempt_count,
          },
        })
      );
    }
  }

  private getPriceIdForPlan(plan: string): string {
    const priceIds: { [key: string]: string } = {
      PRO: process.env.STRIPE_PRO_PRICE_ID!,
      BUSINESS: process.env.STRIPE_BUSINESS_PRICE_ID!,
      ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    };

    return priceIds[plan];
  }

  async getSubscriptionStatus(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return { active: false, plan: "FREE" };
    }

    return {
      active: ["active", "trialing"].includes(subscription.status),
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }
}
