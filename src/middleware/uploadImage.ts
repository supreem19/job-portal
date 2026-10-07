import multer from "multer";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (allowedImageTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
  },
});

export default uploadImage;
