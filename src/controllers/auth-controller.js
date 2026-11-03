const { StatusCodes } = require('http-status-codes');
const { UserService } = require('../services');
const { successResponse, errorResponse } = require('../utils');

const userService = new UserService();

const register = async (req, res) => {
    try {
        const result = await userService.register(req.body);

        // Store JWT in HTTP-only cookie for secure browser sessions
        res.cookie('token', result.token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(StatusCodes.CREATED).json(
            successResponse('User registered successfully', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const login = async (req, res) => {
    try {
        const result = await userService.login(req.body);

        res.cookie('token', result.token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(StatusCodes.OK).json(
            successResponse('User logged in successfully', result)
        );
    } catch (error) {
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse(error.message, [error.explanation || error.message]));
    }
};

const logout = async (req, res) => {
    try {
        res.clearCookie('token');
        if (req.accepts('html') && !req.path.startsWith('/api')) {
            return res.redirect('/login');
        }
        return res.status(StatusCodes.OK).json(
            successResponse('Logged out successfully', {})
        );
    } catch (error) {
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse('Logout failed', [error.message]));
    }
};

module.exports = {
    register,
    login,
    logout
};

