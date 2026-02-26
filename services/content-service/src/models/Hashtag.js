const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Hashtag = sequelize.define('Hashtag', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tag: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        postCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });

    const PostHashtag = sequelize.define('PostHashtag', {
        postId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        hashtagId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['postId', 'hashtagId']
            }
        ]
    });

    return { Hashtag, PostHashtag };
};
