const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Comment = sequelize.define('Comment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        postId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        parentId: DataTypes.UUID,
        isAnonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        anonIdentityId: DataTypes.UUID,
        upvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        downvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        score: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        indexes: [
            { fields: ['postId'] },
            { fields: ['userId'] },
            { fields: ['parentId'] },
            { fields: ['createdAt'] }
        ]
    });

    return Comment;
};
