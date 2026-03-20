import HTTP_STATUS from "../../constant/statusCode.js";
import {
  createAddressService,
  getUserAddressesService,
  getSingleAddressService,
  updateAddressService,
  deleteAddressService,
  setDefaultAddressService,
} from "../../services/user/address.service.js";

import { successResponse } from "../../utils/partials/response.util.js";

// CREATE
export const createAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const address = await createAddressService(userId, req.body);

    return successResponse(
      res,
      "Address added successfully",
      HTTP_STATUS.CREATED,
      { address },
    );
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getUserAddresses = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const addresses = await getUserAddressesService(userId);

    return res.render("user/home/address", { addresses });
  } catch (error) {
    next(error);
  }
};

// GET ONE
export const getSingleAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const address = await getSingleAddressService(userId, req.params.id);

    return successResponse(
      res,
      "Address fetched successfully",
      HTTP_STATUS.OK,
      { address },
    );
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    const address = await updateAddressService(userId, req.params.id, req.body);

    return successResponse(
      res,
      "Address updated successfully",
      HTTP_STATUS.OK,
      { address },
    );
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    await deleteAddressService(userId, req.params.id);

    return successResponse(res,"Address deleted successfully");
  } catch (error) {
    next(error);
  }
};

// SET DEFAULT
export const setDefaultAddress = async (req, res, next) => {
  try {
    const userId = res.locals.user._id;

    await setDefaultAddressService(userId, req.params.id);

    return successResponse(
      res,
      "Default address updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    next(error);
  }
};
