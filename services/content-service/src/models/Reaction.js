const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Reaction = sequelize.define('Reaction', {
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
        type: {
            type: DataTypes.ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry'),
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

    return Reaction;
};
