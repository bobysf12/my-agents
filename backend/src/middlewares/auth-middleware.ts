import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt-utils";
import { AuthenticatedRequest } from "../types/common-types";

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the token from the Authorization header Bearer token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({
        message: "Unauthorized",
      });
    } else {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    }
  } catch (error) {
    next(error);
  }
};
