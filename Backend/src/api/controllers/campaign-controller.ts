import { Request, Response } from "express";
import type { CampaignStatus } from "@prisma/client";
import { CampaignService } from "../../services/campaign-service";

export class CampaignController {
  private svc: CampaignService;

  constructor() {
    this.svc = new CampaignService();
  }

  // --- Helpers ---

  private uid = (req: Request) => (req as any).user.id as string;
  private ok = (res: Response, data: any, status = 200) =>
    res.status(status).json(data);
  private fail = (res: Response, error: any, status = 400) =>
    res.status(status).json({ error: error?.message ?? "Unexpected error" });

  /** Resolves req.params.id or sends 400 and returns null */
  private pid(req: Request, res: Response): string | null {
    const id = req.params.id;
    if (!id) {
      this.fail(res, { message: "ID is required" });
      return null;
    }
    return id;
  }

  // --- Campaigns ---

  createCampaign = async (req: Request, res: Response) => {
    try {
      this.ok(res, await this.svc.createCampaign(this.uid(req), req.body), 201);
    } catch (e) {
      this.fail(res, e);
    }
  };

  getCampaigns = async (req: Request, res: Response) => {
    try {
      const { status, page = "1", limit = "20" } = req.query;
      this.ok(
        res,
        await this.svc.getUserCampaigns(this.uid(req), {
          status: status as CampaignStatus | undefined,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
        })
      );
    } catch (e) {
      this.fail(res, e);
    }
  };

  getCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.getCampaign(this.uid(req), id));
    } catch (e) {
      this.fail(res, e, 404);
    }
  };

  updateCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.updateCampaign(this.uid(req), id, req.body));
    } catch (e) {
      this.fail(res, e);
    }
  };

  deleteCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      await this.svc.deleteCampaign(this.uid(req), id);
      res.status(204).send();
    } catch (e) {
      this.fail(res, e);
    }
  };
scheduleCampaign = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = this.pid(req, res);
    // If id is null, we just return to stop; this returns undefined/void
    if (!id) return; 

    const { scheduleAt } = req.body;
    if (!scheduleAt) {
      // Returning this.fail returns the Response object
      return this.fail(res, { message: "Schedule date is required" });
    }

    const result = await this.svc.scheduleCampaign(id, new Date(scheduleAt));
    return this.ok(res, result); 
  } catch (e) {
    return this.fail(res, e);
  }
};
  sendCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.sendCampaign(id));
    } catch (e) {
      this.fail(res, e);
    }
  };

  pauseCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.pauseCampaign(this.uid(req), id));
    } catch (e) {
      this.fail(res, e);
    }
  };

  resumeCampaign = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.resumeCampaign(this.uid(req), id));
    } catch (e) {
      this.fail(res, e);
    }
  };

  getCampaignAnalytics = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.getCampaignAnalytics(id));
    } catch (e) {
      this.fail(res, e);
    }
  };

  getCampaignRecipients = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      const { page = "1", limit = "50" } = req.query;
      this.ok(
        res,
        await this.svc.getCampaignRecipients(
          this.uid(req),
          id,
          parseInt(page as string),
          parseInt(limit as string)
        )
      );
    } catch (e) {
      this.fail(res, e);
    }
  };

  // --- Templates ---

  createTemplate = async (req: Request, res: Response) => {
    try {
      this.ok(res, await this.svc.createTemplate(this.uid(req), req.body), 201);
    } catch (e) {
      this.fail(res, e);
    }
  };

  getTemplates = async (req: Request, res: Response) => {
    try {
      this.ok(res, await this.svc.getTemplates(this.uid(req)));
    } catch (e) {
      this.fail(res, e);
    }
  };

  updateTemplate = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      this.ok(res, await this.svc.updateTemplate(this.uid(req), id, req.body));
    } catch (e) {
      this.fail(res, e);
    }
  };

  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const id = this.pid(req, res);
      if (!id) return;
      await this.svc.deleteTemplate(this.uid(req), id);
      res.status(204).send();
    } catch (e) {
      this.fail(res, e);
    }
  };
}
