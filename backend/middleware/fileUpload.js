const multer = require('multer');
const path = require('path');
const ErrorResponse = require('./ErrorResponse');
const { 
  documentStorage, 
  deleteFromCloudinary, 
  getCloudinaryFileInfo,
  verifyCloudinaryConfig 
} = require('../config/cloudinary');

// Check if Cloudinary is configured, fallback to memory storage if not
const storage = verifyCloudinaryConfig() ? documentStorage : multer.memoryStorage();

// File filter with enhanced validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,jpg,jpeg,png,ppt,pptx')
    .split(',')
    .map(type => type.trim().toLowerCase());
  
  const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
  const allowedMimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  
  // Check file extension
  if (!allowedTypes.includes(fileExt)) {
    return cb(new ErrorResponse(
      `Only ${allowedTypes.join(', ')} files are allowed. You uploaded: ${fileExt}`,
      400
    ), false);
  }
  
  // Check MIME type for additional security
  const expectedMimeType = allowedMimeTypes[fileExt];
  if (expectedMimeType && file.mimetype !== expectedMimeType) {
    // Allow some flexibility for text files and images
    const isTextFile = fileExt === 'txt' && file.mimetype.startsWith('text/');
    const isImageFile = ['jpg', 'jpeg', 'png'].includes(fileExt) && file.mimetype.startsWith('image/');
    
    if (!isTextFile && !isImageFile) {
      return cb(new ErrorResponse(
        `Invalid file type. Expected ${expectedMimeType} but got ${file.mimetype}`,
        400
      ), false);
    }
  }
  
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files at once
  }
});

// Single file upload middleware
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let message = 'File upload error';
          
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              message = `File too large. Maximum size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / (1024 * 1024))}MB`;
              break;
            case 'LIMIT_FILE_COUNT':
              message = 'Too many files. Maximum 5 files allowed';
              break;
            case 'LIMIT_UNEXPECTED_FILE':
              message = `Unexpected file field. Expected field name: ${fieldName}`;
              break;
            default:
              message = err.message;
          }
          
          return next(new ErrorResponse(message, 400));
        } else if (err instanceof ErrorResponse) {
          return next(err);
        } else {
          return next(new ErrorResponse('File upload failed', 500));
        }
      }
      
      // Check if file was uploaded
      if (!req.file) {
        return next(new ErrorResponse('Please upload a file', 400));
      }
      
      next();
    });
  };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let message = 'File upload error';
          
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              message = `File too large. Maximum size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / (1024 * 1024))}MB`;
              break;
            case 'LIMIT_FILE_COUNT':
              message = `Too many files. Maximum ${maxCount} files allowed`;
              break;
            case 'LIMIT_UNEXPECTED_FILE':
              message = `Unexpected file field. Expected field name: ${fieldName}`;
              break;
            default:
              message = err.message;
          }
          
          return next(new ErrorResponse(message, 400));
        } else if (err instanceof ErrorResponse) {
          return next(err);
        } else {
          return next(new ErrorResponse('File upload failed', 500));
        }
      }
      
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return next(new ErrorResponse('Please upload at least one file', 400));
      }
      
      next();
    });
  };
};

// Optional file upload (doesn't fail if no file)
const uploadOptional = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let message = 'File upload error';
          
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              message = `File too large. Maximum size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / (1024 * 1024))}MB`;
              break;
            case 'LIMIT_FILE_COUNT':
              message = 'Too many files. Maximum 5 files allowed';
              break;
            case 'LIMIT_UNEXPECTED_FILE':
              message = `Unexpected file field. Expected field name: ${fieldName}`;
              break;
            default:
              message = err.message;
          }
          
          return next(new ErrorResponse(message, 400));
        } else if (err instanceof ErrorResponse) {
          return next(err);
        } else {
          return next(new ErrorResponse('File upload failed', 500));
        }
      }
      
      // Continue even if no file was uploaded
      next();
    });
  };
};

// Helper function to delete uploaded file from Cloudinary
const deleteFile = async (filePathOrPublicId, isCloudinary = true) => {
  try {
    if (isCloudinary && verifyCloudinaryConfig()) {
      // Extract public_id from Cloudinary URL or use directly if it's already a public_id
      let publicId = filePathOrPublicId;
      
      // If it's a full Cloudinary URL, extract the public_id
      if (filePathOrPublicId.includes('cloudinary.com')) {
        const urlParts = filePathOrPublicId.split('/');
        const fileNameWithExt = urlParts[urlParts.length - 1];
        publicId = fileNameWithExt.split('.')[0];
        
        // Reconstruct full public_id with folder path
        const folderIndex = urlParts.indexOf('upload');
        if (folderIndex > -1 && folderIndex < urlParts.length - 2) {
          const folderParts = urlParts.slice(folderIndex + 2, -1);
          publicId = folderParts.length > 0 ? `${folderParts.join('/')}/${publicId}` : publicId;
        }
      }
      
      const result = await deleteFromCloudinary(publicId);
      return result;
    }
    
    // If not using Cloudinary or config is missing, return success (no-op)
    return { result: 'ok' };
  } catch (error) {
    console.error('Error deleting file:', error.message);
    // Don't throw error for file deletion failures to prevent blocking other operations
    return { result: 'error', message: error.message };
  }
};

// Get file info helper - works with both Cloudinary and local files
const getFileInfo = (file) => {
  if (verifyCloudinaryConfig() && file.path && file.path.includes('cloudinary.com')) {
    // Cloudinary file
    return getCloudinaryFileInfo(file);
  } else {
    // Local file or memory storage fallback
    return {
      fileName: file.filename || file.originalname,
      originalFileName: file.originalname,
      filePath: file.path || '',
      fileSize: file.size || 0,
      fileType: path.extname(file.originalname).toLowerCase().slice(1),
      mimeType: file.mimetype,
      cloudinaryPublicId: null,
      cloudinaryUrl: null,
      cloudinarySecureUrl: null,
      resourceType: 'local'
    };
  }
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadOptional,
  deleteFile,
  getFileInfo
};
