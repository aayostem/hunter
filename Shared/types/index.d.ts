export interface EmailTrackingEvent {
    trackingId: string;
    type: "open" | "click";
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceType?: string;
}
export interface TrackedEmail {
    id: string;
    trackingId: string;
    userId: string;
    recipient: string;
    subject?: string;
    messageId?: string;
    createdAt: Date;
    opens: EmailOpen[];
    clicks: LinkClick[];
}
export interface EmailOpen {
    id: string;
    trackedEmailId: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export interface LinkClick {
    id: string;
    trackedEmailId: string;
    url: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export interface User {
    id: string;
    email: string;
    name?: string;
    plan: Plan;
    createdAt: Date;
}
export declare enum Plan {
    FREE = "FREE",
    PRO = "PRO",
    BUSINESS = "BUSINESS",
    ENTERPRISE = "ENTERPRISE"
}
//# sourceMappingURL=index.d.ts.map