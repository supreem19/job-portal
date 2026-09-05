import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import userRoute from "./routes/user.routes";
import companyRoute from "./routes/company.routes";
import jobRoute from "./routes/job.routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/users", userRoute);
app.use("/api/company", companyRoute);
app.use("/api/job", jobRoute);

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "welcome to my job portal",
    timeStamp: new Date().toString(),
    status: true,
  });
});

export default app;
