import { Company } from "../models/company.model";
import { ServiceError } from "./service-error";

export interface CompanyPayload {
  name: string;
  description: string;
  website?: string;
  location?: string;
}

export const registerCompanyService = async (
  payload: CompanyPayload,
  userId: string | undefined,
) => {
  const { name, description, website, location } = payload;

  if (!name) {
    throw new ServiceError(400, "Company name is required.");
  }

  if (!description) {
    throw new ServiceError(400, "Description is required.");
  }

  const existingCompany = await Company.findOne({ name });
  if (existingCompany) {
    throw new ServiceError(400, "Company already exist.");
  }

  const company = await Company.create({
    name,
    description,
    website,
    location,
    userId,
  });

  return {
    message: "Company created successfully",
    company,
    success: true,
  };
};

export const getCompaniesByUserService = async (userId: string | undefined) => {
  const companies = await Company.find({ userId });
  if (!companies.length) {
    throw new ServiceError(404, "No companies found");
  }

  return {
    message: "companies fetched.",
    companies,
    success: true,
  };
};

export const getCompanyByIdService = async (companyId: string) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ServiceError(404, "No company found");
  }

  return {
    message: "company data fetched.",
    company,
    success: true,
  };
};

export const updateCompanyService = async (
  companyId: string,
  payload: CompanyPayload,
) => {
  const { name, description, website, location } = payload;
  const updateData = { name, description, website, location };
  const company = await Company.findByIdAndUpdate(companyId, updateData, {
    new: true,
  });

  if (!company) {
    throw new ServiceError(404, "No company found");
  }

  return {
    message: "company updated successfully",
    company,
    success: true,
  };
};
