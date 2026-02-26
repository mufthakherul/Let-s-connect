const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Endorsement = sequelize.define('Endorsement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    skillId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Skills', key: 'id' }
    },
    endorserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    }
}, {
    timestamps: true
});

module.exports = Endorsement;
