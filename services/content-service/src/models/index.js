const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config({ quiet: true });

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/content', {
    dialect: 'postgres',
    logging: false
});

const models = {
    Post: require('./Post')(sequelize),
    Comment: require('./Comment')(sequelize),
    Reaction: require('./Reaction')(sequelize),
    Vote: require('./Vote')(sequelize),
    Bookmark: require('./Bookmark')(sequelize),
    UserFollow: require('./UserFollow')(sequelize),
    AnonIdentity: require('./AnonIdentity')(sequelize),
    ...require('./Hashtag')(sequelize),
    ...require('./Community')(sequelize),
    ...require('./Group')(sequelize),
    ...require('./VideoHub')(sequelize),
    ...require('./Award')(sequelize),
    Retweet: require('./Retweet')(sequelize),
    ...require('./Forum')(sequelize),
    ...require('./Blog')(sequelize),
    ...require('./SystemModels')(sequelize)
};

// Destructure for easier association definition
const {
    Post, Comment, Reaction, Vote, Bookmark, UserFollow, AnonIdentity,
    Hashtag, PostHashtag, Community, CommunityMember, Group, GroupMember,
    GroupInsight, Video, Channel, Playlist, Subscription, PlaylistItem, Award, PostAward,
    Retweet, ForumPost, ForumReply, Blog, BlogComment, Archive, ContentVersion
} = models;

// Relationships
Post.hasMany(Comment, { foreignKey: 'postId' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

Post.belongsTo(AnonIdentity, { foreignKey: 'anonIdentityId' });
AnonIdentity.hasMany(Post, { foreignKey: 'anonIdentityId' });
Comment.belongsTo(AnonIdentity, { foreignKey: 'anonIdentityId' });
AnonIdentity.hasMany(Comment, { foreignKey: 'anonIdentityId' });

Post.hasMany(Reaction, { foreignKey: 'postId' });
Reaction.belongsTo(Post, { foreignKey: 'postId' });

Post.hasMany(Vote, { foreignKey: 'postId' });
Vote.belongsTo(Post, { foreignKey: 'postId' });

Post.belongsToMany(Hashtag, { through: PostHashtag, foreignKey: 'postId' });
Hashtag.belongsToMany(Post, { through: PostHashtag, foreignKey: 'hashtagId' });

Channel.hasMany(Video, { foreignKey: 'channelId' });
Video.belongsTo(Channel, { foreignKey: 'channelId' });
Channel.hasMany(Subscription, { foreignKey: 'channelId' });
Channel.hasMany(Playlist, { foreignKey: 'channelId' });

Community.hasMany(Post, { foreignKey: 'communityId' });
Community.hasMany(CommunityMember, { foreignKey: 'communityId' });

Group.hasMany(GroupMember, { foreignKey: 'groupId' });
Group.hasMany(Post, { foreignKey: 'groupId' });
Group.hasMany(GroupInsight, { foreignKey: 'groupId' });
GroupInsight.belongsTo(Group, { foreignKey: 'groupId' });

// Establish playlist / playlist item relationship if the model exists
if (PlaylistItem) {
    Playlist.hasMany(PlaylistItem, { foreignKey: 'playlistId' });
    PlaylistItem.belongsTo(Playlist, { foreignKey: 'playlistId' });
    // also connect items back to videos for convenience
    if (Video) {
        Video.hasMany(PlaylistItem, { foreignKey: 'videoId' });
        PlaylistItem.belongsTo(Video, { foreignKey: 'videoId' });
    }
}


Post.hasMany(PostAward, { foreignKey: 'postId' });
PostAward.belongsTo(Award, { foreignKey: 'awardId' });

Post.hasMany(Retweet, { foreignKey: 'originalPostId' });
Post.hasMany(Post, { as: 'Replies', foreignKey: 'parentId' });
Post.belongsTo(Post, { as: 'ParentPost', foreignKey: 'parentId' });

Blog.hasMany(BlogComment, { foreignKey: 'blogId' });
BlogComment.belongsTo(Blog, { foreignKey: 'blogId' });

module.exports = {
    sequelize,
    ...models,
    Op
};
