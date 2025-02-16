import { NextFunction, Request, Response } from "express";
import * as aiService from "../services/ai-service";

export const generateContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.body.query;
        const response = await aiService.generateContent(query);
        res.json({ data: response });
    } catch (error) {
        next(error);
    }
};

export const getTrendingTopics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await aiService.getTopicIdeas();
        res.json({ data: response });
    } catch (error) {
        next(error);
    }
};
