const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    token: {
        type: DataTypes.STRING(512),
        allowNull: false,
        unique: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['token'] },
        { fields: ['userId'] }
    ]
});

module.exports = RefreshToken;
