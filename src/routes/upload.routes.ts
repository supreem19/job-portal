import { Router } from "express";
import { uploadImage } from "../controllers/upload.controller";
import upload from "../middleware/uploadImage";

const router = Router();

router.post("/", upload.single("image"), uploadImage);

export default router;
