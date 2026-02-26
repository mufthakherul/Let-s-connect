const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Video = sequelize.define('Video', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        channelId: DataTypes.UUID,
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: DataTypes.TEXT,
        videoUrl: {
            type: DataTypes.STRING,
            allowNull: false
        },
        thumbnailUrl: DataTypes.STRING,
        duration: DataTypes.INTEGER,
        views: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        visibility: {
            type: DataTypes.ENUM('public', 'private', 'unlisted'),
            defaultValue: 'public'
        },
        category: DataTypes.STRING
    });

    const Channel = sequelize.define('Channel', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: DataTypes.TEXT,
        avatarUrl: DataTypes.STRING,
        bannerUrl: DataTypes.STRING,
        subscribers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });

    const Playlist = sequelize.define('Playlist', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        channelId: DataTypes.UUID,
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: DataTypes.TEXT
    });

    const Subscription = sequelize.define('Subscription', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        channelId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    });

    return { Video, Channel, Playlist, Subscription };
};
