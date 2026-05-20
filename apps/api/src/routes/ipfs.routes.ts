import multer from "multer";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadBuffer, uploadJson } from "../services/ipfs/ipfs.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
export const ipfsRouter = Router();

ipfsRouter.post("/upload", requireAuth, upload.single("file"), asyncHandler(async (req, res) => {
  if (req.file) return res.status(201).json(await uploadBuffer(req.file.originalname, req.file.buffer, req.file.mimetype));
  return res.status(201).json(await uploadJson(req.body));
}));
