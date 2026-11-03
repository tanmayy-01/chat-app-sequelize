const express = require('express');
const { UserController } = require('../../controllers');
const { checkAuth, uploadAvatar } = require('../../middlewares');

const router = express.Router();

router.use(checkAuth);

router.get('/profile', UserController.getProfile);
router.put('/profile', uploadAvatar.single('avatar'), UserController.updateProfile);
router.get('/search', UserController.searchUsers);
router.post('/push-token', UserController.updatePushToken);

module.exports = router;

