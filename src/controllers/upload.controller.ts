import { Request, Response } from "express";
import { uploadProfilePhoto } from "../services/s3.service";
import { ServiceError } from "../services/service-error";

// Matches the frontend contract: POST /api/upload with FormData field "image".
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "An image file is required",
        success: false,
      });
    }

    const imageUrl = await uploadProfilePhoto(req.file);
    return res.status(200).json({ imageUrl });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Unable to upload image on s3",
      success: false,
    });
  }
};
