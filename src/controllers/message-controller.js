const { StatusCodes } = require('http-status-codes');
const { MessageService } = require('../services');
const { successResponse, errorResponse } = require('../utils');

const messageService = new MessageService();

const sendMessage = async (req, res) => {
    try {
        const conversationId = req.params.conversationId || req.body.conversation_id;
        const message = await messageService.sendMessage(conversationId, req.user.id, req.body, req.file);

        if (req.io) {
            req.io.to(`conversation_${conversationId}`).emit('new_message', {
                conversationId: Number(conversationId),
                message
            });
        }

        return res.status(StatusCodes.CREATED).json(
            successResponse('Message sent successfully', message)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const getMessages = async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const messages = await messageService.getConversationMessages(
            req.params.conversationId,
            req.user.id,
            limit,
            offset
        );
        return res.status(StatusCodes.OK).json(
            successResponse('Messages retrieved successfully', messages)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const editMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const message = await messageService.editMessage(req.params.id, req.user.id, content);
        return res.status(StatusCodes.OK).json(
            successResponse('Message edited successfully', message)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const deleteMessage = async (req, res) => {
    try {
        const message = await messageService.deleteMessage(req.params.id, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Message deleted successfully', message)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const reactToMessage = async (req, res) => {
    try {
        const { emoji } = req.body;
        const result = await messageService.reactToMessage(req.params.id, req.user.id, emoji);
        return res.status(StatusCodes.OK).json(
            successResponse('Reaction processed', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const searchMessages = async (req, res) => {
    try {
        const { query } = req.query;
        const messages = await messageService.searchMessages(req.user.id, query);
        return res.status(StatusCodes.OK).json(
            successResponse('Messages found', messages)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

module.exports = {
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
    reactToMessage,
    searchMessages
};

