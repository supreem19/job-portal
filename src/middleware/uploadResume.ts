import multer from "multer";
import { extname } from "path";
import { ServiceError } from "../services/service-error";

const allowedResumeTypes = new Map([
  [".pdf", "application/pdf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

export const resumeFileFilter: NonNullable<multer.Options["fileFilter"]> =
  (_request, file, callback) => {
    const expectedType = allowedResumeTypes.get(extname(file.originalname).toLowerCase());
    if (expectedType && file.mimetype === expectedType) {
      callback(null, true);
      return;
    }

    callback(new ServiceError(400, "Only PDF, DOC, and DOCX resumes are allowed"));
  };

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: resumeFileFilter,
});

export default uploadResume;
