const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const ContentFlag = sequelize.define('ContentFlag', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    contentType: {
        type: DataTypes.ENUM('post', 'comment', 'message', 'user', 'page', 'video'),
        allowNull: false
    },
    contentId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    reporterId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    reason: {
        type: DataTypes.ENUM(
            'spam', 'harassment', 'hate_speech', 'violence',
            'adult_content', 'misinformation', 'copyright', 'other'
        ),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
        defaultValue: 'pending'
    },
    reviewedBy: {
        type: DataTypes.UUID,
        references: { model: 'Users', key: 'id' }
    },
    resolution: {
        type: DataTypes.TEXT
    },
    resolvedAt: {
        type: DataTypes.DATE
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['status'] },
        { fields: ['contentType', 'contentId'] },
        { fields: ['reporterId'] }
    ]
});

module.exports = ContentFlag;
