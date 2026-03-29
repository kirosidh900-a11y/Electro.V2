import mongoose from "mongoose";

export const findByIdOrThrow = async (Model, id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid ID", HTTP_STATUS.BAD_REQUEST);
  }

  let query = Model.findById(id);

  if (options.select) query = query.select(options.select);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();

  const doc = await query;

  if (!doc) {
    throw new AppError(`${Model.modelName} not found`, HTTP_STATUS.NOT_FOUND);
  }

  return doc;
};
