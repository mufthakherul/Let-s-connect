const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserFollow = sequelize.define('UserFollow', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        followerId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        followedId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['followerId', 'followedId']
            }
        ]
    });

    return UserFollow;
};
