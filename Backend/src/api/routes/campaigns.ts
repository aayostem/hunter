import express from 'express';
import { CampaignController } from '../controllers/campaign-controller';
import { authenticate, requirePlan } from '../../middleware/auth';
import { campaignRateLimiter } from '../../middleware/rate-limit';

export const campaignRoutes = express.Router();  // This was missing!
const campaignController = new CampaignController();

// Apply authentication and rate limiting to all campaign routes
campaignRoutes.use(authenticate);
campaignRoutes.use(campaignRateLimiter);

// Campaign CRUD operations
campaignRoutes.post('/', requirePlan('PRO'), campaignController.createCampaign);
campaignRoutes.get('/', requirePlan('PRO'), campaignController.getCampaigns);
campaignRoutes.get('/:id', requirePlan('PRO'), campaignController.getCampaign);
campaignRoutes.put('/:id', requirePlan('PRO'), campaignController.updateCampaign);
campaignRoutes.delete('/:id', requirePlan('PRO'), campaignController.deleteCampaign);

// Campaign actions
campaignRoutes.post('/:id/schedule', requirePlan('PRO'), campaignController.scheduleCampaign);
campaignRoutes.post('/:id/send', requirePlan('PRO'), campaignController.sendCampaign);
campaignRoutes.post('/:id/pause', requirePlan('PRO'), campaignController.pauseCampaign);
campaignRoutes.post('/:id/resume', requirePlan('PRO'), campaignController.resumeCampaign);

// Campaign analytics
campaignRoutes.get('/:id/analytics', requirePlan('PRO'), campaignController.getCampaignAnalytics);
campaignRoutes.get('/:id/recipients', requirePlan('PRO'), campaignController.getCampaignRecipients);

// Campaign templates
campaignRoutes.post('/templates', requirePlan('PRO'), campaignController.createTemplate);
campaignRoutes.get('/templates', requirePlan('PRO'), campaignController.getTemplates);
campaignRoutes.put('/templates/:id', requirePlan('PRO'), campaignController.updateTemplate);
campaignRoutes.delete('/templates/:id', requirePlan('PRO'), campaignController.deleteTemplate);

// Export for use in index.ts
export default campaignRoutes;