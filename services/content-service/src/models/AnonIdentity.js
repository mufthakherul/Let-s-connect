const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AnonIdentity = sequelize.define('AnonIdentity', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        communityId: DataTypes.UUID,
        handle: {
            type: DataTypes.STRING,
            allowNull: false
        },
        avatarUrl: DataTypes.STRING,
        mappingHash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        mappingCiphertext: {
            type: DataTypes.TEXT
        },
        revokedAt: DataTypes.DATE,
        zeroizedAt: DataTypes.DATE
    });

    return AnonIdentity;
};
