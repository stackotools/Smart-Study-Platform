const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify Cloudinary configuration
const verifyCloudinaryConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  Cloudinary configuration is incomplete. File uploads may not work properly.'.yellow);
    return false;
  }
  return true;
};

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    if (!verifyCloudinaryConfig()) {
      return false;
    }
    
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful'.green);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:'.red, error.message);
    return false;
  }
};

// Create Cloudinary storage for different file types
const createCloudinaryStorage = (resourceType = 'auto', folder = '') => {
  const folderPath = process.env.CLOUDINARY_FOLDER ? 
    `${process.env.CLOUDINARY_FOLDER}${folder ? `/${folder}` : ''}` : 
    folder || 'uploads';
    
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      resource_type: resourceType,
      folder: folderPath,
      allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'ppt', 'pptx'],
      transformation: [
        // For images, we can add transformations
        { quality: 'auto', fetch_format: 'auto' }
      ],
      public_id: (req, file) => {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const originalName = file.originalname.split('.')[0]
          .replace(/[^a-zA-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        return `${originalName}-${timestamp}-${random}`;
      },
    },
  });
};

// Storage configurations for different use cases
const documentStorage = createCloudinaryStorage('auto', 'documents');
const imageStorage = createCloudinaryStorage('image', 'images');
const videoStorage = createCloudinaryStorage('video', 'videos');

// Utility function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error.message);
    throw error;
  }
};

// Utility function to get file info from Cloudinary response
const getCloudinaryFileInfo = (file) => {
  if (!file) {
    throw new Error('File object is required');
  }
  
  return {
    fileName: file.filename, // This will be the public_id
    originalFileName: file.originalname,
    filePath: file.path, // This will be the Cloudinary URL
    fileSize: file.size || 0,
    fileType: file.originalname.split('.').pop().toLowerCase(),
    mimeType: file.mimetype,
    cloudinaryPublicId: file.filename,
    cloudinaryUrl: file.path,
    cloudinarySecureUrl: file.path.replace('http://', 'https://'),
    resourceType: file.resource_type || 'auto'
  };
};

// Generate signed URL for private files (if needed)
const generateSignedUrl = (publicId, options = {}) => {
  try {
    const defaultOptions = {
      resource_type: 'auto',
      sign_url: true,
      type: 'upload'
    };
    
    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error generating signed URL:', error.message);
    throw error;
  }
};

// Get file details from Cloudinary
const getFileDetails = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    
    return result;
  } catch (error) {
    console.error('Error getting file details:', error.message);
    throw error;
  }
};

// Batch delete files from Cloudinary
const batchDeleteFromCloudinary = async (publicIds, resourceType = 'auto') => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new Error('Public IDs array is required');
    }
    
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });
    
    return result;
  } catch (error) {
    console.error('Error batch deleting from Cloudinary:', error.message);
    throw error;
  }
};

// Get upload statistics
const getUploadStats = async () => {
  try {
    const result = await cloudinary.api.usage();
    return {
      totalCredits: result.credits,
      usedCredits: result.credits - result.credits_left,
      remainingCredits: result.credits_left,
      storage: {
        used: result.storage.used,
        limit: result.storage.limit
      },
      bandwidth: {
        used: result.bandwidth.used,
        limit: result.bandwidth.limit
      }
    };
  } catch (error) {
    console.error('Error getting upload stats:', error.message);
    throw error;
  }
};

module.exports = {
  cloudinary,
  documentStorage,
  imageStorage,
  videoStorage,
  createCloudinaryStorage,
  deleteFromCloudinary,
  getCloudinaryFileInfo,
  generateSignedUrl,
  getFileDetails,
  batchDeleteFromCloudinary,
  getUploadStats,
  verifyCloudinaryConfig,
  testCloudinaryConnection
};
