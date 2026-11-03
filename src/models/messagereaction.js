'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MessageReaction extends Model {
    static associate(models) {
      MessageReaction.belongsTo(models.Message, {
        foreignKey: 'message_id',
        as: 'message'
      });

      MessageReaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  MessageReaction.init(
    {
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      emoji: {
        type: DataTypes.STRING(32),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'MessageReaction',
      tableName: 'MessageReactions',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['message_id', 'user_id', 'emoji']
        }
      ]
    }
  );

  return MessageReaction;
};
