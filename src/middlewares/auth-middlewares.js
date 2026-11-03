const { StatusCodes } = require('http-status-codes');
const { verifyToken, errorResponse } = require('../utils');
const { User } = require('../models');

const validateRegisterRequest = (req, res, next) => {
    const { name, username, email, password } = req.body;
    const errors = [];
    if (!name || name.trim() === '') errors.push('Name is required');
    if (!username || username.trim() === '') errors.push('Username is required');
    if (!email || email.trim() === '') errors.push('Email is required');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters long');

    if (errors.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json(errorResponse('Validation error', errors));
    }
    next();
};

const validateAuthRequest = (req, res, next) => {
    if (!req.body.email) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json(errorResponse('Validation error', ['Email is required']));
    }
    if (!req.body.password) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json(errorResponse('Validation error', ['Password is required']));
    }
    next();
};

const extractToken = (req) => {
    let token = null;
    const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
    if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    return token;
};

const checkAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            if (req.accepts('html') && !req.path.startsWith('/api')) {
                return res.redirect('/login');
            }
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json(errorResponse('Authentication failed', ['Missing authentication token']));
        }

        const decoded = verifyToken(token);
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'name', 'username', 'email', 'profile_picture_url', 'is_online', 'last_seen_at']
        });

        if (!user) {
            if (req.accepts('html') && !req.path.startsWith('/api')) {
                res.clearCookie('token');
                return res.redirect('/login');
            }
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json(errorResponse('Authentication failed', ['User no longer exists']));
        }

        req.user = user.toJSON();
        res.locals.currentUser = req.user;
        next();
    } catch (error) {
        if (req.accepts('html') && !req.path.startsWith('/api')) {
            res.clearCookie('token');
            return res.redirect('/login');
        }
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json(errorResponse('Authentication failed', [error.message || 'Invalid token']));
    }
};

const redirectIfAuthenticated = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return next();
    }
    try {
        verifyToken(token);
        return res.redirect('/');
    } catch (error) {
        res.clearCookie('token');
        return next();
    }
};

module.exports = {
    validateRegisterRequest,
    validateAuthRequest,
    checkAuth,
    redirectIfAuthenticated,
    extractToken
};
