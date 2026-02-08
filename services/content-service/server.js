const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(express.json());

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/content', {
  dialect: 'postgres',
  logging: false
});

// Redis for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Models
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  communityId: DataTypes.UUID, // Reddit-inspired: posts can belong to communities
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'link'),
    defaultValue: 'text'
  },
  mediaUrls: DataTypes.ARRAY(DataTypes.STRING),
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  comments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public'
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parentId: DataTypes.UUID
});

const Video = sequelize.define('Video', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  channelId: DataTypes.UUID, // YouTube-inspired: videos belong to channels
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  thumbnailUrl: DataTypes.STRING,
  duration: DataTypes.INTEGER,
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public'
  },
  category: DataTypes.STRING // YouTube-inspired: video categories
});

// NEW: Facebook-inspired Reactions Model
const Reaction = sequelize.define('Reaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry'),
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['postId', 'userId']
    }
  ]
});

// NEW: Twitter-inspired Hashtags Model
const Hashtag = sequelize.define('Hashtag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tag: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  postCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Twitter-inspired PostHashtags junction table
const PostHashtag = sequelize.define('PostHashtag', {
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  hashtagId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['postId', 'hashtagId']
    }
  ]
});

// NEW: YouTube-inspired Channels Model
const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  avatarUrl: DataTypes.STRING,
  bannerUrl: DataTypes.STRING,
  subscribers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: YouTube-inspired Channel Subscriptions
const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  channelId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// NEW: Reddit-inspired Communities Model
const Community = sequelize.define('Community', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: DataTypes.TEXT,
  rules: DataTypes.ARRAY(DataTypes.TEXT),
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  members: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'restricted'),
    defaultValue: 'public'
  }
});

// NEW: Reddit-inspired Community Membership
const CommunityMember = sequelize.define('CommunityMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  communityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('member', 'moderator', 'admin'),
    defaultValue: 'member'
  }
});

// NEW: Reddit-inspired Votes Model
const Vote = sequelize.define('Vote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  value: {
    type: DataTypes.INTEGER, // 1 for upvote, -1 for downvote
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['postId', 'userId']
    }
  ]
});

// NEW: Facebook-inspired Groups Model (different from Communities)
const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  privacy: {
    type: DataTypes.ENUM('public', 'private', 'secret'),
    defaultValue: 'public'
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  avatarUrl: DataTypes.STRING,
  coverUrl: DataTypes.STRING
});

// NEW: Facebook-inspired Group Membership
const GroupMember = sequelize.define('GroupMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('member', 'moderator', 'admin'),
    defaultValue: 'member'
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'banned'),
    defaultValue: 'active'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'groupId']
    }
  ]
});

// NEW: Bookmarks Model (Twitter/X-inspired)
const Bookmark = sequelize.define('Bookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  itemType: {
    type: DataTypes.ENUM('post', 'video', 'article', 'product'),
    allowNull: false
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  metadata: DataTypes.JSONB
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'itemType', 'itemId']
    }
  ]
});

// Relationships
Post.hasMany(Comment, { foreignKey: 'postId' });
Comment.belongsTo(Post, { foreignKey: 'postId' });
Post.hasMany(Reaction, { foreignKey: 'postId' });
Post.hasMany(Vote, { foreignKey: 'postId' });
Post.belongsToMany(Hashtag, { through: PostHashtag, foreignKey: 'postId' });
Hashtag.belongsToMany(Post, { through: PostHashtag, foreignKey: 'hashtagId' });
Channel.hasMany(Video, { foreignKey: 'channelId' });
Video.belongsTo(Channel, { foreignKey: 'channelId' });
Channel.hasMany(Subscription, { foreignKey: 'channelId' });
Community.hasMany(Post, { foreignKey: 'communityId' });
Community.hasMany(CommunityMember, { foreignKey: 'communityId' });
Group.hasMany(GroupMember, { foreignKey: 'groupId' });

sequelize.sync();

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-service' });
});

// Public: Get public posts (no auth required)
app.get('/public/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await Post.findAll({
      where: { visibility: 'public', isPublished: true },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Public: Get public videos
app.get('/public/videos', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = await Video.findAll({
      where: { visibility: 'public' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Public: Get single video
app.get('/public/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video || video.visibility !== 'public') {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment views
    await video.increment('views');

    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Helper: Extract hashtags from content
function extractHashtags(content) {
  const hashtagRegex = /#[\w]+/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase().substring(1)) : [];
}

// Create post (requires auth via gateway) - Updated with hashtag support
app.post('/posts', async (req, res) => {
  try {
    const { userId, content, type, mediaUrls, visibility, communityId } = req.body;

    const post = await Post.create({
      userId,
      content,
      type,
      mediaUrls,
      visibility,
      communityId
    });

    // Extract and save hashtags (deduplicate first)
    const tags = [...new Set(extractHashtags(content))];
    for (const tag of tags) {
      let hashtag = await Hashtag.findOne({ where: { tag } });
      if (!hashtag) {
        hashtag = await Hashtag.create({ tag, postCount: 0 });
      }
      await PostHashtag.create({ postId: post.id, hashtagId: hashtag.id });
      await hashtag.increment('postCount');
    }

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get user feed
app.get('/feed/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await Post.findAll({
      where: {
        [Op.or]: [
          { userId: req.params.userId },
          { visibility: 'public' }
        ],
        isPublished: true
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Create video
app.post('/videos', async (req, res) => {
  try {
    const { userId, title, description, videoUrl, thumbnailUrl, duration, visibility } = req.body;

    const video = await Video.create({
      userId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      visibility
    });

    res.status(201).json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// Add comment
app.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { userId, content, parentId } = req.body;
    const { postId } = req.params;

    const comment = await Comment.create({
      postId,
      userId,
      content,
      parentId
    });

    await Post.increment('comments', { where: { id: postId } });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for post
app.get('/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { postId: req.params.postId },
      order: [['createdAt', 'DESC']]
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// ========== FACEBOOK-INSPIRED: REACTIONS ==========

// Add/Update reaction to post
app.post('/posts/:postId/reactions', async (req, res) => {
  try {
    const { type } = req.body;
    const { postId } = req.params;
    
    // Get authenticated user ID from header set by gateway
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user already reacted
    const existing = await Reaction.findOne({ where: { postId, userId } });
    
    if (existing) {
      if (existing.type === type) {
        // Remove reaction if same type
        await existing.destroy();
        return res.json({ message: 'Reaction removed' });
      } else {
        // Update reaction type
        existing.type = type;
        await existing.save();
        return res.json(existing);
      }
    }

    // Create new reaction
    const reaction = await Reaction.create({ postId, userId, type });
    res.status(201).json(reaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Get reactions for post
app.get('/posts/:postId/reactions', async (req, res) => {
  try {
    const reactions = await Reaction.findAll({
      where: { postId: req.params.postId }
    });

    // Count by type
    const summary = reactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ reactions, summary, total: reactions.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// ========== TWITTER-INSPIRED: HASHTAGS ==========

// Get posts by hashtag
app.get('/hashtags/:tag/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const tag = req.params.tag.toLowerCase().replace(/^#/, '');

    const hashtag = await Hashtag.findOne({ 
      where: { tag }
    });

    if (!hashtag) {
      return res.json({ tag, posts: [] });
    }

    // Query posts separately with proper ordering and pagination
    const posts = await hashtag.getPosts({
      where: { isPublished: true },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ tag, posts: posts || [], total: hashtag.postCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch hashtag posts' });
  }
});

// Get trending hashtags
app.get('/hashtags/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const hashtags = await Hashtag.findAll({
      order: [['postCount', 'DESC'], ['updatedAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(hashtags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trending hashtags' });
  }
});

// ========== YOUTUBE-INSPIRED: CHANNELS ==========

// Create channel
app.post('/channels', async (req, res) => {
  try {
    const { userId, name, description, avatarUrl, bannerUrl } = req.body;

    const channel = await Channel.create({
      userId,
      name,
      description,
      avatarUrl,
      bannerUrl
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Get channel
app.get('/channels/:id', async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id, {
      include: [{ model: Video, where: { visibility: 'public' }, required: false }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Subscribe to channel
app.post('/channels/:id/subscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    const channelId = req.params.id;

    // Check if already subscribed
    const existing = await Subscription.findOne({ where: { userId, channelId } });
    
    if (existing) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    await Subscription.create({ userId, channelId });
    await Channel.increment('subscribers', { where: { id: channelId } });

    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from channel
app.delete('/channels/:id/subscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    const channelId = req.params.id;

    const subscription = await Subscription.findOne({ where: { userId, channelId } });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Not subscribed' });
    }

    await subscription.destroy();
    await Channel.decrement('subscribers', { where: { id: channelId } });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ========== REDDIT-INSPIRED: COMMUNITIES ==========

// Create community
app.post('/communities', async (req, res) => {
  try {
    const { name, description, rules, createdBy, visibility } = req.body;

    const community = await Community.create({
      name: name.toLowerCase(),
      description,
      rules,
      createdBy,
      visibility
    });

    // Add creator as admin
    await CommunityMember.create({
      userId: createdBy,
      communityId: community.id,
      role: 'admin'
    });

    await community.increment('members');

    res.status(201).json(community);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// Get communities
app.get('/communities', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const communities = await Community.findAll({
      where: { visibility: 'public' },
      order: [['members', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(communities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get community
app.get('/communities/:name', async (req, res) => {
  try {
    const community = await Community.findOne({
      where: { name: req.params.name.toLowerCase() }
    });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    res.json(community);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// Join community
app.post('/communities/:name/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const community = await Community.findOne({
      where: { name: req.params.name.toLowerCase() }
    });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if already member
    const existing = await CommunityMember.findOne({
      where: { userId, communityId: community.id }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member' });
    }

    await CommunityMember.create({
      userId,
      communityId: community.id,
      role: 'member'
    });

    await community.increment('members');

    res.status(201).json({ message: 'Joined community' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join community' });
  }
});

// ========== REDDIT-INSPIRED: VOTING ==========

// Vote on post (upvote/downvote)
app.post('/posts/:postId/vote', async (req, res) => {
  try {
    const { userId, value } = req.body; // value: 1 or -1
    const { postId } = req.params;

    if (value !== 1 && value !== -1) {
      return res.status(400).json({ error: 'Invalid vote value' });
    }

    // Check if user already voted
    const existing = await Vote.findOne({ where: { postId, userId } });

    if (existing) {
      if (existing.value === value) {
        // Remove vote if same value
        await existing.destroy();
        return res.json({ message: 'Vote removed' });
      } else {
        // Update vote
        existing.value = value;
        await existing.save();
        return res.json(existing);
      }
    }

    // Create new vote
    const vote = await Vote.create({ postId, userId, value });
    res.status(201).json(vote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get vote score for post
app.get('/posts/:postId/votes', async (req, res) => {
  try {
    const votes = await Vote.findAll({
      where: { postId: req.params.postId }
    });

    const score = votes.reduce((sum, v) => sum + v.value, 0);
    const upvotes = votes.filter(v => v.value === 1).length;
    const downvotes = votes.filter(v => v.value === -1).length;

    res.json({ score, upvotes, downvotes, total: votes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// ========== FACEBOOK-INSPIRED: GROUPS ==========

// Create group
app.post('/groups', async (req, res) => {
  try {
    const { userId, name, description, privacy, category } = req.body;

    const group = await Group.create({
      name,
      description,
      privacy,
      category,
      createdBy: userId,
      memberCount: 1
    });

    // Auto-add creator as admin
    await GroupMember.create({
      userId,
      groupId: group.id,
      role: 'admin',
      status: 'active'
    });

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get all groups
app.get('/groups', async (req, res) => {
  try {
    const { userId } = req.query;
    const groups = await Group.findAll({
      order: [['createdAt', 'DESC']]
    });

    // If userId provided, add membership info
    if (userId) {
      const memberships = await GroupMember.findAll({
        where: { userId }
      });
      const membershipMap = new Map(memberships.map(m => [m.groupId, true]));
      
      const groupsWithMembership = groups.map(g => ({
        ...g.toJSON(),
        isMember: membershipMap.has(g.id)
      }));
      
      return res.json(groupsWithMembership);
    }

    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get single group
app.get('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await GroupMember.findAll({
      where: { groupId: req.params.id, status: 'active' }
    });

    res.json({
      ...group.toJSON(),
      members: members.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Join group
app.post('/groups/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id;

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const existing = await GroupMember.findOne({
      where: { userId, groupId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // For private/secret groups, create pending membership
    const status = group.privacy === 'public' ? 'active' : 'pending';

    const membership = await GroupMember.create({
      userId,
      groupId,
      role: 'member',
      status
    });

    // Increment member count only if active
    if (status === 'active') {
      await group.increment('memberCount');
    }

    res.status(201).json(membership);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave group
app.post('/groups/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id;

    const membership = await GroupMember.findOne({
      where: { userId, groupId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member' });
    }

    await membership.destroy();
    
    const group = await Group.findByPk(groupId);
    if (group && group.memberCount > 0) {
      await group.decrement('memberCount');
    }

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Get group members
app.get('/groups/:id/members', async (req, res) => {
  try {
    const members = await GroupMember.findAll({
      where: { 
        groupId: req.params.id,
        status: 'active'
      },
      order: [['createdAt', 'ASC']]
    });

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ========== TWITTER/X-INSPIRED: BOOKMARKS ==========

// Create bookmark
app.post('/bookmarks', async (req, res) => {
  try {
    const { userId, itemType, itemId, title, content, metadata } = req.body;

    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      where: { userId, itemType, itemId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already bookmarked' });
    }

    const bookmark = await Bookmark.create({
      userId,
      itemType,
      itemId,
      title,
      content,
      metadata
    });

    res.status(201).json(bookmark);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

// Get user bookmarks
app.get('/bookmarks', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const bookmarks = await Bookmark.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(bookmarks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Remove bookmark
app.delete('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findByPk(req.params.id);
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    await bookmark.destroy();
    res.json({ message: 'Bookmark removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Check if item is bookmarked
app.get('/bookmarks/check', async (req, res) => {
  try {
    const { userId, itemType, itemId } = req.query;
    
    const bookmark = await Bookmark.findOne({
      where: { userId, itemType, itemId }
    });

    res.json({ bookmarked: !!bookmark, bookmark });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check bookmark' });
  }
});

app.listen(PORT, () => {
  console.log(`Content service running on port ${PORT}`);
});
