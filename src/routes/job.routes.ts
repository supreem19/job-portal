import { Router } from "express";
import authenticationToken from "../middleware/isAuthenticated";
import {
  getAdminJobs,
  getAllJobs,
  getJobById,
  postJob,
} from "../controllers/job.controller";

const router = Router();

router.route("/post").post(authenticationToken, postJob);
router.route("/get").get(getAllJobs);
router.route("/getadminjobs").get(authenticationToken, getAdminJobs);
router.route("/get/:id").get(getJobById);

export default router;
