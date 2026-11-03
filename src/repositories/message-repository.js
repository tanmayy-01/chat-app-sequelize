const CrudRepository = require('./crud-repository');
const { Message, MessageReaction, User } = require('../models');
const MessageReactionRepository = require('./message-reaction-repository');
const { Op } = require('sequelize');

class MessageRepository extends CrudRepository {
    constructor() {
        super(Message);
        this.messageReactionRepository = new MessageReactionRepository();
    }

    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        return await this.getAll({
            where: {
                conversation_id: conversationId
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'profile_picture_url']
                },
                {
                    model: MessageReaction,
                    as: 'reactions',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'username']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'ASC']],
            limit,
            offset
        });
    }

    async getMessageWithReactions(messageId) {
        return await this.get(messageId, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'profile_picture_url']
                },
                {
                    model: MessageReaction,
                    as: 'reactions',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'username']
                        }
                    ]
                }
            ]
        });
    }

    async searchMessagesInConversations(conversationIds, query) {
        if (!conversationIds || conversationIds.length === 0 || !query || query.trim() === '') {
            return [];
        }

        return await this.getAll({
            where: {
                conversation_id: { [Op.in]: conversationIds },
                content: { [Op.like]: `%${query}%` },
                is_deleted: false
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'profile_picture_url']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 30
        });
    }

    async countUnreadMessages(conversationId, lastReadId, excludeUserId) {
        return await this.count({
            where: {
                conversation_id: conversationId,
                id: { [Op.gt]: lastReadId },
                sender_id: { [Op.ne]: excludeUserId },
                is_deleted: false
            }
        });
    }

    async addReaction(messageId, userId, emoji) {
        return await this.messageReactionRepository.toggleReaction(messageId, userId, emoji);
    }

    async markEdited(messageId, content) {
        return await this.update(messageId, {
            content,
            is_edited: true,
            edited_at: new Date()
        });
    }

    async markDeleted(messageId) {
        return await this.update(messageId, {
            is_deleted: true,
            deleted_at: new Date(),
            content: 'This message was deleted',
            media_url: null
        });
    }
}

module.exports = MessageRepository;
