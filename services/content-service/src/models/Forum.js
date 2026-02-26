const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ForumPost = sequelize.define('ForumPost', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        category: {
            type: DataTypes.ENUM('Discussion', 'Bug Report', 'Feature Request', 'General'),
            defaultValue: 'Discussion'
        },
        votes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        isSolved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    const ForumReply = sequelize.define('ForumReply', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        forumPostId: {
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
        isAcceptedSolution: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    return { ForumPost, ForumReply };
};
