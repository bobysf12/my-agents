import { Router } from "express";
import * as assistantController from "../controllers/assistant-controller";

const router = Router();

router.post("/generate-content", assistantController.generateContent);
router.get("/trending", assistantController.getTrendingTopics);
router.post("/generate-instagram-post", assistantController.generateInstagramPost);

export default router;
