import { Router } from "express";
import {
  login,
  logout,
  register,
  updateProfile,
  updateProfilePhoto,
  updateResume,
} from "../controllers/user.controller";
import authenticationToken from "../middleware/isAuthenticated";
import uploadRegistration from "../middleware/uploadRegistration";
import uploadResume from "../middleware/uploadResume";
import uploadImage from "../middleware/uploadImage";

const router = Router();

router.route("/register").post(uploadRegistration, register);
router.route("/login").post(login);
router.route("/profile/updateProfile").post(authenticationToken, updateProfile);
router.route("/profile/updateResume").post(
  authenticationToken,
  uploadResume.single("resume"),
  updateResume,
);
router.route("/profile/updateProfilePhoto").post(
  authenticationToken,
  uploadImage.single("profilePhoto"),
  updateProfilePhoto,
);
router.route("/logout").post(logout);

export default router;
