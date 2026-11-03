const express = require('express');
const { MessageController } = require('../../controllers');
const { checkAuth, uploadMedia } = require('../../middlewares');

const router = express.Router();

router.use(checkAuth);

router.get('/conversations/:conversationId/messages', MessageController.getMessages);
router.post('/conversations/:conversationId/messages', uploadMedia.single('media'), MessageController.sendMessage);
router.put('/messages/:id', MessageController.editMessage);
router.delete('/messages/:id', MessageController.deleteMessage);
router.post('/messages/:id/reactions', MessageController.reactToMessage);
router.get('/messages/search', MessageController.searchMessages);

module.exports = router;

