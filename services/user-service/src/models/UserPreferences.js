const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const UserPreferences = sequelize.define('UserPreferences', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'Users', key: 'id' }
    },
    autoAcceptMutualFriendRequests: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    friendRequestPrivacy: {
        type: DataTypes.ENUM('everyone', 'friends_of_friends', 'no_one'),
        defaultValue: 'everyone'
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['userId'] }
    ]
});

module.exports = UserPreferences;
