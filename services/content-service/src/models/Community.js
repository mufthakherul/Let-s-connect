const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Community = sequelize.define('Community', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: DataTypes.TEXT,
        rules: DataTypes.ARRAY(DataTypes.TEXT),
        category: {
            type: DataTypes.STRING,
            defaultValue: 'general'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false
        },
        members: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        visibility: {
            type: DataTypes.ENUM('public', 'private', 'restricted'),
            defaultValue: 'public'
        }
    });

    const CommunityMember = sequelize.define('CommunityMember', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        communityId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('member', 'moderator', 'admin'),
            defaultValue: 'member'
        }
    });

    return { Community, CommunityMember };
};
