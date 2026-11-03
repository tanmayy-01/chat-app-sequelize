const { MessageRepository, ConversationRepository } = require('../repositories');
const { AppError } = require('../utils');
const { StatusCodes } = require('http-status-codes');

class MessageService {
    constructor() {
        this.messageRepository = new MessageRepository();
        this.conversationRepository = new ConversationRepository();
    }

    async sendMessage(conversationId, senderId, messageData, file = null) {
        // Ensure user is participant
        const isParticipant = await this.conversationRepository.isParticipant(conversationId, senderId);
        if (!isParticipant) {
            throw new AppError('You are not a member of this conversation', StatusCodes.FORBIDDEN);
        }

        let messageType = messageData.message_type || 'text';
        let mediaUrl = null;
        let mediaOriginalName = null;
        let mediaMimeType = null;
        let mediaSize = null;

        if (file) {
            mediaUrl = `/uploads/media/${file.filename}`;
            mediaOriginalName = file.originalname;
            mediaMimeType = file.mimetype;
            mediaSize = file.size;

            if (file.mimetype.startsWith('image/')) {
                messageType = 'image';
            } else if (file.mimetype.startsWith('audio/') || file.mimetype.includes('webm')) {
                messageType = 'audio';
            }
        }

        if (messageType === 'text' && (!messageData.content || messageData.content.trim() === '')) {
            throw new AppError('Message content cannot be empty', StatusCodes.BAD_REQUEST);
        }

        const message = await this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: senderId,
            message_type: messageType,
            content: messageData.content ? messageData.content.trim() : null,
            media_url: mediaUrl,
            media_original_name: mediaOriginalName,
            media_mime_type: mediaMimeType,
            media_size: mediaSize
        });

        // Touch the conversation updatedAt so it floats to the top of recent chats
        const conversation = await this.conversationRepository.get(conversationId);
        conversation.changed('updatedAt', true);
        await conversation.save();

        // Sender automatically marks this message as read
        await this.conversationRepository.updateLastRead(conversationId, senderId, message.id);

        return await this.messageRepository.getMessageWithReactions(message.id);
    }

    async getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
        const isParticipant = await this.conversationRepository.isParticipant(conversationId, userId);
        if (!isParticipant) {
            throw new AppError('You are not a member of this conversation', StatusCodes.FORBIDDEN);
        }

        const messages = await this.messageRepository.getConversationMessages(conversationId, Number(limit), Number(offset));

        // Mark the latest message as read
        if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            await this.conversationRepository.updateLastRead(conversationId, userId, latestMessage.id);
        }

        return messages;
    }

    async editMessage(messageId, userId, newContent) {
        if (!newContent || newContent.trim() === '') {
            throw new AppError('Edited content cannot be empty', StatusCodes.BAD_REQUEST);
        }

        const message = await this.messageRepository.get(messageId);
        if (!message) {
            throw new AppError('Message not found', StatusCodes.NOT_FOUND);
        }

        if (message.sender_id !== userId) {
            throw new AppError('You can only edit your own messages', StatusCodes.FORBIDDEN);
        }

        if (message.is_deleted) {
            throw new AppError('Cannot edit a deleted message', StatusCodes.BAD_REQUEST);
        }

        if (message.message_type !== 'text') {
            throw new AppError('Only text messages can be edited', StatusCodes.BAD_REQUEST);
        }

        await this.messageRepository.markEdited(messageId, newContent.trim());
        return await this.messageRepository.getMessageWithReactions(messageId);
    }

    async deleteMessage(messageId, userId) {
        const message = await this.messageRepository.get(messageId);
        if (!message) {
            throw new AppError('Message not found', StatusCodes.NOT_FOUND);
        }

        // Check if user is the sender or a group admin
        let canDelete = message.sender_id === userId;

        if (!canDelete) {
            const participant = await this.conversationRepository.getParticipant(message.conversation_id, userId);
            if (participant && participant.role === 'admin') {
                canDelete = true;
            }
        }

        if (!canDelete) {
            throw new AppError('You do not have permission to delete this message', StatusCodes.FORBIDDEN);
        }

        await this.messageRepository.markDeleted(messageId);
        return await this.messageRepository.getMessageWithReactions(messageId);
    }

    async reactToMessage(messageId, userId, emoji) {
        if (!emoji) {
            throw new AppError('Emoji is required', StatusCodes.BAD_REQUEST);
        }

        const message = await this.messageRepository.get(messageId);
        if (!message) {
            throw new AppError('Message not found', StatusCodes.NOT_FOUND);
        }

        const isParticipant = await this.conversationRepository.isParticipant(message.conversation_id, userId);
        if (!isParticipant) {
            throw new AppError('You are not a participant in this conversation', StatusCodes.FORBIDDEN);
        }

        const reactionResult = await this.messageRepository.addReaction(messageId, userId, emoji);
        const updatedMessage = await this.messageRepository.getMessageWithReactions(messageId);

        return {
            result: reactionResult,
            message: updatedMessage
        };
    }

    async searchMessages(userId, query) {
        const userConversations = await this.conversationRepository.participantRepository.getUserParticipations(userId);
        const conversationIds = userConversations.map(p => p.conversation_id);
        return await this.messageRepository.searchMessagesInConversations(conversationIds, query);
    }
}

module.exports = MessageService;

