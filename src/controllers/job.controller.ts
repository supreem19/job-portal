import { Request, Response } from "express";
import type { AuthRequest } from "../types/auth-request";
import {
  getAdminJobsService,
  getAllJobsService,
  getJobByIdService,
  postJobService,
} from "../services/job.service";
import { ServiceError } from "../services/service-error";

export const postJob = async (req: AuthRequest, res: Response) => {
  try {
    const result = await postJobService(req.body, req.id);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        status: false,
      });
    }

    console.log(error);
    return res.status(500).json({
      message: "server error",
      status: false,
    });
  }
};

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const keyword = (req.query.keyword as string) || "";
    const result = await getAllJobsService(keyword);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        status: false,
      });
    }

    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const result = await getJobByIdService(req.params.id as string);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        status: false,
      });
    }

    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAdminJobs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAdminJobsService(req.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        status: false,
      });
    }

    return res.status(500).json({ message: "Server Error", status: false });
  }
};
