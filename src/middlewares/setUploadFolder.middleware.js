export const setUploadFolder = (folderName) => {
  return (req, res, next) => {
    req.folder = folderName;
    next();
  };
};