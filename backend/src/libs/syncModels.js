import { sequelize } from "./db.js";

import { User } from "../models/userModel.js";
import { Category } from "../models/categoryModel.js";
import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";

export const syncModels = async () => {
  try {
    // Tạm thời dùng false để nhanh hơn khi dev
    // Chỉ dùng alter: true khi có thay đổi schema
    await sequelize.sync({ alter: false });
    console.log("Models da duoc dong bo voi database");
  } catch (error) {
    console.error("Loi khi dong bo syncModels:", error);
  }
};
