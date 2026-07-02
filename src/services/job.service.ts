import { Job } from "../models/job.model";
import { ServiceError } from "./service-error";

export interface JobPayload {
  title: string;
  description: string;
  requirements: string[] | string;
  experience: number;
  location: string;
  salary: number;
  jobType: string;
  companyId: string;
  position: string;
}

export const postJobService = async (
  payload: JobPayload,
  userId: string | undefined,
) => {
  const {
    title,
    description,
    requirements,
    experience,
    location,
    salary,
    jobType,
    companyId,
    position,
  } = payload;

  if (
    !title ||
    !description ||
    !requirements ||
    !experience ||
    !location ||
    !salary ||
    !jobType ||
    !companyId ||
    !position
  ) {
    throw new ServiceError(400, "Please fill all the fields");
  }

  const requirementsArray = Array.isArray(requirements)
    ? requirements
    : requirements.split(",").map((item: string) => item.trim());

  const job = await Job.create({
    title,
    description,
    requirements: requirementsArray,
    experience: Number(experience),
    location,
    salary,
    jobType,
    company: companyId,
    position,
    created_by: userId,
  });

  return {
    message: "Job posted successfully.",
    status: true,
    job,
  };
};

export const getAllJobsService = async (keyword: string) => {
  const query = {
    $or: [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { requirements: { $regex: keyword, $options: "i" } },
      { location: { $regex: keyword, $options: "i" } },
      { jobType: { $regex: keyword, $options: "i" } },
      { position: { $regex: keyword, $options: "i" } },
    ],
  };

  const jobs = await Job.find(query);
  if (!jobs.length) {
    throw new ServiceError(404, "No jobs found");
  }

  return { jobs, status: true };
};

export const getJobByIdService = async (jobId: string) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ServiceError(404, "No jobs found");
  }

  return { job, status: true };
};

export const getAdminJobsService = async (adminId: string | undefined) => {
  const jobs = await Job.find({ created_by: adminId });
  if (!jobs.length) {
    throw new ServiceError(404, "No jobs found");
  }

  return { jobs, status: true };
};
