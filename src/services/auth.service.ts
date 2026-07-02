import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ServiceError } from "./service-error";

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

export const registerUser = async (payload: RegisterUserPayload) => {
  const { fullName, email, phoneNumber, password, role } = payload;

  if (!fullName || !email || !phoneNumber || !password || !role) {
    throw new ServiceError(400, "Missing required fields");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ServiceError(400, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    fullName,
    email,
    phoneNumber,
    password: hashedPassword,
    role,
  });

  await newUser.save();
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

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });

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

export const logoutUser = async () => ({ message: "Logged out successfully", success: true });

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
  if (bio) user.profile.bio = bio;
  if (skills) user.profile.skills = skills.split(",").map((item) => item.trim());

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
