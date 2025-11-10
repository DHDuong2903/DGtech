import cloudinary from "./cloudinary.js";

console.log("=== Testing Cloudinary Connection ===");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing");
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing");

// Test connection
cloudinary.api.ping()
  .then(result => {
    console.log("✓ Cloudinary connection successful!");
    console.log("Status:", result.status);
  })
  .catch(error => {
    console.error("✗ Cloudinary connection failed!");
    console.error("Error:", error.message);
  });
