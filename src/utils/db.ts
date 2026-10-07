import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("db connected");
  } catch (error: any) {
    console.log("Error connecting db:", error.message as string);
    process.exit(1);
  }
};
