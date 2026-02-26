const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const FriendRequest = sequelize.define('FriendRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
        defaultValue: 'pending'
    },
    message: {
        type: DataTypes.TEXT
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['senderId', 'receiverId']
        },
        { fields: ['senderId'] },
        { fields: ['receiverId'] },
        { fields: ['status'] }
    ]
});

module.exports = FriendRequest;
