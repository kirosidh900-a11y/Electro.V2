export const getPublicId = (url) => {
  const parts = url.split("/");
  const file = parts.slice(-2).join("/");
  const publicId = file.substring(0, file.lastIndexOf("."));
  return publicId;
};