'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationParticipant extends Model {
    static associate(models) {
      ConversationParticipant.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id',
        as: 'conversation'
      });

      ConversationParticipant.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      ConversationParticipant.belongsTo(models.Message, {
        foreignKey: 'last_read_message_id',
        as: 'lastReadMessage'
      });
    }
  }

  ConversationParticipant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('admin', 'member'),
        allowNull: false,
        defaultValue: 'member'
      },
      last_read_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      left_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'ConversationParticipant',
      tableName: 'ConversationParticipants',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['conversation_id', 'user_id']
        }
      ]
    }
  );

  return ConversationParticipant;
};
