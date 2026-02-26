const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Retweet = sequelize.define('Retweet', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        originalPostId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        quotedPostId: DataTypes.UUID,
        comment: DataTypes.TEXT,
        quoteText: DataTypes.TEXT,
        isAnonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['userId', 'originalPostId']
            }
        ]
    });

    return Retweet;
};
