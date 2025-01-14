import { NextFunction, Request, Response } from "express";
import { askDirector } from "../services/ai-service";

export const assist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.body.query;
        const userId = "default";
        const sessionId = req.body.sessionId;
        const response = await askDirector(query, userId, sessionId);
        res.json({ data: response });
    } catch (error) {
        next(error);
    }
};
