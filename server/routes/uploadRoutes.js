
const express = require('express');
const multer = require('multer');

const cloudinary = require('../config/cloudinary');

const {
    protect,
    authorizeCreator
} = require('../middleware/authMiddleware');

const router = express.Router();

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

// Accept only supported image and video formats
const upload = multer({
    storage: storage,

    limits: {
        fileSize: 50 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error('Unsupported image or video format.'));
        }
    }
});

// Upload media to Cloudinary
router.post(
    '/',
    protect,
    authorizeCreator,
    upload.single('media'),
    async (req, res) => {

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: 'Please select an image or video.'
                });
            }

            // Send the uploaded file to Cloudinary
            const result = await new Promise((resolve, reject) => {

                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'boujee-life-of-ririi',
                        resource_type: 'auto'
                    },

                    (error, uploadedFile) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(uploadedFile);
                        }
                    }
                );

                uploadStream.end(req.file.buffer);
            });

            // Return the permanent media URL
            res.status(200).json({
                message: 'Media uploaded successfully!',
                mediaUrl: result.secure_url,
                mediaType: result.resource_type === 'video'
                    ? 'video'
                    : 'image'
            });

        } catch (error) {
            console.error('Media upload error:', error);

            res.status(500).json({
                message: 'Media upload failed. Please try again.'
            });
        }
    }
);

module.exports = router;
