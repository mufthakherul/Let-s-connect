const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Friend = sequelize.define('Friend', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    friendId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    status: {
        type: DataTypes.ENUM('active', 'blocked'),
        defaultValue: 'active'
    },
    type: {
        // Discriminates symmetric friendships from asymmetric follows.
        // NOTE: when running against an existing DB, ensure a migration adds this column
        // with DEFAULT 'friend' so existing rows are not invalidated.
        type: DataTypes.ENUM('friend', 'follow'),
        defaultValue: 'friend'
    },
    closeFriend: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'friendId']
        },
        { fields: ['userId'] },
        { fields: ['friendId'] }
    ]
});

module.exports = Friend;
