declare module "bcryptjs";
declare module "multer";
declare module "replicate";

declare namespace Express {
  interface Request {
    file?: {
      originalname: string;
      buffer: Buffer;
      mimetype: string;
      size: number;
    };
  }
}
