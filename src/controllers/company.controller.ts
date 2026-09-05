import { Request, Response } from "express";
import type { AuthRequest } from "../types/auth-request";
import {
  getCompaniesByUserService,
  getCompanyByIdService,
  registerCompanyService,
  updateCompanyService,
} from "../services/company.service";
import { ServiceError } from "../services/service-error";

export const registerCompany = async (req: AuthRequest, res: Response) => {
  try {
    const result = await registerCompanyService(req.body, req.id);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.log(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const getAllCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getCompaniesByUserService(req.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.log(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const result = await getCompanyByIdService(req.params.id as string);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.log(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const result = await updateCompanyService(
      req.params.id as string,
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.log(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};
