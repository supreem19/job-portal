import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoute from "./src/routes/user.routes";
import { connectDB } from "./src/utils/db";

dotenv.config();

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: ["http://localhost:5121"],
  credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5001;

// api's

app.use("/api/users", userRoute);

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "welcome to my job portal",
    timeStamp: new Date().toString(),
    status: true,
  });
});

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
