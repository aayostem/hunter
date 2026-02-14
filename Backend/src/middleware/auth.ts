import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth-service";

const authService = new AuthService();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const user = await authService.validateToken(token);
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requirePlan = (requiredPlan: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const planHierarchy = {
      FREE: 0,
      PRO: 1,
      BUSINESS: 2,
      ENTERPRISE: 3,
    };

    const userPlanLevel =
      planHierarchy[user.plan as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel =
      planHierarchy[requiredPlan as keyof typeof planHierarchy] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        error: `Plan upgrade required. ${requiredPlan} plan or higher needed.`,
      });
    }

    next();
  };
};
