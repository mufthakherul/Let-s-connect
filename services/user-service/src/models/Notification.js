const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    type: {
        type: DataTypes.ENUM(
            'like', 'comment', 'follow', 'mention', 'message',
            'friend_request', 'group_invite', 'page_invite',
            'post_share', 'video_upload', 'order_status',
            'email', 'system', 'other'
        ),
        allowNull: false,
        defaultValue: 'other'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    actionUrl: {
        type: DataTypes.STRING
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
    },
    expiresAt: {
        type: DataTypes.DATE
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId', 'isRead'] },
        { fields: ['userId', 'createdAt'] },
        { fields: ['type'] }
    ]
});

module.exports = Notification;
