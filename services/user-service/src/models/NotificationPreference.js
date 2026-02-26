const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const NotificationPreference = sequelize.define('NotificationPreference', {
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
    emailNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    pushNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    inAppNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notificationTypes: {
        type: DataTypes.JSONB,
        defaultValue: {
            like: true,
            comment: true,
            follow: true,
            mention: true,
            message: true,
            friend_request: true,
            group_invite: true,
            page_invite: true,
            post_share: true,
            video_upload: true,
            order_status: true,
            system: true
        }
    },
    quietHoursEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    quietHoursStart: {
        type: DataTypes.STRING
    },
    quietHoursEnd: {
        type: DataTypes.STRING
    }
}, {
    timestamps: true
});

module.exports = NotificationPreference;
