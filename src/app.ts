import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import userRoute from "./routes/user.routes";
import companyRoute from "./routes/company.routes";
import jobRoute from "./routes/job.routes";
import applicationRoute from "./routes/application.routes";
import uploadRoute from "./routes/upload.routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = (
  process.env.FRONTEND_URL ??
  "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/users", userRoute);
app.use("/api/company", companyRoute);
app.use("/api/job", jobRoute);
app.use("/api/application", applicationRoute);
app.use("/api/upload", uploadRoute);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        message: error.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : error.message,
        success: false,
      });
    }

    if (error instanceof Error && error.message === "Only JPEG, PNG, and WebP images are allowed") {
      return res.status(400).json({ message: error.message, success: false });
    }

    return next(error);
  },
);

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "welcome to my job portal",
    timeStamp: new Date().toString(),
    status: true,
  });
});

export default app;
