import { sequelize } from "./libs/db.js";
import { User } from "./models/userModel.js";
import { Category } from "./models/categoryModel.js";
import { Product } from "./models/productModel.js";
import { Review } from "./models/reviewModel.js";

const syncDatabase = async () => {
  try {
    console.log("Bat dau dong bo database...");

    // alter: true sẽ tự động thêm các column mới vào database
    await sequelize.sync({ alter: true });

    console.log("✓ Database da duoc dong bo thanh cong!");
    console.log("✓ Cac truong moi da duoc them vao bang products:");
    console.log("  - isFeatured (BOOLEAN, default: false)");
    console.log("  - isOnSale (BOOLEAN, default: false)");

    process.exit(0);
  } catch (error) {
    console.error("✗ Loi khi dong bo database:", error);
    process.exit(1);
  }
};

syncDatabase();
