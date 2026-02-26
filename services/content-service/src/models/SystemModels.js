const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Archive = sequelize.define('Archive', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        contentType: {
            type: DataTypes.ENUM('post', 'comment', 'blog', 'video', 'wiki'),
            allowNull: false
        },
        contentId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        contentData: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        archivedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });

    const ContentVersion = sequelize.define('ContentVersion', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        contentType: {
            type: DataTypes.ENUM('post', 'blog', 'video', 'wiki', 'doc', 'project', 'page', 'image', 'comment'),
            allowNull: false
        },
        contentId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        versionNumber: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        editedBy: {
            type: DataTypes.UUID,
            allowNull: false
        }
    });

    return { Archive, ContentVersion };
};
