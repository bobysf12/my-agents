import { NextFunction, Request, Response } from "express";
import {
  LoginInput,
  LoginSchema,
  RegisterInput,
  RegisterSchema,
} from "../validations/auth-validations";
import * as authServices from "../services/auth-service";
import { generateToken } from "../utils/jwt-utils";

export const login = async (
  req: Request<any, LoginInput>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await authServices.login(email, password);

    if (!user) {
      res.status(400).json({
        message: "User not found",
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request<any, RegisterInput>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, name } = RegisterSchema.parse(req.body);
    const user = await authServices.register(name, email, password);

    if (!user) {
      res.status(400).json({
        message: "User not found",
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
