'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has many conversation participants (memberships)
      User.hasMany(models.ConversationParticipant, {
        foreignKey: 'user_id',
        as: 'participations'
      });

      // User participates in many conversations
      User.belongsToMany(models.Conversation, {
        through: models.ConversationParticipant,
        foreignKey: 'user_id',
        otherKey: 'conversation_id',
        as: 'conversations'
      });

      // User created conversations (e.g. groups)
      User.hasMany(models.Conversation, {
        foreignKey: 'creator_id',
        as: 'createdConversations'
      });

      // User sent messages
      User.hasMany(models.Message, {
        foreignKey: 'sender_id',
        as: 'messages'
      });

      // User reactions
      User.hasMany(models.MessageReaction, {
        foreignKey: 'user_id',
        as: 'reactions'
      });

      // User notifications
      User.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications'
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      profile_picture_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      push_token: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true
    }
  );

  return User;
};
