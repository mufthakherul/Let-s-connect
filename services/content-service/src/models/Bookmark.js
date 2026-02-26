const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Bookmark = sequelize.define('Bookmark', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        itemType: {
            type: DataTypes.ENUM('post', 'video', 'article', 'product'),
            allowNull: false
        },
        itemId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        title: DataTypes.STRING,
        content: DataTypes.TEXT,
        metadata: DataTypes.JSONB
    }, {
        indexes: [
            {
                unique: true,
                fields: ['userId', 'itemType', 'itemId']
            }
        ]
    });

    return Bookmark;
};
