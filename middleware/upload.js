const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: fileFilter
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError
};