const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Page = sequelize.define('Page', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: DataTypes.TEXT,
    category: DataTypes.STRING,
    avatarUrl: DataTypes.STRING,
    coverUrl: DataTypes.STRING,
    followers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true
});

module.exports = Page;
