'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id',
        as: 'conversation'
      });

      Message.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });

      Message.hasMany(models.MessageReaction, {
        foreignKey: 'message_id',
        as: 'reactions'
      });
    }
  }

  Message.init(
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
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      message_type: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'system'),
        allowNull: false,
        defaultValue: 'text'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      media_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      media_original_name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      media_mime_type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      media_size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_edited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      edited_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'Messages',
      timestamps: true,
      indexes: [
        {
          fields: ['conversation_id', 'createdAt']
        }
      ]
    }
  );

  return Message;
};
