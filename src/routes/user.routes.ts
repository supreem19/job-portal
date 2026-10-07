import { Router } from "express";
import {
  login,
  logout,
  register,
  updateProfile,
} from "../controllers/user.controller";
import authenticationToken from "../middleware/isAuthenticated";
import uploadImage from "../middleware/uploadImage";

const router = Router();

router.route("/register").post(uploadImage.single("profilePhoto"), register);
router.route("/login").post(login);
router.route("/profile/updateProfile").post(authenticationToken, updateProfile);
router.route("/logout").post(logout);

export default router;
