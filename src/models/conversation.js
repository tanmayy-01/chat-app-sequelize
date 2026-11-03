'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      // Creator of conversation (for group chats)
      Conversation.belongsTo(models.User, {
        foreignKey: 'creator_id',
        as: 'creator'
      });

      // Conversation has many participants
      Conversation.hasMany(models.ConversationParticipant, {
        foreignKey: 'conversation_id',
        as: 'participants'
      });

      // Members through participants
      Conversation.belongsToMany(models.User, {
        through: models.ConversationParticipant,
        foreignKey: 'conversation_id',
        otherKey: 'user_id',
        as: 'members'
      });

      // Messages in conversation
      Conversation.hasMany(models.Message, {
        foreignKey: 'conversation_id',
        as: 'messages'
      });
    }
  }

  Conversation.init(
    {
      type: {
        type: DataTypes.ENUM('direct', 'group'),
        allowNull: false,
        defaultValue: 'direct'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      group_avatar_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Conversation',
      tableName: 'Conversations',
      timestamps: true
    }
  );

  return Conversation;
};
