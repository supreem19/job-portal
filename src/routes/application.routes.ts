import { Router } from "express";
import authenticationToken from "../middleware/isAuthenticated";
import {
  applyJob,
  getAppliedJobs,
  getApplicants,
  updateStatus,
} from "../controllers/application.controller";

const router = Router();

router.route("/apply/:id").post(authenticationToken, applyJob);
router.route("/get").get(authenticationToken, getAppliedJobs);
router.route("/:id/applicants").get(authenticationToken, getApplicants);
router.route("/status/:id/update").put(authenticationToken, updateStatus);

export default router;
