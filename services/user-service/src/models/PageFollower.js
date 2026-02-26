const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const PageFollower = sequelize.define('PageFollower', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    pageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Pages', key: 'id' }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    notificationsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['pageId', 'userId']
        },
        { fields: ['pageId'] },
        { fields: ['userId'] }
    ]
});

module.exports = PageFollower;
