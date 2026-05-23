import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "./error.js";

export type AuthRequest = Request & {
  user?: { id: string; role: "user" | "creator" | "admin"; walletAddress?: string };
};

export const requireAuth: RequestHandler = async (req: AuthRequest, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
  if (!token) return next(new AppError(401, "Authentication required"));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: "user" | "creator" | "admin" };
    const user = await User.findById(payload.sub).select("_id role walletAddress primaryWallet primaryWalletAddress isBanned").lean();
    if (!user || user.isBanned) throw new AppError(401, "Invalid account");
    req.user = { id: String(user._id), role: user.role, walletAddress: user.walletAddress ?? user.primaryWallet ?? user.primaryWalletAddress ?? undefined };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid token"));
  }
};

export const optionalAuth: RequestHandler = async (req: AuthRequest, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: "user" | "creator" | "admin" };
    const user = await User.findById(payload.sub).select("_id role walletAddress primaryWallet primaryWalletAddress isBanned").lean();
    if (user && !user.isBanned) {
      req.user = { id: String(user._id), role: user.role, walletAddress: user.walletAddress ?? user.primaryWallet ?? user.primaryWalletAddress ?? undefined };
    }
  } catch {
    // Public reads should not fail because an optional token is stale.
  }
  next();
};

export const requireAdmin: RequestHandler = (req: AuthRequest, _res, next) => {
  if (req.user?.role !== "admin") return next(new AppError(403, "Admin access required"));
  next();
};

export const requireCreator: RequestHandler = (req: AuthRequest, _res, next) => {
  if (!req.user || !["creator", "admin"].includes(req.user.role)) return next(new AppError(403, "Creator access required"));
  next();
};
