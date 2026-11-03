const CrudRepository = require('./crud-repository');
const { ConversationParticipant } = require('../models');

class ConversationParticipantRepository extends CrudRepository {
    constructor() {
        super(ConversationParticipant);
    }

    async getParticipant(conversationId, userId) {
        return await this.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });
    }

    async getActiveParticipant(conversationId, userId) {
        return await this.findOne({
            where: { conversation_id: conversationId, user_id: userId, left_at: null }
        });
    }

    async getUserParticipations(userId) {
        return await this.getAll({
            where: { user_id: userId, left_at: null },
            attributes: ['conversation_id', 'last_read_message_id', 'role']
        });
    }

    async addParticipant(conversationId, userId, role = 'member') {
        const existing = await this.getParticipant(conversationId, userId);

        if (existing) {
            if (existing.left_at) {
                return await this.update(existing.id, {
                    left_at: null,
                    role: role
                });
            }
            return existing;
        }

        return await this.create({
            conversation_id: conversationId,
            user_id: userId,
            role: role
        });
    }

    async removeParticipant(conversationId, userId) {
        const participant = await this.getActiveParticipant(conversationId, userId);
        if (participant) {
            return await this.update(participant.id, {
                left_at: new Date()
            });
        }
        return null;
    }

    async updateLastRead(conversationId, userId, messageId) {
        const participant = await this.getParticipant(conversationId, userId);
        if (participant) {
            if (!participant.last_read_message_id || messageId > participant.last_read_message_id) {
                return await this.update(participant.id, {
                    last_read_message_id: messageId
                });
            }
        }
        return participant;
    }

    async isParticipant(conversationId, userId) {
        const participant = await this.getActiveParticipant(conversationId, userId);
        return !!participant;
    }
}

module.exports = ConversationParticipantRepository;

