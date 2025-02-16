import { NextFunction, Request, Response } from "express";
import * as scrapeServices from "../services/web-scraper-service";

export const deepScrape = async (
    req: Request<null, null, null, { url: string; maxDepth?: number; transformToMarkdown?: boolean }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const options = {
            maxDepth: req.query.maxDepth,
            transformToMarkdown: req.query.transformToMarkdown,
            headless: true,
        };
        const result = await scrapeServices.deepScrapeWebsite(req.query.url, options);

        res.json({ message: "Success", data: result });
    } catch (error) {
        next(error);
    }
};
