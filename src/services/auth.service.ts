import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mongo } from "mongoose";
import { User } from "../models/user.model";
import { ServiceError } from "./service-error";
import {
  cleanupUploadedFiles,
  uploadProfilePhoto,
  uploadRegistrationFiles,
  uploadResume,
} from "./s3.service";
import type { UserUploadFiles } from "./s3.service";

export interface RegisterUserPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

export interface LoginUserPayload {
  email: string;
  password: string;
  role: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  skills?: string;
}

export const registerUser = async (
  payload: RegisterUserPayload,
  files: UserUploadFiles = {},
) => {
  const { fullName, email, phoneNumber, password, role } = payload;

  if (role === "Student" && !files.resume) {
    throw new ServiceError(400, "A resume is required for Student registration");
  }
  if ([fullName, email, phoneNumber, password, role].some(
    (value) => typeof value !== "string" || !value.trim(),
  )) {
    throw new ServiceError(400, "Missing required fields");
  }

  if (role !== "Student" && role !== "Recruiter") {
    throw new ServiceError(400, "Role must be Student or Recruiter");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
  if (existingUser) {
    throw new ServiceError(400, existingUser.email === email
      ? "Email already exists"
      : "Phone number already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    fullName,
    email,
    phoneNumber,
    password: hashedPassword,
    role,
  });

  await newUser.validate();
  const { profilePhoto, resume } = await uploadRegistrationFiles(files);
  newUser.profile ??= { skills: [], profilePhoto: "" };
  if (profilePhoto) newUser.profile.profilePhoto = profilePhoto;
  if (resume) {
    newUser.profile.resume = resume.url;
    newUser.profile.resumeOriginalName = resume.originalName;
  }
  try {
    await newUser.save();
  } catch (error) {
    await cleanupUploadedFiles([profilePhoto, resume?.url]);
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      throw new ServiceError(409, "Email or phone number already exists");
    }
    throw error;
  }
  return { message: "Account created successfully.", success: true };
};

export const loginUser = async (payload: LoginUserPayload) => {
  const { email, password, role } = payload;

  if (!email || !password) {
    throw new ServiceError(400, "Missing required fields");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ServiceError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ServiceError(404, "Incorrect email or password");
  }

  if (user.role !== role) {
    throw new ServiceError(
      403,
      "You don't have the necessary role to access this resource",
    );
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1d",
    },
  );

  const userResponse = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
  };

  return {
    message: `Welcome back ${user.fullName}`,
    user: userResponse,
    token,
    success: true,
  };
};

export const logoutUser = async () => ({
  message: "Logged out successfully",
  success: true,
});

export const updateUserProfile = async (
  userId: string | undefined,
  payload: UpdateProfilePayload,
) => {
  const { fullName, email, phoneNumber, bio, skills } = payload;
  const user = await User.findById(userId);

  if (!user) {
    throw new ServiceError(404, "User not found");
  }

  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  user.profile ??= { skills: [], profilePhoto: "" };
  if (bio) user.profile!.bio = bio;
  if (skills)
    user.profile!.skills = skills.split(",").map((item) => item.trim());

  await user.save();

  return {
    message: "Profile updated successfully",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    },
    success: true,
  };
};

export const updateUserFile = async (
  userId: string | undefined,
  field: "profilePhoto" | "resume",
  file: Express.Multer.File | undefined,
) => {
  if (!userId) {
    throw new ServiceError(401, "Authentication required");
  }
  if (!file) {
    throw new ServiceError(400, field === "resume"
      ? "A resume file is required"
      : "A profile photo file is required");
  }
  if (!(await User.exists({ _id: userId }))) {
    throw new ServiceError(404, "User not found");
  }

  const url = await (field === "resume" ? uploadResume(file) : uploadProfilePhoto(file));
  let user: InstanceType<typeof User> | null;
  try {
    user = await User.findByIdAndUpdate(
      userId,
      {
        $set: field === "resume"
          ? { "profile.resume": url, "profile.resumeOriginalName": file.originalname }
          : { "profile.profilePhoto": url },
      },
      { returnDocument: "before", runValidators: true },
    );
    if (!user) throw new ServiceError(404, "User not found");
  } catch (error) {
    await cleanupUploadedFiles([url]);
    throw error;
  }

  // Use the atomically returned old value so concurrent replacements clean up safely.
  const previousUrl = user.profile?.[field];
  user.profile ??= { skills: [], profilePhoto: "" };
  user.profile[field] = url;
  if (field === "resume") user.profile.resumeOriginalName = file.originalname;
  await cleanupUploadedFiles([previousUrl ?? undefined]);

  return {
    message: field === "resume" ? "Resume updated successfully" : "Profile photo updated successfully",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    },
    success: true,
  };
};
