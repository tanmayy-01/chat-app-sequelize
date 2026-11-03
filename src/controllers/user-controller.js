const { StatusCodes } = require('http-status-codes');
const { UserService } = require('../services');
const { successResponse, errorResponse } = require('../utils');

const userService = new UserService();

const getProfile = async (req, res) => {
    try {
        const user = await userService.getProfile(req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('User profile fetched successfully', user)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const updateProfile = async (req, res) => {
    try {
        const updatedUser = await userService.updateProfile(req.user.id, req.body, req.file);
        return res.status(StatusCodes.OK).json(
            successResponse('Profile updated successfully', updatedUser)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const users = await userService.searchUsers(query, req.user.id);
        return res.status(StatusCodes.OK).json(
            successResponse('Users retrieved successfully', users)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const updatePushToken = async (req, res) => {
    try {
        const { push_token } = req.body;
        await userService.updatePushToken(req.user.id, push_token);
        return res.status(StatusCodes.OK).json(
            successResponse('Push token updated successfully', {})
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

module.exports = {
    getProfile,
    updateProfile,
    searchUsers,
    updatePushToken
};

