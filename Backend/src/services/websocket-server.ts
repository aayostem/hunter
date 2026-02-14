import { Server as WebSocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { Redis } from "ioredis";
import { config } from "../config";

export class NotificationServer {
  private io: WebSocketServer;
  private redis: Redis;
  private userConnections: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HttpServer) {
    this.io = new WebSocketServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.redis = new Redis(config.redis.url);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Authenticate and register user
      socket.on("authenticate", (userId: string) => {
        this.userConnections.set(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`User ${userId} authenticated with socket ${socket.id}`);
      });

      // Handle tracking events from services
      socket.on("tracking_event", (data) => {
        this.broadcastToUser(data.userId, "tracking_update", data);
      });

      socket.on("disconnect", () => {
        // Remove from user connections
        for (const [userId, socketId] of this.userConnections.entries()) {
          if (socketId === socket.id) {
            this.userConnections.delete(userId);
            break;
          }
        }
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Subscribe to Redis pub/sub for cross-service communication
    this.redis.subscribe("tracking_events", "notification_alerts");

    this.redis.on("message", (channel, message) => {
      try {
        const event = JSON.parse(message);

        switch (channel) {
          case "tracking_events":
            this.handleTrackingEvent(event);
            break;
          case "notification_alerts":
            this.handleNotificationAlert(event);
            break;
        }
      } catch (error) {
        console.error("Error processing Redis message:", error);
      }
    });
  }

  private handleTrackingEvent(event: any) {
    const { userId, type, data } = event;

    this.broadcastToUser(userId, "tracking_event", {
      type,
      data,
      timestamp: new Date(),
    });

    // Trigger desktop notifications for important events
    if (this.shouldTriggerNotification(type)) {
      this.triggerDesktopNotification(userId, type, data);
    }
  }

  private handleNotificationAlert(event: any) {
    const { userId, title, message, type = "info" } = event;

    this.broadcastToUser(userId, "notification", {
      title,
      message,
      type,
      timestamp: new Date(),
    });
  }

  private broadcastToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  private shouldTriggerNotification(type: string): boolean {
    const notificationEvents = [
      "email_opened",
      "link_clicked",
      "open_spike",
      "email_revival",
    ];
    return notificationEvents.includes(type);
  }

  private triggerDesktopNotification(userId: string, type: string, data: any) {
    const notificationConfig = this.getNotificationConfig(type, data);

    this.broadcastToUser(userId, "desktop_notification", {
      title: notificationConfig.title,
      message: notificationConfig.message,
      icon: notificationConfig.icon,
    });
  }

  private getNotificationConfig(type: string, data: any) {
    const configs: any = {
      email_opened: {
        title: "📧 Email Opened",
        message: `Your email to ${data.recipient} was opened`,
        icon: "email",
      },
      link_clicked: {
        title: "🔗 Link Clicked",
        message: `Link clicked in email to ${data.recipient}`,
        icon: "link",
      },
      open_spike: {
        title: "🚀 High Engagement",
        message: `Your email to ${data.recipient} was opened ${data.openCount} times`,
        icon: "trending_up",
      },
      email_revival: {
        title: "🔄 Email Revived",
        message: `An old email to ${data.recipient} was reopened after ${data.days} days`,
        icon: "refresh",
      },
    };

    return (
      configs[type] || {
        title: "Notification",
        message: "New activity",
        icon: "info",
      }
    );
  }

  // Method for other services to send notifications
  public sendNotification(
    userId: string,
    title: string,
    message: string,
    type = "info"
  ) {
    this.redis.publish(
      "notification_alerts",
      JSON.stringify({
        userId,
        title,
        message,
        type,
      })
    );
  }
}
