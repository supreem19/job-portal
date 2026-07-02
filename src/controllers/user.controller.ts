import { Request, Response } from "express";
import type { AuthRequest } from "../types/auth-request";
import {
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from "../services/auth.service";
import { ServiceError } from "../services/service-error";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginUser(req.body);
    return res
      .status(200)
      .cookie("token", result.token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
      })
      .json({
        message: result.message,
        user: result.user,
        success: result.success,
      });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Server Error login failed",
      success: false,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const result = await logoutUser();
    return res.status(200).cookie("token", "", { maxAge: 0 }).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error logout",
      success: false,
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await updateUserProfile(req.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Server Error updating profile",
      success: false,
    });
  }
};
