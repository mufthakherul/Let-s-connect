const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Redis = require('ioredis');
const crypto = require('crypto');
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
  groupId: DataTypes.UUID, // Facebook-inspired: posts can belong to groups
  pageId: DataTypes.UUID, // Facebook-inspired: posts can belong to pages
  parentId: DataTypes.UUID, // Twitter-inspired: threading support
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
  },
  flairId: DataTypes.UUID // Reddit-inspired: posts can have flairs
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
  parentId: DataTypes.UUID,
  upvotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downvotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
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
  },
  totalViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  videoCount: {
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
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
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

// NEW: YouTube-inspired Playlists Model
const Playlist = sequelize.define('Playlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  channelId: DataTypes.UUID,
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public'
  },
  videoCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: YouTube-inspired Playlist Items (many-to-many relationship)
const PlaylistItem = sequelize.define('PlaylistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  playlistId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  videoId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['playlistId', 'videoId']
    }
  ]
});

// NEW: Reddit-inspired Awards Model
const Award = sequelize.define('Award', {
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
  icon: DataTypes.STRING,
  cost: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  type: {
    type: DataTypes.ENUM('gold', 'silver', 'platinum', 'custom'),
    defaultValue: 'silver'
  }
});

// NEW: Reddit-inspired Post Awards (junction table)
const PostAward = sequelize.define('PostAward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  awardId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  givenBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  message: DataTypes.TEXT
}, {
  indexes: [
    {
      unique: true,
      fields: ['postId', 'awardId', 'givenBy']
    }
  ]
});

// NEW: Twitter-inspired: Quote Tweets/Retweets
const Retweet = sequelize.define('Retweet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  originalPostId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  quotedPostId: DataTypes.UUID, // If this is a quote tweet, this is the new post ID
  comment: DataTypes.TEXT // Quote comment
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'originalPostId']
    }
  ]
});

// NEW: Phase 1 - Group Files and Media Model
const GroupFile = sequelize.define('GroupFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
    defaultValue: 'other'
  },
  fileSize: DataTypes.BIGINT, // in bytes
  description: DataTypes.TEXT
});

// NEW: Phase 1 - Group Events Model
const GroupEvent = sequelize.define('GroupEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  location: DataTypes.STRING,
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: DataTypes.DATE,
  coverImageUrl: DataTypes.STRING,
  attendeeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 1 - Group Event Attendees Model
const GroupEventAttendee = sequelize.define('GroupEventAttendee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('going', 'interested', 'not_going'),
    defaultValue: 'going'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['eventId', 'userId']
    }
  ]
});

// NEW: Phase 1 - Comment Voting Model (Reddit-style)
const CommentVote = sequelize.define('CommentVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  commentId: {
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
      fields: ['commentId', 'userId']
    }
  ]
});

// NEW: Phase 1 - Community Flairs Model (Reddit-style)
const Flair = sequelize.define('Flair', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  communityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  backgroundColor: {
    type: DataTypes.STRING,
    defaultValue: '#0079D3'
  },
  textColor: {
    type: DataTypes.STRING,
    defaultValue: '#FFFFFF'
  },
  type: {
    type: DataTypes.ENUM('user', 'post'),
    defaultValue: 'post'
  }
});

// NEW: Phase 1 - Live Streaming Model (YouTube-style placeholder)
const LiveStream = sequelize.define('LiveStream', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  channelId: DataTypes.UUID,
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  thumbnailUrl: DataTypes.STRING,
  streamUrl: DataTypes.STRING, // RTMP or HLS URL (placeholder)
  streamKey: DataTypes.STRING, // Streaming key (placeholder)
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended'),
    defaultValue: 'scheduled'
  },
  scheduledStartTime: DataTypes.DATE,
  actualStartTime: DataTypes.DATE,
  actualEndTime: DataTypes.DATE,
  viewerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  peakViewerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category: DataTypes.STRING
});

// NEW: Phase 2 - Blog/Article Model (Blogger-inspired)
const Blog = sequelize.define('Blog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  excerpt: DataTypes.TEXT, // Short summary
  featuredImage: DataTypes.STRING,
  category: DataTypes.STRING,
  tags: DataTypes.ARRAY(DataTypes.STRING),
  readingTime: DataTypes.INTEGER, // in minutes
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  publishedAt: DataTypes.DATE,
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // SEO metadata
  metaTitle: DataTypes.STRING,
  metaDescription: DataTypes.TEXT,
  metaKeywords: DataTypes.ARRAY(DataTypes.STRING)
});

// NEW: Phase 2 - Blog Category Model
const BlogCategory = sequelize.define('BlogCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  description: DataTypes.TEXT,
  postCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 2 - Blog Comment Model
const BlogComment = sequelize.define('BlogComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  blogId: {
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
  parentId: DataTypes.UUID, // for nested comments
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
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
Channel.hasMany(Playlist, { foreignKey: 'channelId' });
Channel.hasMany(LiveStream, { foreignKey: 'channelId' });
Community.hasMany(Post, { foreignKey: 'communityId' });
Community.hasMany(CommunityMember, { foreignKey: 'communityId' });
Community.hasMany(Flair, { foreignKey: 'communityId' });
Group.hasMany(GroupMember, { foreignKey: 'groupId' });
Group.hasMany(Post, { foreignKey: 'groupId' });
Group.hasMany(GroupFile, { foreignKey: 'groupId' });
Group.hasMany(GroupEvent, { foreignKey: 'groupId' });
GroupEvent.hasMany(GroupEventAttendee, { foreignKey: 'eventId' });
Playlist.hasMany(PlaylistItem, { foreignKey: 'playlistId' });
PlaylistItem.belongsTo(Playlist, { foreignKey: 'playlistId' });
PlaylistItem.belongsTo(Video, { foreignKey: 'videoId' });
Post.hasMany(PostAward, { foreignKey: 'postId' });
PostAward.belongsTo(Award, { foreignKey: 'awardId' });
Post.hasMany(Retweet, { foreignKey: 'originalPostId' });
Post.hasMany(Post, { as: 'Replies', foreignKey: 'parentId' });
Post.belongsTo(Post, { as: 'ParentPost', foreignKey: 'parentId' });
Comment.hasMany(CommentVote, { foreignKey: 'commentId' });
Post.belongsTo(Flair, { foreignKey: 'flairId' });
Flair.hasMany(Post, { foreignKey: 'flairId' });
Blog.hasMany(BlogComment, { foreignKey: 'blogId' });
BlogComment.belongsTo(Blog, { foreignKey: 'blogId' });
BlogComment.hasMany(BlogComment, { as: 'Replies', foreignKey: 'parentId' });
BlogComment.belongsTo(BlogComment, { as: 'ParentComment', foreignKey: 'parentId' });

sequelize.sync().then(async () => {
  // Initialize default awards if they don't exist
  try {
    const awards = [
      { name: 'Gold Award', description: 'A prestigious gold award', icon: '🥇', cost: 500, type: 'gold' },
      { name: 'Silver Award', description: 'A valuable silver award', icon: '🥈', cost: 100, type: 'silver' },
      { name: 'Platinum Award', description: 'The ultimate platinum award', icon: '💎', cost: 1800, type: 'platinum' },
      { name: 'Helpful', description: 'This post was helpful', icon: '👍', cost: 50, type: 'custom' },
      { name: 'Wholesome', description: 'A wholesome post', icon: '❤️', cost: 50, type: 'custom' }
    ];

    for (const awardData of awards) {
      await Award.findOrCreate({
        where: { name: awardData.name },
        defaults: awardData
      });
    }

    console.log('Default awards initialized');
  } catch (error) {
    console.error('Error initializing awards:', error);
  }
});

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
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, type, mediaUrls, visibility, communityId, groupId, pageId, flairId, characterLimit } = req.body;

    // Twitter-style character limit validation (default 280, can be overridden)
    const limit = characterLimit || 280;
    if (content && content.length > limit && !mediaUrls?.length) {
      return res.status(400).json({
        error: `Post content exceeds character limit of ${limit} characters`,
        currentLength: content.length,
        limit: limit
      });
    }

    const post = await Post.create({
      userId,
      content,
      type,
      mediaUrls,
      visibility,
      communityId,
      groupId,
      pageId,
      flairId
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

// Get all channels (list)
app.get('/channels', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const channels = await Channel.findAll({
      where,
      order: [['subscribers', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'name', 'description', 'avatarUrl', 'bannerUrl', 'subscribers', 'createdAt']
    });

    res.json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get channel by ID
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
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, privacy, category } = req.body;

    // Use transaction to ensure both group and membership are created together
    const group = await sequelize.transaction(async (t) => {
      const createdGroup = await Group.create({
        name,
        description,
        privacy,
        category,
        createdBy: userId,
        memberCount: 0
      }, { transaction: t });

      // Auto-add creator as admin
      await GroupMember.create({
        userId,
        groupId: createdGroup.id,
        role: 'admin',
        status: 'active'
      }, { transaction: t });

      // Update member count based on active members
      const activeMemberCount = await GroupMember.count({
        where: {
          groupId: createdGroup.id,
          status: 'active'
        },
        transaction: t
      });

      createdGroup.memberCount = activeMemberCount;
      await createdGroup.save({ transaction: t });

      return createdGroup;
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
    const userId = req.header('x-user-id');

    const groups = await Group.findAll({
      order: [['createdAt', 'DESC']]
    });

    let membershipMap = null;

    // If authenticated user is present, load their group memberships
    if (userId) {
      const memberships = await GroupMember.findAll({
        where: { userId }
      });
      membershipMap = new Map(memberships.map(m => [m.groupId, true]));
    }

    // Enforce privacy: secret groups are only visible to members
    const visibleGroups = groups.filter(g => {
      const group = g.toJSON ? g.toJSON() : g;
      if (group.privacy !== 'secret') {
        return true;
      }
      // For secret groups, require authenticated membership
      return membershipMap !== null && membershipMap.has(group.id);
    });

    // If authenticated, include membership info in response
    if (userId && membershipMap !== null) {
      const groupsWithMembership = visibleGroups.map(g => {
        const group = g.toJSON ? g.toJSON() : g;
        return {
          ...group,
          isMember: membershipMap.has(group.id)
        };
      });
      return res.json(groupsWithMembership);
    }

    res.json(visibleGroups);
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
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groupId = req.params.id;

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Secret groups should reject join requests (invite-only)
    if (group.privacy === 'secret') {
      return res.status(403).json({ error: 'Secret groups are invite-only' });
    }

    // Check if already a member
    const existing = await GroupMember.findOne({
      where: { userId, groupId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // For private groups, create pending membership; public groups are active
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
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groupId = req.params.id;

    const membership = await GroupMember.findOne({
      where: { userId, groupId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member' });
    }

    const wasActive = membership.status === 'active';
    await membership.destroy();

    // Only decrement member count if the membership was active
    if (wasActive) {
      const group = await Group.findByPk(groupId);
      if (group && group.memberCount > 0) {
        await group.decrement('memberCount');
      }
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
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemType, itemId, title, content, metadata } = req.body;

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
    if (error instanceof Sequelize.UniqueConstraintError) {
      return res.status(400).json({ error: 'Already bookmarked' });
    }
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

// Get user bookmarks
app.get('/bookmarks', async (req, res) => {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookmark = await Bookmark.findOne({
      where: {
        id: req.params.id,
        userId: userId
      }
    });

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
    const userId = req.header('x-user-id');
    const { itemType, itemId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'itemType and itemId are required' });
    }

    const bookmark = await Bookmark.findOne({
      where: { userId, itemType, itemId }
    });

    res.json({ bookmarked: !!bookmark, bookmark });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check bookmark' });
  }
});

// ========== THREAD ENDPOINTS (Twitter-inspired) ==========

// Create a thread (post with replies)
app.post('/threads', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tweets } = req.body; // Array of tweet contents
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return res.status(400).json({ error: 'tweets array is required' });
    }

    const createdPosts = [];

    await sequelize.transaction(async (transaction) => {
      let parentId = null;

      for (const tweetContent of tweets) {
        const post = await Post.create({
          userId,
          content: tweetContent,
          type: 'text',
          visibility: 'public',
          parentId: parentId
        }, { transaction });

        createdPosts.push(post);
        parentId = post.id; // Next tweet will be a reply to this one
      }
    });

    res.json({ thread: createdPosts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Get thread (post with all replies recursively)
app.get('/threads/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    const mainPost = await Post.findByPk(postId);
    if (!mainPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get all replies recursively by traversing the parentId chain
    const allReplies = [];
    let currentParentIds = [postId];

    while (currentParentIds.length > 0) {
      const children = await Post.findAll({
        where: {
          parentId: {
            [Op.in]: currentParentIds
          }
        },
        order: [['createdAt', 'ASC']]
      });

      if (!children.length) {
        break;
      }

      allReplies.push(...children);
      currentParentIds = children.map(child => child.id);
    }

    res.json({ post: mainPost, replies: allReplies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Reply to a post (create threaded reply)
app.post('/posts/:postId/reply', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const parentPost = await Post.findByPk(postId);
    if (!parentPost) {
      return res.status(404).json({ error: 'Parent post not found' });
    }

    const reply = await Post.create({
      userId,
      content,
      type: 'text',
      visibility: parentPost.visibility,
      parentId: postId
    });

    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// ========== PLAYLIST ENDPOINTS (YouTube-inspired) ==========

// Create a playlist
app.post('/playlists', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, visibility, channelId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const playlist = await Playlist.create({
      userId,
      name,
      description,
      visibility,
      channelId
    });

    res.json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Get all playlists for a user
app.get('/playlists/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.header('x-user-id');

    // If the requester is not the owner (or is unauthenticated), only return public playlists
    const where = { userId };
    if (!requesterId || requesterId !== userId) {
      where.visibility = 'public';
    }

    const playlists = await Playlist.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get playlist with videos
app.get('/playlists/:id', async (req, res) => {
  try {
    const requesterId = req.header('x-user-id');

    const playlist = await Playlist.findByPk(req.params.id, {
      include: [{
        model: PlaylistItem,
        include: [{ model: Video }]
      }],
      order: [[PlaylistItem, 'position', 'ASC']]
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Enforce visibility rules
    if (playlist.visibility === 'private') {
      if (!requesterId || requesterId !== playlist.userId) {
        return res.status(403).json({ error: 'Access denied to private playlist' });
      }
    } else if (playlist.visibility === 'unlisted') {
      // Unlisted playlists are accessible by link, but we could add owner-only restriction if needed
      // For now, allowing access if they have the link (id)
    }

    res.json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Add video to playlist
app.post('/playlists/:id/videos', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { videoId, position } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const video = await Video.findByPk(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const playlistItem = await PlaylistItem.create({
      playlistId: id,
      videoId,
      position: position ?? playlist.videoCount
    });

    await playlist.increment('videoCount');

    res.json(playlistItem);
  } catch (error) {
    // Handle duplicate video in playlist (unique constraint on playlistId, videoId)
    if (error instanceof Sequelize.UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Video is already in this playlist' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

// Remove video from playlist
app.delete('/playlists/:id/videos/:videoId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, videoId } = req.params;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const item = await PlaylistItem.findOne({
      where: { playlistId: id, videoId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Video not in playlist' });
    }

    await item.destroy();
    await playlist.decrement('videoCount');

    res.json({ message: 'Video removed from playlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove video from playlist' });
  }
});

// ========== AWARD ENDPOINTS (Reddit-inspired) ==========

// Create award types (requires authentication)
app.post('/awards', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, icon, cost, type } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const award = await Award.create({
      name,
      description,
      icon,
      cost,
      type
    });

    res.json(award);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create award' });
  }
});

// Get all available awards
app.get('/awards', async (req, res) => {
  try {
    const awards = await Award.findAll();
    res.json(awards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch awards' });
  }
});

// Give award to a post
app.post('/posts/:postId/awards', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const { awardId, message } = req.body;

    if (!awardId) {
      return res.status(400).json({ error: 'awardId is required' });
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const award = await Award.findByPk(awardId);
    if (!award) {
      return res.status(404).json({ error: 'Award not found' });
    }

    const postAward = await PostAward.create({
      postId,
      awardId,
      givenBy: userId,
      message
    });

    res.json(postAward);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to give award' });
  }
});

// Get awards for a post
app.get('/posts/:postId/awards', async (req, res) => {
  try {
    const { postId } = req.params;

    const awards = await PostAward.findAll({
      where: { postId },
      include: [{ model: Award }]
    });

    res.json(awards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch post awards' });
  }
});

// ========== RETWEET ENDPOINTS (Twitter-inspired) ==========

// Retweet a post
app.post('/posts/:postId/retweet', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const { comment } = req.body;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let retweet;

    await sequelize.transaction(async (transaction) => {
      let quotedPostId = null;

      // If there's a comment, create a quote tweet (new post)
      if (comment) {
        const quotePost = await Post.create(
          {
            userId,
            content: comment,
            type: post.type,
            visibility: 'public'
          },
          { transaction }
        );
        quotedPostId = quotePost.id;
      }

      retweet = await Retweet.create(
        {
          userId,
          originalPostId: postId,
          quotedPostId,
          comment
        },
        { transaction }
      );

      await post.increment('shares', { transaction });
    });

    res.json(retweet);
  } catch (error) {
    console.error(error);
    if (error instanceof Sequelize.UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Already retweeted' });
    }
    res.status(500).json({ error: 'Failed to retweet' });
  }
});

// Undo retweet
app.delete('/posts/:postId/retweet', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;

    const retweet = await Retweet.findOne({
      where: { userId, originalPostId: postId }
    });

    if (!retweet) {
      return res.status(404).json({ error: 'Retweet not found' });
    }

    // Delete the quoted post if it exists and belongs to the user
    if (retweet.quotedPostId) {
      const quotedPost = await Post.findByPk(retweet.quotedPostId);
      if (quotedPost && quotedPost.userId === userId) {
        await quotedPost.destroy();
      }
    }

    await retweet.destroy();

    const post = await Post.findByPk(postId);
    if (post && post.shares > 0) {
      await post.decrement('shares');
    }

    res.json({ message: 'Retweet removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove retweet' });
  }
});

// Get retweets of a post
app.get('/posts/:postId/retweets', async (req, res) => {
  try {
    const { postId } = req.params;

    const retweets = await Retweet.findAll({
      where: { originalPostId: postId },
      order: [['createdAt', 'DESC']]
    });

    res.json(retweets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch retweets' });
  }
});

// ========== GROUP POST ENDPOINTS (Facebook-inspired) ==========

// Get posts for a specific group
app.get('/groups/:groupId/posts', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const effectiveLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
    const effectivePage = Number.isNaN(parsedPage) ? 1 : parsedPage;
    const offset = (effectivePage - 1) * effectiveLimit;

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Enforce privacy for non-public groups
    if (group.privacy === 'private' || group.privacy === 'secret') {
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const membership = await GroupMember.findOne({
        where: { userId, groupId, status: 'active' }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }

    const posts = await Post.findAll({
      where: { groupId },
      order: [['createdAt', 'DESC']],
      limit: effectiveLimit,
      offset
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch group posts' });
  }
});

// Create a post in a group
app.post('/groups/:groupId/posts', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId } = req.params;
    const { content, type, mediaUrls } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Verify group exists and user is a member
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const membership = await GroupMember.findOne({
      where: { userId, groupId, status: 'active' }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const post = await Post.create({
      userId,
      groupId,
      content,
      type,
      mediaUrls,
      visibility: group.privacy === 'public' ? 'public' : 'private' // Match group privacy
    });

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create group post' });
  }
});

// ============================================
// Phase 1 New Endpoints
// ============================================

// Page Posts - Get posts for a specific page
app.get('/pages/:pageId/posts', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await Post.findAll({
      where: { pageId, isPublished: true },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch page posts' });
  }
});

// Create a post for a page (requires page admin)
app.post('/pages/:pageId/posts', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pageId } = req.params;
    const { content, type, mediaUrls, visibility } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Verify page exists (Note: In a full implementation, this would verify via user-service
    // that the user is an admin of the page. For now, we create the post assuming the
    // API gateway or a separate middleware handles page admin verification.)

    const post = await Post.create({
      userId,
      pageId,
      content,
      type,
      mediaUrls,
      visibility: visibility || 'public'
    });

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create page post' });
  }
});

// User Reaction History - Get all reactions by a user
app.get('/users/:userId/reactions', async (req, res) => {
  try {
    const requesterId = req.header('x-user-id');
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Only allow users to fetch their own reaction history
    if (requesterId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Can only view your own reaction history' });
    }

    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const reactions = await Reaction.findAll({
      where: { userId },
      include: [{
        model: Post,
        attributes: ['id', 'content', 'userId', 'createdAt']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(reactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reaction history' });
  }
});

// Channel Analytics - Get analytics for a channel
app.get('/channels/:channelId/analytics', async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Get video count and total views
    const videos = await Video.findAll({
      where: { channelId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'videoCount'],
        [sequelize.fn('SUM', sequelize.col('views')), 'totalViews']
      ]
    });

    const analytics = {
      channelId: channel.id,
      channelName: channel.name,
      subscribers: channel.subscribers,
      videoCount: videos[0]?.dataValues?.videoCount || 0,
      totalViews: videos[0]?.dataValues?.totalViews || 0,
      averageViewsPerVideo: videos[0]?.dataValues?.videoCount > 0
        ? Math.round(videos[0]?.dataValues?.totalViews / videos[0]?.dataValues?.videoCount)
        : 0
    };

    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel analytics' });
  }
});

// Video Recommendations - Simple placeholder (returns popular videos)
app.get('/videos/:videoId/recommendations', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit = 10 } = req.query;

    const currentVideo = await Video.findByPk(videoId);
    if (!currentVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Simple recommendation: videos in same category, sorted by views
    const recommendations = await Video.findAll({
      where: {
        id: { [Op.ne]: videoId },
        category: currentVideo.category,
        visibility: 'public'
      },
      order: [['views', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(recommendations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch video recommendations' });
  }
});

// Group Files - Get files in a group
app.get('/groups/:groupId/files', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify group exists and check privacy
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // For non-public groups, require authentication and membership
    if (group.privacy !== 'public') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required for private group files' });
      }

      const membership = await GroupMember.findOne({
        where: { userId, groupId, status: 'active' }
      });
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }

    const files = await GroupFile.findAll({
      where: { groupId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch group files' });
  }
});

// Upload a file to a group
app.post('/groups/:groupId/files', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId } = req.params;
    const { fileName, fileUrl, fileType, fileSize, description } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'fileName and fileUrl are required' });
    }

    // Verify group membership
    const membership = await GroupMember.findOne({
      where: { userId, groupId, status: 'active' }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const file = await GroupFile.create({
      groupId,
      userId,
      fileName,
      fileUrl,
      fileType,
      fileSize,
      description
    });

    res.status(201).json(file);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete a group file
app.delete('/groups/:groupId/files/:fileId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId, fileId } = req.params;

    const file = await GroupFile.findByPk(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Ensure the file belongs to the group specified in the route
    if (String(file.groupId) !== String(groupId)) {
      return res.status(404).json({ error: 'File not found in this group' });
    }

    // Check if user is the file owner or group admin
    const membership = await GroupMember.findOne({
      where: { userId, groupId: file.groupId, status: 'active' }
    });

    if (!membership || (file.userId !== userId && membership.role === 'member')) {
      return res.status(403).json({ error: 'Unauthorized to delete this file' });
    }

    await file.destroy();
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Group Events - Get events in a group
app.get('/groups/:groupId/events', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { upcoming = 'true' } = req.query;

    // Verify group exists and check privacy
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // For non-public groups, require authentication and membership
    if (group.privacy !== 'public') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required for private group events' });
      }

      const membership = await GroupMember.findOne({
        where: { userId, groupId, status: 'active' }
      });
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }

    const whereClause = { groupId };
    if (upcoming === 'true') {
      whereClause.startDate = { [Op.gte]: new Date() };
    }

    const events = await GroupEvent.findAll({
      where: whereClause,
      order: [['startDate', 'ASC']]
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch group events' });
  }
});

// Create a group event
app.post('/groups/:groupId/events', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId } = req.params;
    const { title, description, location, startDate, endDate, coverImageUrl } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'title and startDate are required' });
    }

    // Verify group membership (admins/moderators can create events)
    const membership = await GroupMember.findOne({
      where: { userId, groupId, status: 'active' }
    });

    if (!membership || membership.role === 'member') {
      return res.status(403).json({ error: 'Only group admins/moderators can create events' });
    }

    const event = await GroupEvent.create({
      groupId,
      createdBy: userId,
      title,
      description,
      location,
      startDate,
      endDate,
      coverImageUrl
    });

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// RSVP to a group event
app.post('/events/:eventId/rsvp', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { eventId } = req.params;
    const { status } = req.body; // 'going', 'interested', 'not_going'

    if (!status || !['going', 'interested', 'not_going'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await GroupEvent.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify group membership for private/secret groups
    const group = await Group.findByPk(event.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.privacy !== 'public') {
      const membership = await GroupMember.findOne({
        where: { userId, groupId: group.id, status: 'active' }
      });
      if (!membership) {
        return res.status(403).json({ error: 'Must be a group member to RSVP to this event' });
      }
    }

    // Check or create RSVP
    const [attendee, created] = await GroupEventAttendee.findOrCreate({
      where: { eventId, userId },
      defaults: { status }
    });

    if (!created) {
      attendee.status = status;
      await attendee.save();
    }

    // Update attendee count
    const goingCount = await GroupEventAttendee.count({
      where: { eventId, status: 'going' }
    });
    await event.update({ attendeeCount: goingCount });

    res.json(attendee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to RSVP to event' });
  }
});

// Comment Voting - Upvote/Downvote a comment
app.post('/comments/:commentId/vote', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { commentId } = req.params;
    const { value } = req.body; // 1 for upvote, -1 for downvote

    if (!value || ![1, -1].includes(value)) {
      return res.status(400).json({ error: 'Invalid vote value. Use 1 for upvote, -1 for downvote' });
    }

    // Use transaction to ensure atomic updates
    const result = await sequelize.transaction(async (t) => {
      const comment = await Comment.findByPk(commentId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!comment) {
        return { type: 'not_found' };
      }

      // Check if user already voted
      let vote = await CommentVote.findOne({
        where: { commentId, userId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (vote) {
        const oldValue = vote.value;
        if (oldValue === value) {
          // Remove vote
          await vote.destroy({ transaction: t });
          await comment.decrement(value === 1 ? 'upvotes' : 'downvotes', { transaction: t });
          await comment.decrement('score', { by: value, transaction: t });
          await comment.reload({ transaction: t });
          return { type: 'removed', comment };
        } else {
          // Change vote
          vote.value = value;
          await vote.save({ transaction: t });
          await comment.increment(value === 1 ? 'upvotes' : 'downvotes', { transaction: t });
          await comment.decrement(oldValue === 1 ? 'upvotes' : 'downvotes', { transaction: t });
          await comment.increment('score', { by: value * 2, transaction: t }); // +2 or -2
        }
      } else {
        // Create new vote
        vote = await CommentVote.create({ commentId, userId, value }, { transaction: t });
        await comment.increment(value === 1 ? 'upvotes' : 'downvotes', { transaction: t });
        await comment.increment('score', { by: value, transaction: t });
      }

      await comment.reload({ transaction: t });
      return { type: 'voted', vote, comment };
    });

    if (result.type === 'not_found') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (result.type === 'removed') {
      return res.json({ message: 'Vote removed', vote: null, comment: result.comment });
    }

    res.json({ vote: result.vote, comment: result.comment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote on comment' });
  }
});

// Community Flairs - Get flairs for a community
app.get('/communities/:communityId/flairs', async (req, res) => {
  try {
    const { communityId } = req.params;

    const flairs = await Flair.findAll({
      where: { communityId },
      order: [['createdAt', 'ASC']]
    });

    res.json(flairs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch community flairs' });
  }
});

// Create a flair for a community
app.post('/communities/:communityId/flairs', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { communityId } = req.params;
    const { name, backgroundColor, textColor, type } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify user is community moderator/admin
    const membership = await CommunityMember.findOne({
      where: { userId, communityId }
    });

    if (!membership || membership.role === 'member') {
      return res.status(403).json({ error: 'Only moderators/admins can create flairs' });
    }

    const flair = await Flair.create({
      communityId,
      name,
      backgroundColor,
      textColor,
      type: type || 'post'
    });

    res.status(201).json(flair);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create flair' });
  }
});

// Live Streaming - Get live streams
app.get('/streams', async (req, res) => {
  try {
    const { status = 'live', limit = 20 } = req.query;

    const streams = await LiveStream.findAll({
      where: status ? { status } : {},
      order: [
        ['status', 'ASC'], // live first
        ['viewerCount', 'DESC']
      ],
      limit: parseInt(limit)
    });

    res.json(streams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch live streams' });
  }
});

// Create a live stream (placeholder)
app.post('/streams', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId, title, description, thumbnailUrl, scheduledStartTime, category } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Generate a secure stream key using crypto
    const streamKey = crypto.randomBytes(32).toString('hex');

    const stream = await LiveStream.create({
      userId,
      channelId,
      title,
      description,
      thumbnailUrl,
      streamKey,
      scheduledStartTime: scheduledStartTime || new Date(),
      category,
      status: 'scheduled'
    });

    res.status(201).json({
      ...stream.toJSON(),
      note: 'This is a placeholder. Actual streaming requires RTMP/HLS setup.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create live stream' });
  }
});

// Advanced Sorting - Get posts with advanced sorting
app.get('/posts/sorted', async (req, res) => {
  try {
    const { sort = 'new', limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let order;
    switch (sort) {
      case 'hot':
        // Hot algorithm: recent posts with high engagement
        // Simple version: score based on likes, comments, shares and recency
        // Note: For production with large datasets, consider pre-calculating this score
        // in a separate 'hotScore' field or adding indexes for better performance
        order = [
          [sequelize.literal('(likes + comments * 2 + shares * 3) / (EXTRACT(HOUR FROM (NOW() - "Post"."createdAt")) + 1)'), 'DESC']
        ];
        break;
      case 'top':
        // Top posts by total engagement
        order = [
          [sequelize.literal('(likes + comments * 2 + shares * 3)'), 'DESC']
        ];
        break;
      case 'rising':
        // Rising: recent posts with growing engagement
        // Posts from last 24 hours sorted by engagement
        order = [
          [sequelize.literal('(likes + comments * 2 + shares * 3)'), 'DESC'],
          ['createdAt', 'DESC']
        ];
        break;
      case 'controversial':
        // Controversial: posts with similar upvotes and downvotes
        // For now, use posts with high comment count but moderate likes
        order = [
          [sequelize.literal('ABS(comments - likes)'), 'ASC'],
          ['comments', 'DESC']
        ];
        break;
      case 'new':
      default:
        order = [['createdAt', 'DESC']];
    }

    const posts = await Post.findAll({
      where: {
        visibility: 'public',
        isPublished: true,
        ...(sort === 'rising' ? { createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } : {})
      },
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sorted posts' });
  }
});

// ========== PHASE 2: BLOGGER-INSPIRED BLOG/ARTICLE FEATURES ==========

// Helper function to calculate reading time
  const calculateReadingTime = (content) => {
    if (!content || typeof content !== 'string') {
      return 1; // Default to 1 minute if content is invalid
    }
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  };

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Create a blog post
app.post('/blogs', async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      category,
      tags,
      status,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Generate slug from title
    let slug = generateSlug(title);
    
    // Ensure slug is unique
    let counter = 1;
    let uniqueSlug = slug;
    while (await Blog.findOne({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    const blog = await Blog.create({
      userId,
      title,
      slug: uniqueSlug,
      content,
      excerpt: excerpt || (content && content.substring(0, 200)) || '',
      featuredImage,
      category,
      tags: tags || [],
      readingTime,
      status: status || 'draft',
      publishedAt: status === 'published' ? new Date() : null,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || '',
      metaKeywords: metaKeywords || tags || []
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Get all published blogs (public)
app.get('/blogs/public', async (req, res) => {
  try {
    const { category, tag, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { status: 'published' };

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }

    const blogs = await Blog.findAll({
      where,
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['content'] } // Don't return full content in list
    });

    res.json(blogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get a single blog by slug (public)
app.get('/blogs/public/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({
      where: { slug: req.params.slug, status: 'published' },
      include: [
        {
          model: BlogComment,
          where: { isApproved: true },
          required: false,
          include: [
            {
              model: BlogComment,
              as: 'Replies',
              required: false
            }
          ]
        }
      ]
    });

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Increment view count
    await blog.increment('views');

    res.json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Get user's blogs (authenticated)
app.get('/blogs/user/:userId', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get authenticated user ID from header
    const authUserId = req.header('x-user-id');
    if (!authUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Ensure user can only access their own drafts
    if (authUserId !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where = { userId: req.params.userId };

    if (status) {
      where.status = status;
    }

    const blogs = await Blog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(blogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Update a blog post
app.put('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    if (blog.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      title,
      content,
      excerpt,
      featuredImage,
      category,
      tags,
      status,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // If title changed, regenerate slug
    if (title && title !== blog.title) {
      let slug = generateSlug(title);
      let counter = 1;
      let uniqueSlug = slug;
      while (await Blog.findOne({ where: { slug: uniqueSlug, id: { [Op.ne]: blog.id } } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      blog.slug = uniqueSlug;
      blog.title = title;
    }

    // Update fields
    if (content) {
      blog.content = content;
      blog.readingTime = calculateReadingTime(content);
    }
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;
    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (metaKeywords !== undefined) blog.metaKeywords = metaKeywords;

    // Handle status change
    if (status && status !== blog.status) {
      blog.status = status;
      if (status === 'published' && !blog.publishedAt) {
        blog.publishedAt = new Date();
      }
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete a blog post
app.delete('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    if (blog.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await blog.destroy();
    res.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Like a blog post
app.post('/blogs/:id/like', async (req, res) => {
  try {
    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const blog = await Blog.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    await blog.increment('likes');
    res.json({ message: 'Blog liked', likes: blog.likes + 1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to like blog' });
  }
});

// Add comment to blog
app.post('/blogs/:blogId/comments', async (req, res) => {
  try {
    const { content, parentId } = req.body;

    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify blog exists
    const blog = await Blog.findByPk(req.params.blogId);
    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const comment = await BlogComment.create({
      blogId: req.params.blogId,
      userId,
      content,
      parentId: parentId || null
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get blog comments
app.get('/blogs/:blogId/comments', async (req, res) => {
  try {
    const comments = await BlogComment.findAll({
      where: {
        blogId: req.params.blogId,
        isApproved: true,
        parentId: null // Get only top-level comments
      },
      include: [
        {
          model: BlogComment,
          as: 'Replies',
          where: { isApproved: true },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get all blog categories (public)
app.get('/blogs/categories/all', async (req, res) => {
  try {
    const categories = await BlogCategory.findAll({
      order: [['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create blog category (requires authentication)
app.post('/blogs/categories', async (req, res) => {
  try {
    // Get authenticated user ID from header
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = generateSlug(name);

    // Check if already exists
    const existing = await BlogCategory.findOne({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await BlogCategory.create({
      name,
      slug,
      description
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.listen(PORT, () => {
  console.log(`Content service running on port ${PORT}`);
});
