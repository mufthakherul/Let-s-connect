const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const PageInsight = sequelize.define('PageInsight', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    pageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Pages', key: 'id' }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    totalViews: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    uniqueViewers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    newFollowers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    unfollows: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    postReach: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    postEngagement: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total likes + comments + shares'
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['pageId', 'date']
        }
    ]
});

module.exports = PageInsight;
