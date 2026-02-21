// import express from "express";
// import { AIInsightsService } from "../../services/ai-insights-service";
// import { authenticate, requirePlan } from "../middleware/auth";

// export const aiRoutes = express.Router();
// const aiService = new AIInsightsService();

// aiRoutes.get(
//   "/insights",
//   authenticate,
//   requirePlan("PRO"),
//   async (req, res) => {
//     try {
//       const user = (req as any).user;
//       const { timeRange = "30d" } = req.query;

//       const insights = await aiService.generateEmailInsights(
//         user.id,
//         timeRange as string
//       );
//       res.json(insights);
//     } catch (error: any) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );

// aiRoutes.post(
//   "/subject-suggestions",
//   authenticate,
//   requirePlan("PRO"),
//   async (req, res) => {
//     try {
//       const { originalSubject, context } = req.body;
//       const suggestions = await aiService.generateSubjectLineSuggestions(
//         originalSubject,
//         context
//       );
//       res.json({ suggestions });
//     } catch (error: any) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );

// aiRoutes.post(
//   "/send-time-prediction",
//   authenticate,
//   requirePlan("BUSINESS"),
//   async (req, res) => {
//     try {
//       const user = (req as any).user;
//       const { recipientEmails } = req.body;

//       const prediction = await aiService.predictOptimalSendTime(
//         user.id,
//         recipientEmails
//       );
//       res.json(prediction);
//     } catch (error: any) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );

// aiRoutes.post(
//   "/response-suggestions",
//   authenticate,
//   requirePlan("PRO"),
//   async (req, res) => {
//     try {
//       const { emailContent, tone } = req.body;
//       const suggestions = await aiService.generateResponseSuggestions(
//         emailContent,
//         tone
//       );
//       res.json({ suggestions });
//     } catch (error: any) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );

// aiRoutes.post(
//   "/sentiment-analysis",
//   authenticate,
//   requirePlan("PRO"),
//   async (req, res) => {
//     try {
//       const { emailContent } = req.body;
//       const sentiment = await aiService.analyzeSentiment(emailContent);
//       res.json(sentiment);
//     } catch (error: any) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );
