import { Application } from "../models/application.model";
import { Job } from "../models/job.model";
import { User } from "../models/user.model";
import { AuthRequest } from "../types/auth-request";
import { Response } from "express";
import mongoose from "mongoose";

export const applyJob = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;
    if (!jobId) {
      return res
        .status(400)
        .json({ message: "Invalid job id", success: false });
    }
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
        success: false,
      });
    }
    // check if the job exists or not
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }
    // create new application
    const application = new Application({
      job: jobId,
      applicant: userId,
    });
    await application.save();
    job.application.push(application._id);
    await job.save();
    return res
      .status(201)
      .json({ message: "Application submitted successfully", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

export const getAppliedJobs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.id;
    const applications = await Application.find({ applicant: userId }).populate(
      {
        path: "job",
        options: { sort: { createdAt: -1 } },
        populate: { path: "company", options: { sort: { createdAt: -1 } } },
      },
    );
    if (!applications) {
      return res
        .status(404)
        .json({ message: "No applications found", success: false });
    }
    return res.status(200).json({ applications, success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

export const getApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.id;
    if (!mongoose.isValidObjectId(jobId)) {
      return res
        .status(400)
        .json({ message: "Invalid job id", success: false });
    }

    const job = await Job.findById(jobId).populate({
      path: "application",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "applicant",
        model: User,
      },
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }
    return res.status(200).json({ applicants: job, success: true });
  } catch (error) {
    console.error("Failed to fetch job applicants:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = req.params.id;
    const { status } = req.body;
    if (typeof status !== "string" || !status) {
      return res
        .status(400)
        .json({ message: "Status is required", success: false });
    }
    if (!mongoose.isValidObjectId(applicationId)) {
      return res
        .status(400)
        .json({ message: "Invalid application id", success: false });
    }
    const normalizedStatus = status.toLowerCase();
    if (
      normalizedStatus !== "pending" &&
      normalizedStatus !== "accepted" &&
      normalizedStatus !== "rejected"
    ) {
      return res.status(400).json({
        message: "Status must be pending, accepted, or rejected",
        success: false,
      });
    }
    const application = await Application.findById(applicationId);
    if (!application) {
      return res
        .status(404)
        .json({ message: "Application not found", success: false });
    }
    application.status = normalizedStatus;
    await application.save();
    return res.status(200).json({
      message: "Application status updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Failed to update application status:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};
