import { Readable } from "stream";
import cloudinary from "../libs/cloudinary.js";

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    if (!buffer?.length) {
      reject(new Error("Empty upload buffer"));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (!result?.secure_url || !result?.public_id) {
        reject(new Error("Cloudinary returned incomplete upload result"));
        return;
      }
      resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
}

export async function uploadProductImageBuffer(buffer, mimetype) {
  const result = await uploadBufferToCloudinary(buffer, {
    folder: "products",
    resource_type: "image",
    format: mimetype?.includes("png") ? "png" : undefined,
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes ?? null,
    format: result.format ?? null,
  };
}

function buildRawFilename(originalFilename) {
  return originalFilename ? originalFilename.replace(/\.glb$/i, "") : undefined;
}

async function uploadRawGlbBuffer(buffer, originalFilename, folder) {
  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    resource_type: "raw",
    public_id: buildRawFilename(originalFilename),
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes ?? null,
    format: result.format ?? null,
  };
}

export async function uploadProductModelBuffer(buffer, originalFilename) {
  return uploadRawGlbBuffer(buffer, originalFilename, "products/models");
}

export async function uploadShowroomRoomBuffer(buffer, originalFilename) {
  return uploadRawGlbBuffer(buffer, originalFilename, "showroom/rooms");
}

export async function destroyCloudinaryAsset(publicId, resourceType = "raw") {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.warn(`Failed to delete Cloudinary asset ${publicId}:`, error?.message || error);
  }
}
