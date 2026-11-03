const { UserRepository } = require('../repositories');
const { AppError, hashPassword, comparePassword, generateToken } = require('../utils');
const { StatusCodes } = require('http-status-codes');

class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async register(userData) {
        // Check if email already registered
        const existingEmail = await this.userRepository.getUserByEmail(userData.email);
        if (existingEmail) {
            throw new AppError('An account with this email already exists', StatusCodes.CONFLICT);
        }

        // Check if username already exists
        const existingUsername = await this.userRepository.getUserByUsername(userData.username);
        if (existingUsername) {
            throw new AppError('This username is already taken', StatusCodes.CONFLICT);
        }

        // Hash password
        const hashedPassword = await hashPassword(userData.password);

        const newUser = await this.userRepository.create({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            profile_picture_url: userData.profile_picture_url || '/images/default-avatar.svg'
        });

        const token = generateToken({
            id: newUser.id,
            email: newUser.email,
            username: newUser.username
        });

        const userResponse = newUser.toJSON();
        delete userResponse.password;

        return { user: userResponse, token };
    }

    async login(credentials) {
        const user = await this.userRepository.getUserByEmail(credentials.email);
        if (!user) {
            throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        const isMatch = await comparePassword(credentials.password, user.password);
        if (!isMatch) {
            throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            username: user.username
        });

        const userResponse = user.toJSON();
        delete userResponse.password;

        return { user: userResponse, token };
    }

    async getProfile(userId) {
        const user = await this.userRepository.get(userId, {
            attributes: ['id', 'name', 'username', 'email', 'profile_picture_url', 'is_online', 'last_seen_at']
        });
        return user;
    }

    async updateProfile(userId, updateData, file = null) {
        const user = await this.userRepository.get(userId);

        if (updateData.username && updateData.username !== user.username) {
            const existing = await this.userRepository.getUserByUsername(updateData.username);
            if (existing && existing.id !== userId) {
                throw new AppError('Username is already taken', StatusCodes.CONFLICT);
            }
            user.username = updateData.username;
        }

        if (updateData.name) {
            user.name = updateData.name;
        }

        if (file) {
            user.profile_picture_url = `/uploads/avatars/${file.filename}`;
        } else if (updateData.profile_picture_url) {
            user.profile_picture_url = updateData.profile_picture_url;
        }

        await user.save();

        const updated = user.toJSON();
        delete updated.password;
        return updated;
    }

    async searchUsers(query, currentUserId) {
        return await this.userRepository.searchUsers(query, currentUserId);
    }

    async updatePushToken(userId, pushToken) {
        const user = await this.userRepository.get(userId);
        user.push_token = pushToken;
        await user.save();
        return true;
    }
}

module.exports = UserService;

