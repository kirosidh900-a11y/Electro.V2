import HTTP_STATUS from "../../constant/statusCode.js";
import Address from "../../models/addressSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";

// CREATE ADDRESS
export const createAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const address = await Address.create({
      ...req.body,
      userId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL ADDRESSES
export const getUserAddresses = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const addresses = await Address.find({ userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE ADDRESS
export const getSingleAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const address = await Address.findOne({
      _id: req.params.id,
      userId,
    });

    if (!address) {
      throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
    }

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ADDRESS
export const updateAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.id;

    // 🔥 Handle default manually (important)
    if (req.body.isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      req.body,
      { new: true },
    );

    if (!address) {
      throw new AppError("Address not found", 404);
    }

    res.json({
      success: true,
      message: "Address updated",
      address,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE ADDRESS
export const deleteAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.id;

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!address) {
      throw new AppError("Address not found", HTTP_STATUS.NOT_FOUND);
    }

    // 🔥 If deleted was default → assign new default
    if (address.isDefault) {
      const newDefault = await Address.findOne({ userId });

      if (newDefault) {
        newDefault.isDefault = true;
        await newDefault.save();
      }
    }

    res.json({
      success: true,
      message: "Address deleted",
    });
  } catch (error) {
    next(error);
  }
};

// SET DEFAULT ADDRESS
export const setDefaultAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.id;

    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      throw new AppError("Address not found", 404);
    }

    // 🔥 Reset all
    await Address.updateMany({ userId }, { isDefault: false });

    // 🔥 Set selected
    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: "Default address updated",
    });
  } catch (error) {
    next(error);
  }
};
