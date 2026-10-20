import multer from "multer";
import { imageFileFilter } from "./uploadImage";
import { resumeFileFilter } from "./uploadResume";

const uploadRegistration = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (request, file, callback) => {
    if (file.fieldname === "profilePhoto") {
      imageFileFilter(request, file, callback);
    } else {
      resumeFileFilter(request, file, callback);
    }
  },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

export default uploadRegistration;
