import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a Base64 image string to Cloudinary and returns the secure URL.
 * @param base64Image The base64 data URI (e.g. data:image/png;base64,...)
 * @param folder The folder to store the image in Cloudinary
 * @returns The secure URL of the uploaded image
 */
export async function uploadBase64Image(base64Image: string, folder: string = "petshop/products"): Promise<string> {
  if (!base64Image.startsWith("data:image")) {
    return base64Image; // If it's already a URL, return as is
  }

  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error("Gagal mengupload gambar ke server.");
  }
}

export default cloudinary;
