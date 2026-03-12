const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Post = sequelize.define('Post', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        communityId: DataTypes.UUID,
        groupId: DataTypes.UUID,
        pageId: DataTypes.UUID,
        parentId: DataTypes.UUID,
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('text', 'image', 'video', 'link'),
            defaultValue: 'text'
        },
        mediaUrls: DataTypes.ARRAY(DataTypes.STRING),
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        comments: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        shares: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        visibility: {
            type: DataTypes.ENUM('public', 'friends', 'private'),
            defaultValue: 'public'
        },
        isAnonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        anonIdentityId: DataTypes.UUID,
        isPublished: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        flairId: DataTypes.UUID,
        repostOf: DataTypes.UUID,
        toxicityScore: {
            type: DataTypes.FLOAT,
            allowNull: true,
            comment: 'AI-generated toxicity score 0.0–1.0'
        },
        isFlagged: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Flagged by AI moderation or manual report'
        },
        flagReason: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        indexes: [
            { fields: ['userId'] },
            { fields: ['communityId'] },
            { fields: ['groupId'] },
            { fields: ['createdAt'] }
        ]
    });

    return Post;
};
