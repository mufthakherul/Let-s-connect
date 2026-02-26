const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const PageAdmin = sequelize.define('PageAdmin', {
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
    role: {
        type: DataTypes.ENUM('owner', 'admin', 'editor', 'moderator'),
        defaultValue: 'moderator'
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['pageId', 'userId']
        }
    ]
});

module.exports = PageAdmin;
