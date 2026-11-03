const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist
const avatarDir = path.join(__dirname, '../../public/uploads/avatars');
const mediaDir = path.join(__dirname, '../../public/uploads/media');

if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

// Storage for avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

// Storage for chat multimedia (images, audio)
const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `media-${uniqueSuffix}${ext}`);
    }
});

// File filter for avatars
const avatarFilter = (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMime.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid image format. Allowed: JPG, PNG, WEBP, GIF'), false);
    }
};

// File filter for chat media (images & audio)
const mediaFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm' || file.mimetype === 'audio/webm';

    if (isImage || isAudio) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type. Only image and audio files are allowed.'), false);
    }
};

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadMedia = multer({
    storage: mediaStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

module.exports = {
    uploadAvatar,
    uploadMedia
};

