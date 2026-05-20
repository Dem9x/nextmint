import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createJwt(user: { _id: unknown; role: string }) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: env.JWT_EXPIRES_IN as any
  });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, env.JWT_SECRET);
}
