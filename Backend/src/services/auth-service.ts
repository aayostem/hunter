import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { Redis } from "ioredis";

export class AuthService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
    this.redis = new Redis(config.redis.url);
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    plan?: string;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        plan: userData.plan || "FREE",
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async googleOAuth(profile: any) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          plan: "FREE",
          avatar: profile.picture,
          emailVerified: true,
        },
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.jwt.secret) as any;

      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(
        `refresh_token:${payload.userId}`
      );
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error("Invalid refresh token");
      }

      // Generate new tokens
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const tokens = this.generateTokens(user.id, user.email);

      // Update refresh token in Redis
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async logout(userId: string, refreshToken: string) {
    // Remove refresh token from Redis
    await this.redis.del(`refresh_token:${userId}`);

    // Add token to blacklist
    await this.redis.setex(
      `blacklist:${refreshToken}`,
      7 * 24 * 60 * 60,
      "true"
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all existing tokens
    await this.redis.del(`refresh_token:${userId}`);
  }

  async upgradePlan(userId: string, newPlan: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { plan: newPlan },
    });

    return this.sanitizeUser(user);
  }

  private generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign({ userId, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ userId, email }, config.jwt.secret, {
      expiresIn: "30d",
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    // Store with 30 days expiration
    await this.redis.setex(
      `refresh_token:${userId}`,
      30 * 24 * 60 * 60,
      refreshToken
    );
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async validateToken(token: string) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error("Token is invalid");
      }

      const payload = jwt.verify(token, config.jwt.secret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}
