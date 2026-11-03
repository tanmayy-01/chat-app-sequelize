const { ConversationRepository, UserRepository, MessageRepository } = require('../repositories');
const { AppError } = require('../utils');
const { StatusCodes } = require('http-status-codes');

class ConversationService {
    constructor() {
        this.conversationRepository = new ConversationRepository();
        this.userRepository = new UserRepository();
        this.messageRepository = new MessageRepository();
    }

    async getOrCreateDirectConversation(userId, partnerId) {
        if (Number(userId) === Number(partnerId)) {
            throw new AppError('Cannot start a direct conversation with yourself', StatusCodes.BAD_REQUEST);
        }

        const partner = await this.userRepository.get(partnerId);
        if (!partner) {
            throw new AppError('User not found', StatusCodes.NOT_FOUND);
        }

        let conversation = await this.conversationRepository.findDirectConversation(userId, partnerId);

        if (!conversation) {
            conversation = await this.conversationRepository.create({
                type: 'direct',
                creator_id: userId
            });

            await this.conversationRepository.addParticipant(conversation.id, userId, 'member');
            await this.conversationRepository.addParticipant(conversation.id, partnerId, 'member');
        }

        return await this.conversationRepository.getConversationWithDetails(conversation.id);
    }

    async createGroupConversation(creatorId, groupData, file = null) {
        const { title, description, memberIds } = groupData;
        if (!title || title.trim() === '') {
            throw new AppError('Group title is required', StatusCodes.BAD_REQUEST);
        }

        const avatarUrl = file ? `/uploads/avatars/${file.filename}` : '/images/default-group.svg';

        const conversation = await this.conversationRepository.create({
            type: 'group',
            title: title.trim(),
            description: description || '',
            group_avatar_url: avatarUrl,
            creator_id: creatorId
        });

        // Add creator as admin
        await this.conversationRepository.addParticipant(conversation.id, creatorId, 'admin');

        // Parse member IDs if provided
        let membersToAdd = [];
        if (memberIds) {
            if (Array.isArray(memberIds)) {
                membersToAdd = memberIds;
            } else if (typeof memberIds === 'string') {
                try {
                    membersToAdd = JSON.parse(memberIds);
                } catch (e) {
                    membersToAdd = memberIds.split(',').map(id => id.trim());
                }
            }
        }

        for (const memberId of membersToAdd) {
            if (Number(memberId) !== Number(creatorId)) {
                await this.conversationRepository.addParticipant(conversation.id, memberId, 'member');
            }
        }

        // Add system message: "Group created"
        const creator = await this.userRepository.get(creatorId);
        await this.messageRepository.create({
            conversation_id: conversation.id,
            sender_id: null,
            message_type: 'system',
            content: `${creator.name} created the group "${title}"`
        });

        return await this.conversationRepository.getConversationWithDetails(conversation.id);
    }

    async getUserConversations(userId) {
        return await this.conversationRepository.getUserConversations(userId, this.messageRepository);
    }

    async getConversationDetails(conversationId, userId) {
        const isMember = await this.conversationRepository.isParticipant(conversationId, userId);
        if (!isMember) {
            throw new AppError('You are not a member of this conversation', StatusCodes.FORBIDDEN);
        }

        return await this.conversationRepository.getConversationWithDetails(conversationId);
    }

    async joinGroup(conversationId, userId) {
        const conversation = await this.conversationRepository.get(conversationId);
        if (!conversation || conversation.type !== 'group') {
            throw new AppError('Group conversation not found', StatusCodes.NOT_FOUND);
        }

        const user = await this.userRepository.get(userId);
        const participant = await this.conversationRepository.addParticipant(conversationId, userId, 'member');

        // Create system message
        const systemMessage = await this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: null,
            message_type: 'system',
            content: `${user.name} joined the group`
        });

        return { conversation, user, systemMessage, participant };
    }

    async leaveGroup(conversationId, userId) {
        const conversation = await this.conversationRepository.get(conversationId);
        if (!conversation || conversation.type !== 'group') {
            throw new AppError('Group conversation not found', StatusCodes.NOT_FOUND);
        }

        const user = await this.userRepository.get(userId);
        await this.conversationRepository.removeParticipant(conversationId, userId);

        // Create system message
        const systemMessage = await this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: null,
            message_type: 'system',
            content: `${user.name} left the group`
        });

        return { conversation, user, systemMessage };
    }

    async addMemberToGroup(conversationId, targetUserId, requesterId) {
        const conversation = await this.conversationRepository.get(conversationId);
        if (!conversation || conversation.type !== 'group') {
            throw new AppError('Group not found', StatusCodes.NOT_FOUND);
        }

        const requester = await this.conversationRepository.getParticipant(conversationId, requesterId);
        if (!requester || requester.left_at) {
            throw new AppError('You are not a member of this group', StatusCodes.FORBIDDEN);
        }

        const targetUser = await this.userRepository.get(targetUserId);
        if (!targetUser) {
            throw new AppError('User to add was not found', StatusCodes.NOT_FOUND);
        }

        await this.conversationRepository.addParticipant(conversationId, targetUserId, 'member');

        const systemMessage = await this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: null,
            message_type: 'system',
            content: `${targetUser.name} was added to the group`
        });

        return { conversation, targetUser, systemMessage };
    }

    async markAsRead(conversationId, userId, messageId) {
        return await this.conversationRepository.updateLastRead(conversationId, userId, messageId);
    }
}

module.exports = ConversationService;

