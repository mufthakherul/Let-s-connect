const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Profile = sequelize.define('Profile', {
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
    headline: DataTypes.STRING,
    pronouns: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    contactEmail: DataTypes.STRING,
    contactPhone: DataTypes.STRING,
    dateOfBirth: DataTypes.DATE,
    location: DataTypes.STRING,
    city: DataTypes.STRING,
    country: DataTypes.STRING,
    timezone: DataTypes.STRING,
    website: DataTypes.STRING,
    portfolioUrl: DataTypes.STRING,
    company: DataTypes.STRING,
    jobTitle: DataTypes.STRING,
    industry: DataTypes.STRING,
    experienceLevel: DataTypes.STRING,
    yearsExperience: DataTypes.INTEGER,
    skills: DataTypes.ARRAY(DataTypes.STRING),
    interests: DataTypes.ARRAY(DataTypes.STRING),
    languages: DataTypes.ARRAY(DataTypes.STRING),
    certifications: DataTypes.ARRAY(DataTypes.STRING),
    education: DataTypes.JSONB,
    socialLinks: DataTypes.JSONB
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] }
    ]
});

module.exports = Profile;
