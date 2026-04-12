import { Readable } from "stream";
import cloudinary from "../libs/cloudinary.js";

/**
 * Upload image buffer to Cloudinary (avoids multer-storage-cloudinary long-stream ECONNRESET issues).
 */
export function uploadProductImageBuffer(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    if (!buffer?.length) {
      reject(new Error("Empty image buffer"));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "products",
        resource_type: "image",
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("Cloudinary returned no secure_url"));
          return;
        }
        resolve(result.secure_url);
      },
    );

    Readable.from(buffer).pipe(stream);
  });
}
