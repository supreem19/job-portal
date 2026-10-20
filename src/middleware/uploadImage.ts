import multer from "multer";
import { ServiceError } from "../services/service-error";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const imageFileFilter: NonNullable<multer.Options["fileFilter"]> =
  (_request, file, callback) => {
    if (allowedImageTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new ServiceError(400, "Only JPEG, PNG, and WebP images are allowed"));
  };

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

export default uploadImage;
