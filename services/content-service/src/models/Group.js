const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Group = sequelize.define('Group', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: DataTypes.TEXT,
        privacy: {
            type: DataTypes.ENUM('public', 'private', 'secret'),
            defaultValue: 'public'
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'general'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false
        },
        memberCount: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        avatarUrl: DataTypes.STRING,
        coverUrl: DataTypes.STRING
    });

    const GroupMember = sequelize.define('GroupMember', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        groupId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('member', 'moderator', 'admin'),
            defaultValue: 'member'
        },
        status: {
            type: DataTypes.ENUM('active', 'pending', 'banned'),
            defaultValue: 'active'
        }
    });

    const GroupInsight = sequelize.define('GroupInsight', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        groupId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        newMembers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        newPosts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalEngagement: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });

    return { Group, GroupMember, GroupInsight };
};
