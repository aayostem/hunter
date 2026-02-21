import express from 'express';
import { CampaignController } from '../controllers/campaign-controller';
import { authenticate, requirePlan } from '../middleware/auth'
import { campaignRateLimiter } from '../middleware/ratelimiter';

export const campaignRoutes = express.Router();
const cc = new CampaignController();
const pro = requirePlan(['PRO']);

// Global middleware
campaignRoutes.use(authenticate);
campaignRoutes.use(campaignRateLimiter);

// Templates MUST come before /:id to avoid route shadowing
campaignRoutes.post('/templates',      pro, cc.createTemplate);
campaignRoutes.get('/templates',       pro, cc.getTemplates);
campaignRoutes.put('/templates/:id',   pro, cc.updateTemplate);
campaignRoutes.delete('/templates/:id',pro, cc.deleteTemplate);

// Campaign CRUD
campaignRoutes.post('/',               pro, cc.createCampaign);
campaignRoutes.get('/',                pro, cc.getCampaigns);
campaignRoutes.get('/:id',             pro, cc.getCampaign);
campaignRoutes.put('/:id',             pro, cc.updateCampaign);
campaignRoutes.delete('/:id',          pro, cc.deleteCampaign);

// Campaign actions
campaignRoutes.post('/:id/schedule',   pro, cc.scheduleCampaign);
campaignRoutes.post('/:id/send',       pro, cc.sendCampaign);
campaignRoutes.post('/:id/pause',      pro, cc.pauseCampaign);
campaignRoutes.post('/:id/resume',     pro, cc.resumeCampaign);

// Analytics
campaignRoutes.get('/:id/analytics',   pro, cc.getCampaignAnalytics);
campaignRoutes.get('/:id/recipients',  pro, cc.getCampaignRecipients);

export default campaignRoutes;