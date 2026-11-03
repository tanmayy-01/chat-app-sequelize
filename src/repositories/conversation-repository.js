const CrudRepository = require('./crud-repository');
const { Conversation, ConversationParticipant, User, Message } = require('../models');
const ConversationParticipantRepository = require('./conversation-participant-repository');
const { Op } = require('sequelize');

class ConversationRepository extends CrudRepository {
    constructor() {
        super(Conversation);
        this.participantRepository = new ConversationParticipantRepository();
    }

    async findDirectConversation(user1Id, user2Id) {
        const conversations = await this.getAll({
            where: { type: 'direct' },
            include: [
                {
                    model: ConversationParticipant,
                    as: 'participants',
                    where: {
                        user_id: { [Op.in]: [user1Id, user2Id] }
                    }
                }
            ]
        });

        for (const convo of conversations) {
            if (convo.participants && convo.participants.length === 2) {
                const userIds = convo.participants.map(p => p.user_id);
                if (userIds.includes(Number(user1Id)) && userIds.includes(Number(user2Id))) {
                    return convo;
                }
            }
        }
        return null;
    }

    async getUserConversations(userId, messageRepository) {
        // Re-use participantRepository.getUserParticipations
        const userParticipations = await this.participantRepository.getUserParticipations(userId);

        if (!userParticipations || userParticipations.length === 0) {
            return [];
        }

        const convoMap = new Map();
        userParticipations.forEach(p => {
            convoMap.set(p.conversation_id, {
                lastReadMessageId: p.last_read_message_id || 0,
                role: p.role
            });
        });

        const conversationIds = Array.from(convoMap.keys());

        // Re-use this.getAll
        const conversations = await this.getAll({
            where: {
                id: { [Op.in]: conversationIds }
            },
            include: [
                {
                    model: ConversationParticipant,
                    as: 'participants',
                    where: { left_at: null },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'username', 'profile_picture_url', 'is_online', 'last_seen_at']
                        }
                    ]
                },
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    include: [
                        {
                            model: User,
                            as: 'sender',
                            attributes: ['id', 'name', 'username']
                        }
                    ]
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        // Compute unread counts reusing messageRepository.countUnreadMessages if provided
        const result = await Promise.all(conversations.map(async (c) => {
            const rawConvo = c.toJSON();
            const participantInfo = convoMap.get(c.id);
            const lastReadId = participantInfo ? participantInfo.lastReadMessageId : 0;

            let unreadCount = 0;
            if (messageRepository) {
                unreadCount = await messageRepository.countUnreadMessages(c.id, lastReadId, userId);
            } else {
                unreadCount = await Message.count({
                    where: {
                        conversation_id: c.id,
                        id: { [Op.gt]: lastReadId },
                        sender_id: { [Op.ne]: userId },
                        is_deleted: false
                    }
                });
            }

            rawConvo.unread_count = unreadCount;
            rawConvo.last_message = rawConvo.messages && rawConvo.messages.length > 0 ? rawConvo.messages[0] : null;
            delete rawConvo.messages;

            if (rawConvo.type === 'direct') {
                const partnerParticipant = rawConvo.participants.find(p => p.user_id !== userId);
                rawConvo.partner = partnerParticipant ? partnerParticipant.user : null;
            }

            return rawConvo;
        }));

        result.sort((a, b) => {
            const timeA = a.last_message ? new Date(a.last_message.createdAt).getTime() : new Date(a.updatedAt).getTime();
            const timeB = b.last_message ? new Date(b.last_message.createdAt).getTime() : new Date(b.updatedAt).getTime();
            return timeB - timeA;
        });

        return result;
    }

    async getConversationWithDetails(conversationId) {
        // Re-use this.get from CrudRepository
        return await this.get(conversationId, {
            include: [
                {
                    model: ConversationParticipant,
                    as: 'participants',
                    where: { left_at: null },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'username', 'email', 'profile_picture_url', 'is_online', 'last_seen_at']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                }
            ]
        });
    }

    async addParticipant(conversationId, userId, role = 'member') {
        return await this.participantRepository.addParticipant(conversationId, userId, role);
    }

    async removeParticipant(conversationId, userId) {
        return await this.participantRepository.removeParticipant(conversationId, userId);
    }

    async updateLastRead(conversationId, userId, messageId) {
        return await this.participantRepository.updateLastRead(conversationId, userId, messageId);
    }

    async isParticipant(conversationId, userId) {
        return await this.participantRepository.isParticipant(conversationId, userId);
    }

    async getParticipant(conversationId, userId) {
        return await this.participantRepository.getParticipant(conversationId, userId);
    }
}

module.exports = ConversationRepository;
