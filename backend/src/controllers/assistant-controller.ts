import { NextFunction, Request, Response } from "express";
import { askDirector } from "../services/ai-service";

export const assist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.body.query;
        const response = await askDirector(query);
        res.json({ data: response });
    } catch (error) {
        next(error);
    }
};
