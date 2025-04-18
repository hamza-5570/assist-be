import dotenv from "dotenv";
import cloudinaryPackage from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

dotenv.config();

const cloudinary = cloudinaryPackage.v2;

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET_KEY
) {
  throw new Error("Missing Cloudinary configuration variables.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "assist",
      resource_type: "auto",
      use_filename: true,
      unique_filename: false,
      public_id: file.originalname,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
});

export default upload;
