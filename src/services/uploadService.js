const cloudinary = require('../config/cloudinary');

/**
 * Upload a single file to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - The Cloudinary folder name (default: 'products')
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
exports.uploadToCloudinary = async (fileBuffer, folder = 'products') =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'image' }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      })
      .end(fileBuffer);
  });

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects with buffer property
 * @param {string} folder - The Cloudinary folder name (default: 'products')
 * @returns {Promise<Array<string>>} - Array of secure URLs
 */
exports.uploadMultipleImages = async (files, folder = 'products') => {
  const uploadPromises = files.map((file) =>
    exports.uploadToCloudinary(file.buffer, folder)
  );
  return Promise.all(uploadPromises);
};

/**
 * Upload product images (1 main + multiple support images)
 * @param {Object} mainImageFile - Main image file object
 * @param {Array} supportImageFiles - Array of support image files
 * @param {string} folder - The Cloudinary folder name (default: 'products')
 * @returns {Promise<Object>} - Object with mainImageUrl and supportImageUrls
 */
exports.uploadProductImages = async (
  mainImageFile,
  supportImageFiles = [],
  folder = 'products'
) => {
  // Upload main image first
  const mainImageUrl = await exports.uploadToCloudinary(
    mainImageFile.buffer,
    folder
  );

  // Upload support images in parallel
  const supportImageUrls = await exports.uploadMultipleImages(
    supportImageFiles,
    folder
  );

  return {
    mainImageUrl,
    supportImageUrls,
  };
};
