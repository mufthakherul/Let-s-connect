const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Blog = sequelize.define('Blog', {
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
        slug: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        excerpt: DataTypes.TEXT,
        featuredImage: DataTypes.STRING,
        readingTime: DataTypes.INTEGER,
        status: {
            type: DataTypes.ENUM('draft', 'published', 'archived'),
            defaultValue: 'draft'
        },
        publishedAt: DataTypes.DATE,
        views: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });

    const BlogComment = sequelize.define('BlogComment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        blogId: {
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
        isApproved: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    });

    return { Blog, BlogComment };
};
