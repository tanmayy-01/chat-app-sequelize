const CrudRepository = require('./crud-repository');
const { User } = require('../models');
const { Op } = require('sequelize');

class UserRepository extends CrudRepository {
    constructor() {
        super(User);
    }

    async getUserByEmail(email) {
        return await this.findOne({
            where: { email }
        });
    }

    async getUserByUsername(username) {
        return await this.findOne({
            where: { username }
        });
    }

    async searchUsers(query, excludeUserId) {
        const whereClause = {
            id: { [Op.ne]: excludeUserId }
        };

        if (query && query.trim() !== '') {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${query}%` } },
                { username: { [Op.like]: `%${query}%` } }
            ];
        }

        return await this.getAll({
            where: whereClause,
            attributes: ['id', 'name', 'username', 'email', 'profile_picture_url', 'is_online', 'last_seen_at'],
            limit: 20
        });
    }

    async updateOnlineStatus(userId, isOnline) {
        const updateData = { is_online: isOnline };
        if (!isOnline) {
            updateData.last_seen_at = new Date();
        }
        return await this.update(userId, updateData);
    }
}

module.exports = UserRepository;
