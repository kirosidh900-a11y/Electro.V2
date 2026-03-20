import Address from "../../models/addressSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

// CREATE
export const createAddressService = async (userId, data) => {
  const address = await Address.create({ ...data, userId });

  // ensure single default
  if (data.isDefault) {
    await Address.updateMany(
      { userId, _id: { $ne: address._id } },
      { isDefault: false }
    );
  }

  // first address → default
  const count = await Address.countDocuments({ userId });
  if (count === 1) {
    address.isDefault = true;
    await address.save();
  }

  return address;
};

// GET ALL
export const getUserAddressesService = async (userId) => {
  return await Address.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });
};

// GET ONE
export const getSingleAddressService = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
  }

  return address;
};

// UPDATE
export const updateAddressService = async (userId, addressId, data) => {
  if (data.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!address) {
    throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
  }

  return address;
};

// DELETE
export const deleteAddressService = async (userId, addressId) => {
  const address = await Address.findOneAndDelete({
    _id: addressId,
    userId,
  });

  if (!address) {
    throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
  }

  // if default → assign new
  if (address.isDefault) {
    const newDefault = await Address.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (newDefault) {
      newDefault.isDefault = true;
      await newDefault.save();
    }
  }

  return true;
};

// SET DEFAULT
export const setDefaultAddressService = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
  }

  await Address.updateMany({ userId }, { isDefault: false });

  address.isDefault = true;
  await address.save();

  return true;
};