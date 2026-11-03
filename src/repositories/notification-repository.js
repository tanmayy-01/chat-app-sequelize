const CrudRepository = require('./crud-repository');
const { Notification } = require('../models');

class NotificationRepository extends CrudRepository {
    constructor() {
        super(Notification);
    }

    async getUserNotifications(userId, limit = 20) {
        return await this.getAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            limit
        });
    }

    async getUnreadCount(userId) {
        return await this.count({
            where: { user_id: userId, is_read: false }
        });
    }

    async markAsRead(notificationId, userId) {
        const notification = await this.findOne({
            where: { id: notificationId, user_id: userId }
        });
        if (notification) {
            return await this.update(notification.id, { is_read: true });
        }
        return null;
    }

    async markAllAsRead(userId) {
        return await this.model.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } }
        );
    }
}

module.exports = NotificationRepository;
