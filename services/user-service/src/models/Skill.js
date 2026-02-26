const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Skill = sequelize.define('Skill', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        defaultValue: 'intermediate'
    },
    endorsements: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Skill;
