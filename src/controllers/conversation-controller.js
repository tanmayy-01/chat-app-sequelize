const { StatusCodes } = require('http-status-codes');
const { ConversationService } = require('../services');
const { successResponse, errorResponse } = require('../utils');

const conversationService = new ConversationService();

const getUserConversations = async (req, res) => {
    try {
        const conversations = await conversationService.getUserConversations(req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Conversations fetched successfully', conversations)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const getOrCreateDirect = async (req, res) => {
    try {
        const { partner_id } = req.body;
        if (!partner_id) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse('Partner ID is required', ['partner_id not provided'])
            );
        }

        const conversation = await conversationService.getOrCreateDirectConversation(req.user.id, partner_id);
        return res.status(StatusCodes.OK).json(
            successResponse('Direct conversation retrieved', conversation)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const createGroup = async (req, res) => {
    try {
        const conversation = await conversationService.createGroupConversation(req.user.id, req.body, req.file);
        return res.status(StatusCodes.CREATED).json(
            successResponse('Group created successfully', conversation)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const getConversationDetails = async (req, res) => {
    try {
        const conversation = await conversationService.getConversationDetails(req.params.id, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Conversation details retrieved', conversation)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const joinGroup = async (req, res) => {
    try {
        const result = await conversationService.joinGroup(req.params.id, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Joined group successfully', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const leaveGroup = async (req, res) => {
    try {
        const result = await conversationService.leaveGroup(req.params.id, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Left group successfully', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const addMember = async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse('User ID is required', ['user_id not provided'])
            );
        }

        const result = await conversationService.addMemberToGroup(req.params.id, user_id, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Member added successfully', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const markAsRead = async (req, res) => {
    try {
        const { message_id } = req.body;
        await conversationService.markAsRead(req.params.id, req.user.id, message_id);
        return res.status(StatusCodes.OK).json(
            successResponse('Marked conversation as read', {})
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

module.exports = {
    getUserConversations,
    getOrCreateDirect,
    createGroup,
    getConversationDetails,
    joinGroup,
    leaveGroup,
    addMember,
    markAsRead
};

