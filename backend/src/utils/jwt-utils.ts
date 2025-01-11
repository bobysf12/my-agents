import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/globalConfig";


export const generateToken = (payload: any) => {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: "1d",
	});
}

export const verifyToken = (token: string) => {
	return jwt.verify(token, JWT_SECRET);
}
