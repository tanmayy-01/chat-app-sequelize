const CrudRepository = require('./crud-repository');
const { MessageReaction } = require('../models');

class MessageReactionRepository extends CrudRepository {
    constructor() {
        super(MessageReaction);
    }

    async findReaction(messageId, userId, emoji) {
        return await this.findOne({
            where: { message_id: messageId, user_id: userId, emoji }
        });
    }

    async toggleReaction(messageId, userId, emoji) {
        const existing = await this.findReaction(messageId, userId, emoji);

        if (existing) {
            await this.destroy(existing.id);
            return { action: 'removed', emoji, message_id: messageId, user_id: userId };
        }

        const reaction = await this.create({
            message_id: messageId,
            user_id: userId,
            emoji
        });

        return { action: 'added', reaction };
    }
}

module.exports = MessageReactionRepository;

