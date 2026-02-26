const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Award = sequelize.define('Award', {
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
        icon: DataTypes.STRING,
        cost: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        type: {
            type: DataTypes.ENUM('gold', 'silver', 'platinum', 'custom'),
            defaultValue: 'silver'
        }
    });

    const PostAward = sequelize.define('PostAward', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        postId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        awardId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        givenBy: {
            type: DataTypes.UUID,
            allowNull: false
        },
        message: DataTypes.TEXT
    }, {
        indexes: [
            {
                unique: true,
                fields: ['postId', 'awardId', 'givenBy']
            }
        ]
    });

    return { Award, PostAward };
};
