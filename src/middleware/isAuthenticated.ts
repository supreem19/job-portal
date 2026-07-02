import jwt from "jsonwebtoken";
import { NextFunction, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import type { AuthRequest } from "../types/auth-request";

interface CustomJwtPayload extends JwtPayload {
  userId: string;
}

const authenticationToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        success: false,
      });
    }
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }
    const decoded = jwt.verify(token, secret) as CustomJwtPayload;
    if (!decoded) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }
    req.id = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

export default authenticationToken;
