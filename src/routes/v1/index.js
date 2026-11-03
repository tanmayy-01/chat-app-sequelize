const express = require('express');
const { InfoController } = require('../../controllers');
const authRoutes = require('./auth-routes');
const userRoutes = require('./user-routes');
const conversationRoutes = require('./conversation-routes');
const messageRoutes = require('./message-routes');

const router = express.Router();

router.get('/info', InfoController.info);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/', messageRoutes);
router.use('/conversations', conversationRoutes);

module.exports = router;
