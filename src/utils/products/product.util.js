import mongoose from "mongoose";
import AppError from "../partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const findByIdOrThrow = async (Model, id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid ID", HTTP_STATUS.BAD_REQUEST);
  }

  const { select, populate, lean, match } = options;

  // Apply match filter correctly
  let query = Model.findOne({ _id: id, ...(match || {}) });

  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);
  if (lean) query = query.lean();

  const doc = await query;

  if (!doc) {
    throw new AppError(`${Model.modelName} not found`, HTTP_STATUS.NOT_FOUND);
  }

  return doc;
};
