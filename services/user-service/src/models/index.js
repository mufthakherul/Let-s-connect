const { Sequelize } = require('sequelize');
require('dotenv').config({ quiet: true });

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/users', {
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Export early so that models requiring this file during circular imports
// can access the Sequelize instance immediately.
module.exports = { sequelize };

// Import Models
const User = require('./User');
const Profile = require('./Profile');
const Skill = require('./Skill');
const Endorsement = require('./Endorsement');
const Page = require('./Page');
const PageAdmin = require('./PageAdmin');
const PageView = require('./PageView');
const PageFollower = require('./PageFollower');
const PageInsight = require('./PageInsight');
const Friend = require('./Friend');
const FriendRequest = require('./FriendRequest');
const UserPreferences = require('./UserPreferences');
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');
const AuditLog = require('./AuditLog');
const ContentFlag = require('./ContentFlag');
const PasswordResetToken = require('./PasswordResetToken');

// Define Relationships
User.hasOne(Profile, { foreignKey: 'userId' });
Profile.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Skill, { foreignKey: 'userId' });
Skill.belongsTo(User, { foreignKey: 'userId' });

Skill.hasMany(Endorsement, { foreignKey: 'skillId' });
Endorsement.belongsTo(Skill, { foreignKey: 'skillId' });

User.hasMany(Page, { foreignKey: 'userId' });
Page.belongsTo(User, { foreignKey: 'userId' });

Page.hasMany(PageAdmin, { foreignKey: 'pageId' });
PageAdmin.belongsTo(Page, { foreignKey: 'pageId' });

Page.hasMany(PageView, { foreignKey: 'pageId' });
PageView.belongsTo(Page, { foreignKey: 'pageId' });

Page.hasMany(PageFollower, { foreignKey: 'pageId' });
PageFollower.belongsTo(Page, { foreignKey: 'pageId' });

User.hasMany(PageFollower, { foreignKey: 'userId' });
PageFollower.belongsTo(User, { foreignKey: 'userId' });

Page.hasMany(PageInsight, { foreignKey: 'pageId' });
PageInsight.belongsTo(Page, { foreignKey: 'pageId' });

User.hasMany(Friend, { as: 'Friendships', foreignKey: 'userId' });
Friend.belongsTo(User, { as: 'User', foreignKey: 'userId' });
Friend.belongsTo(User, { as: 'FriendUser', foreignKey: 'friendId' });

User.hasMany(FriendRequest, { as: 'SentRequests', foreignKey: 'senderId' });
User.hasMany(FriendRequest, { as: 'ReceivedRequests', foreignKey: 'receiverId' });
FriendRequest.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });
FriendRequest.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(NotificationPreference, { foreignKey: 'userId' });
NotificationPreference.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(UserPreferences, { foreignKey: 'userId' });
UserPreferences.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AuditLog, { as: 'AdminActions', foreignKey: 'adminId' });
AuditLog.belongsTo(User, { as: 'Admin', foreignKey: 'adminId' });

User.hasMany(ContentFlag, { as: 'Reports', foreignKey: 'reporterId' });
ContentFlag.belongsTo(User, { as: 'Reporter', foreignKey: 'reporterId' });

User.hasMany(PasswordResetToken, { foreignKey: 'userId' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Profile,
    Skill,
    Endorsement,
    Page,
    PageAdmin,
    PageView,
    PageFollower,
    PageInsight,
    Friend,
    FriendRequest,
    UserPreferences,
    Notification,
    NotificationPreference,
    AuditLog,
    ContentFlag,
    PasswordResetToken
};
