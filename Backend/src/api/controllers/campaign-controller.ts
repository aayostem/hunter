import { Request, Response } from 'express';
import { CampaignService } from '../../services/campaign-service';

export class CampaignController {
  private campaignService: CampaignService;

  constructor() {
    this.campaignService = new CampaignService();
  }

  createCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const campaignData = req.body;
      
      const campaign = await this.campaignService.createCampaign(userId, campaignData);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getCampaigns = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { status, page = '1', limit = '20' } = req.query;
      
      const campaigns = await this.campaignService.getUserCampaigns(userId, {
        status: status as any, // Fix: Cast to CampaignStatus
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      
      res.json(campaigns);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const campaign = await this.campaignService.getCampaign(userId, id);
      res.json(campaign);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  updateCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const updates = req.body;
      
      const campaign = await this.campaignService.updateCampaign(userId, id, updates);
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      await this.campaignService.deleteCampaign(userId, id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  scheduleCampaign = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { scheduleAt } = req.body;
      
      if (!scheduleAt) {
        return res.status(400).json({ error: 'Schedule date is required' });
      }
      
      const campaign = await this.campaignService.scheduleCampaign(
        id, 
        new Date(scheduleAt)
      );
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  sendCampaign = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await this.campaignService.sendCampaign(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  pauseCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const campaign = await this.campaignService.pauseCampaign(userId, id);
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  resumeCampaign = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const campaign = await this.campaignService.resumeCampaign(userId, id);
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getCampaignAnalytics = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const analytics = await this.campaignService.getCampaignAnalytics(id);
      res.json(analytics);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getCampaignRecipients = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { page = '1', limit = '50' } = req.query;
      
      const recipients = await this.campaignService.getCampaignRecipients(
        userId, 
        id,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(recipients);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  createTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const templateData = req.body;
      
      const template = await this.campaignService.createTemplate(userId, templateData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getTemplates = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const templates = await this.campaignService.getTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const updates = req.body;
      
      const template = await this.campaignService.updateTemplate(userId, id, updates);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      await this.campaignService.deleteTemplate(userId, id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}