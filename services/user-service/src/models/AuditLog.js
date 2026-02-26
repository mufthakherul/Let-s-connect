const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    adminId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    action: {
        type: DataTypes.ENUM(
            'user_ban', 'user_unban', 'user_role_change',
            'content_delete', 'content_moderate', 'content_flag',
            'system_config_change', 'data_export', 'other'
        ),
        allowNull: false
    },
    targetType: {
        type: DataTypes.STRING
    },
    targetId: {
        type: DataTypes.UUID
    },
    details: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    ipAddress: {
        type: DataTypes.STRING
    },
    userAgent: {
        type: DataTypes.TEXT
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['adminId'] },
        { fields: ['action'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = AuditLog;
