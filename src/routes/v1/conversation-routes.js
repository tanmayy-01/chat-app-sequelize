const express = require('express');
const { ConversationController } = require('../../controllers');
const { checkAuth, uploadAvatar } = require('../../middlewares');

const router = express.Router();

router.use(checkAuth);

router.get('/', ConversationController.getUserConversations);
router.post('/direct', ConversationController.getOrCreateDirect);
router.post('/group', uploadAvatar.single('avatar'), ConversationController.createGroup);
router.get('/:id', ConversationController.getConversationDetails);
router.post('/:id/join', ConversationController.joinGroup);
router.post('/:id/leave', ConversationController.leaveGroup);
router.post('/:id/members', ConversationController.addMember);
router.post('/:id/read', ConversationController.markAsRead);

module.exports = router;

