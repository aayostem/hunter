import express from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authenticate } from '../middleware/auth';

export const authRoutes = express.Router();
const auth = new AuthController();

// --- Public ---
authRoutes.post('/register',      auth.register);
authRoutes.post('/login',         auth.login);
authRoutes.post('/refresh',       auth.refresh);
authRoutes.post('/verify-email',  auth.verifyEmail);
authRoutes.post('/forgot-password', auth.forgotPassword);
authRoutes.post('/reset-password',  auth.resetPassword);

// --- MFA ---
authRoutes.post('/mfa/verify',    auth.verifyMFA);
authRoutes.post('/mfa/setup',     authenticate, auth.setupMFA);
authRoutes.post('/mfa/disable',   authenticate, auth.disableMFA);

// --- Authenticated ---
authRoutes.post('/logout',          authenticate, auth.logout);
authRoutes.post('/change-password', authenticate, auth.changePassword);
authRoutes.get('/me',               authenticate, auth.me);