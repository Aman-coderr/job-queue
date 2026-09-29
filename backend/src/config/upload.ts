import multer from "multer";
import multerS3 from "multer-s3";
import crypto from "crypto";
import { s3Client } from "shared";
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPEG, and WEBP images are allowed"));
  }
};

export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.R2_BUCKET_NAME as string,
    key: (req, file, cb) => {
      const uniqueName = crypto.randomUUID() + "-" + file.originalname;
      cb(null, uniqueName);
    },
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
