const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    bio: DataTypes.TEXT,
    avatar: DataTypes.STRING,
    role: {
        type: DataTypes.ENUM('user', 'moderator', 'admin'),
        defaultValue: 'user'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    twoFactorSecret: {
        type: DataTypes.STRING
    },
    backupCodes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    emailVerificationCode: {
        type: DataTypes.STRING
    },
    emailVerificationCodeExpiresAt: {
        type: DataTypes.DATE
    },
    emailVerificationToken: {
        type: DataTypes.STRING
    },
    emailVerificationTokenExpiresAt: {
        type: DataTypes.DATE
    },
    emailVerifiedAt: {
        type: DataTypes.DATE
    },
    lastVerificationSentAt: {
        type: DataTypes.DATE
    },
    deletionPendingAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // OAuth provider fields
    oauthProvider: {
        type: DataTypes.ENUM('local', 'google', 'github', 'discord', 'apple'),
        defaultValue: 'local'
    },
    oauthProviderId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    oauthAccessToken: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

module.exports = User;
