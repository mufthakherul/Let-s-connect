const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Vote = sequelize.define('Vote', {
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
        value: {
            type: DataTypes.INTEGER, // 1 for upvote, -1 for downvote
            allowNull: false
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['postId', 'userId']
            }
        ]
    });

    return Vote;
};
