const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const PageView = sequelize.define('PageView', {
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
        comment: 'Viewer user ID (null for anonymous)'
    },
    viewDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['pageId', 'viewDate'] },
        { fields: ['pageId', 'userId', 'viewDate'], unique: true }
    ]
});

module.exports = PageView;
