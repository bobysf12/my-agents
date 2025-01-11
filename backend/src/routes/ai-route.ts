import { Router } from "express";
import * as assistantController from "../controllers/assistant-controller";

const router = Router();

router.post("/ask", assistantController.assist);

export default router;
