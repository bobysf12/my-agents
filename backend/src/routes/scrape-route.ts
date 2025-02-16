import { Router } from "express";
import * as scrapeController from "../controllers/scrape-controller";

const router = Router();

router.get("/deep-scrape", scrapeController.deepScrape);

export default router;
