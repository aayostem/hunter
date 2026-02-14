import express from "express";
import { AuthService } from "../../services/auth-service";
import { authenticate } from "../../middleware/auth";

export const authRoutes = express.Router();
const authService = new AuthService();

authRoutes.post("/register", async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

authRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

authRoutes.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

authRoutes.post("/logout", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { refreshToken } = req.body;
    await authService.logout(user.id, refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

authRoutes.post("/change-password", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(user.id, currentPassword, newPassword);
    res.json({ message: "Password changed successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
