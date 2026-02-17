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

// Phase 4: Advanced caching integration
let cacheEnabled = false;
let cachePostFeed, cachePost, cacheComments, cacheWikiPages, cacheWikiPage, cacheVideos;
let invalidatePostCaches, invalidateWikiPageCaches;

try {
  const cacheIntegration = require('./cache-integration');
  cachePostFeed = cacheIntegration.cachePostFeed;
  cachePost = cacheIntegration.cachePost;
  cacheComments = cacheIntegration.cacheComments;
  cacheWikiPages = cacheIntegration.cacheWikiPages;
  cacheWikiPage = cacheIntegration.cacheWikiPage;
  cacheVideos = cacheIntegration.cacheVideos;
  invalidatePostCaches = cacheIntegration.invalidatePostCaches;
  invalidateWikiPageCaches = cacheIntegration.invalidateWikiPageCaches;
  cacheEnabled = true;
  console.log('[Cache] Advanced Redis caching enabled for content-service');
} catch (error) {
  console.log('[Cache] Advanced caching disabled, using basic Redis client');
  // Create no-op middleware for when caching is disabled
  cachePostFeed = (req, res, next) => next();
  cachePost = (req, res, next) => next();
  cacheComments = (req, res, next) => next();
  cacheWikiPages = (req, res, next) => next();
  cacheWikiPage = (req, res, next) => next();
  cacheVideos = (req, res, next) => next();
  invalidatePostCaches = async () => { };
  invalidateWikiPageCaches = async () => { };
}

// Phase 4: Monitoring and health checks
let healthChecker;
try {
  const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
  healthChecker = new HealthChecker('content-service');

  // Register database and Redis health checks
  healthChecker.registerCheck('database', () => checkDatabase(sequelize));
  healthChecker.registerCheck('redis', () => checkRedis(redis));

  // Add metrics middleware
  app.use(healthChecker.metricsMiddleware());

  console.log('[Monitoring] Health checks and metrics enabled');
} catch (error) {
  console.log('[Monitoring] Advanced monitoring disabled');
}

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

// Follow model for feed filtering (who a user follows)
const UserFollow = sequelize.define('UserFollow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  followerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  followedId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followedId']
    }
  ]
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

// NEW: Phase 5 - Blog Tag Model (replacing array-based tags)
const BlogTag = sequelize.define('BlogTag', {
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
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: DataTypes.TEXT,
  color: {
    type: DataTypes.STRING,
    defaultValue: '#2196f3'
  },
  blogCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 5 - Blog-Tag Junction Table
const BlogTagAssociation = sequelize.define('BlogTagAssociation', {
  blogId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  tagId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['blogId', 'tagId']
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
Blog.belongsToMany(BlogTag, { through: BlogTagAssociation, foreignKey: 'blogId', as: 'blogTags' });
BlogTag.belongsToMany(Blog, { through: BlogTagAssociation, foreignKey: 'tagId' });

// Phase 6: Content Archiving System
const Archive = sequelize.define('Archive', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contentType: {
    type: DataTypes.ENUM('post', 'comment', 'blog', 'video', 'wiki'),
    allowNull: false,
    comment: 'Type of content being archived'
  },
  contentId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Original content ID'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns the content'
  },
  contentData: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Complete archived content with metadata'
  },
  archivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When content was archived'
  },
  reason: {
    type: DataTypes.ENUM('auto', 'manual', 'policy', 'moderation', 'deletion'),
    defaultValue: 'auto',
    comment: 'Why content was archived'
  },
  restoreCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times content was restored'
  },
  lastRestored: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time content was restored'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When archive should be deleted (null = never)'
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: 'Additional archive metadata (size, compression, etc.)'
  }
}, {
  indexes: [
    { fields: ['contentType'] },
    { fields: ['contentId'] },
    { fields: ['userId'] },
    { fields: ['archivedAt'] },
    { fields: ['reason'] },
    { fields: ['expiresAt'] }
  ]
});

// Phase 6: Saved Search/Filter System
const SavedSearch = sequelize.define('SavedSearch', {
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
    allowNull: false,
    comment: 'User-defined name for saved search'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Optional description'
  },
  contentType: {
    type: DataTypes.ENUM('post', 'blog', 'video', 'wiki', 'all'),
    defaultValue: 'all'
  },
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Search filters and criteria'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether search is public/shareable'
  },
  useCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times used'
  },
  lastUsed: {
    type: DataTypes.DATE,
    comment: 'Last time search was executed'
  }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['contentType'] },
    { fields: ['isPublic'] }
  ]
});

const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true' || process.env.NODE_ENV !== 'production';
const shouldForceSchema = process.env.DB_SYNC_FORCE === 'true';

async function startServer() {
  try {
    await sequelize.sync({ alter: shouldAlterSchema, force: shouldForceSchema });

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

    app.listen(PORT, () => {
      console.log(`Content service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Routes

// Health check (basic liveness probe)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-service' });
});

// Readiness check (detailed health with dependencies)
app.get('/health/ready', async (req, res) => {
  if (!healthChecker) {
    return res.json({ status: 'healthy', service: 'content-service', message: 'Basic health check' });
  }

  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  if (!healthChecker) {
    return res.type('text/plain').send('# Metrics not available\n');
  }

  const metrics = healthChecker.getPrometheusMetrics();
  res.type('text/plain').send(metrics);
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

// Follow a user (requires auth via gateway)
app.post('/follows', async (req, res) => {
  try {
    const followerId = req.header('x-user-id');
    const { followedId } = req.body || {};

    if (!followerId || !followedId) {
      return res.status(400).json({ error: 'followerId and followedId are required' });
    }

    if (followerId === followedId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const [follow, created] = await UserFollow.findOrCreate({
      where: { followerId, followedId }
    });

    res.status(created ? 201 : 200).json(follow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user (requires auth via gateway)
app.delete('/follows/:followedId', async (req, res) => {
  try {
    const followerId = req.header('x-user-id');
    const { followedId } = req.params;

    if (!followerId || !followedId) {
      return res.status(400).json({ error: 'followerId and followedId are required' });
    }

    const removed = await UserFollow.destroy({ where: { followerId, followedId } });
    res.json({ removed: removed > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get following list for a user
app.get('/follows/:userId', async (req, res) => {
  try {
    const follows = await UserFollow.findAll({
      where: { followerId: req.params.userId },
      attributes: ['followedId']
    });

    res.json({ following: follows.map((f) => f.followedId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch following list' });
  }
});

// Get user feed
app.get('/feed/:userId', cachePostFeed, async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'for_you' } = req.query;
    const offset = (page - 1) * limit;

    let where = { isPublished: true };
    let order = [['createdAt', 'DESC']];

    if (filter === 'following') {
      const followRows = await UserFollow.findAll({
        where: { followerId: req.params.userId },
        attributes: ['followedId']
      });
      const followingIds = followRows.map((row) => row.followedId);

      where = {
        isPublished: true,
        [Op.or]: [
          { userId: req.params.userId },
          { userId: { [Op.in]: followingIds }, visibility: 'public' }
        ]
      };
      order = [['createdAt', 'DESC']];
    } else if (filter === 'trending') {
      where = { visibility: 'public', isPublished: true };
      order = [
        [sequelize.literal('(likes + comments * 2 + shares * 3) / (EXTRACT(HOUR FROM (NOW() - "Post"."createdAt")) + 1)'), 'DESC']
      ];
    } else if (filter === 'recent') {
      where = {
        isPublished: true,
        [Op.or]: [
          { userId: req.params.userId },
          { visibility: 'public' }
        ]
      };
      order = [['createdAt', 'DESC']];
    } else {
      // for_you (default)
      where = {
        isPublished: true,
        [Op.or]: [
          { userId: req.params.userId },
          { visibility: 'public' }
        ]
      };
    }

    const posts = await Post.findAll({
      where,
      order,
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

    // Invalidate cache after successful creation
    if (cacheEnabled) {
      await invalidatePostCaches(postId);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for post
app.get('/posts/:postId/comments', cacheComments, async (req, res) => {
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
      tags, // Now expects array of tag names or IDs
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
      tags: tags || [], // Keep for backward compatibility
      readingTime,
      status: status || 'draft',
      publishedAt: status === 'published' ? new Date() : null,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || '',
      metaKeywords: metaKeywords || tags || []
    });

    // Handle new tag model (Phase 5)
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagNameOrId of tags) {
        let tag;

        // Check if it's a UUID (existing tag ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNameOrId);

        if (isUUID) {
          tag = await BlogTag.findByPk(tagNameOrId);
        } else {
          // It's a tag name - find or create
          const tagSlug = tagNameOrId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          tag = await BlogTag.findOne({ where: { slug: tagSlug } });

          if (!tag) {
            tag = await BlogTag.create({
              name: tagNameOrId,
              slug: tagSlug,
              blogCount: 0
            });
          }
        }

        if (tag) {
          await BlogTagAssociation.create({
            blogId: blog.id,
            tagId: tag.id
          });
          await tag.increment('blogCount');
        }
      }
    }

    // Fetch blog with tags
    const blogWithTags = await Blog.findByPk(blog.id, {
      include: [
        {
          model: BlogTag,
          as: 'blogTags',
          attributes: ['id', 'name', 'slug', 'color']
        }
      ]
    });

    res.status(201).json(blogWithTags);
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
      attributes: { exclude: ['content'] }, // Don't return full content in list
      include: [
        {
          model: BlogTag,
          as: 'blogTags',
          attributes: ['id', 'name', 'slug', 'color']
        }
      ]
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
          model: BlogTag,
          as: 'blogTags',
          attributes: ['id', 'name', 'slug', 'color']
        },
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
    if (tags !== undefined) blog.tags = tags; // Keep for backward compatibility
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

    // Handle tag updates (Phase 5)
    if (tags !== undefined && Array.isArray(tags)) {
      // Remove all existing tag associations
      const existingAssociations = await BlogTagAssociation.findAll({
        where: { blogId: blog.id }
      });

      for (const assoc of existingAssociations) {
        const tag = await BlogTag.findByPk(assoc.tagId);
        if (tag) {
          await tag.decrement('blogCount');
        }
      }

      await BlogTagAssociation.destroy({ where: { blogId: blog.id } });

      // Add new tag associations
      for (const tagNameOrId of tags) {
        let tag;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNameOrId);

        if (isUUID) {
          tag = await BlogTag.findByPk(tagNameOrId);
        } else {
          const tagSlug = tagNameOrId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          tag = await BlogTag.findOne({ where: { slug: tagSlug } });

          if (!tag) {
            tag = await BlogTag.create({
              name: tagNameOrId,
              slug: tagSlug,
              blogCount: 0
            });
          }
        }

        if (tag) {
          await BlogTagAssociation.create({
            blogId: blog.id,
            tagId: tag.id
          });
          await tag.increment('blogCount');
        }
      }
    }

    // Fetch blog with tags
    const blogWithTags = await Blog.findByPk(blog.id, {
      include: [
        {
          model: BlogTag,
          as: 'blogTags',
          attributes: ['id', 'name', 'slug', 'color']
        }
      ]
    });

    res.json(blogWithTags);
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

    // Decrement tag counts (Phase 5)
    const tagAssociations = await BlogTagAssociation.findAll({
      where: { blogId: blog.id }
    });

    for (const assoc of tagAssociations) {
      const tag = await BlogTag.findByPk(assoc.tagId);
      if (tag) {
        await tag.decrement('blogCount');
      }
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

// ==================== PHASE 5: BLOG TAG MANAGEMENT APIs ====================

// Get all blog tags
app.get('/blogs/tags', async (req, res) => {
  try {
    const { sort = 'name', limit = 50 } = req.query;

    const orderBy = sort === 'popular' ? [['blogCount', 'DESC']] : [['name', 'ASC']];

    const tags = await BlogTag.findAll({
      order: orderBy,
      limit: parseInt(limit)
    });

    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get popular/trending blog tags
app.get('/blogs/tags/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const tags = await BlogTag.findAll({
      where: {
        blogCount: { [Op.gt]: 0 }
      },
      order: [['blogCount', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trending tags' });
  }
});

// Create a new blog tag (admin/moderator only)
app.post('/blogs/tags', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if already exists
    const existing = await BlogTag.findOne({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    const tag = await BlogTag.create({
      name,
      slug,
      description,
      color: color || '#2196f3'
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Get blogs by tag
app.get('/blogs/tags/:tagSlug/blogs', async (req, res) => {
  try {
    const { tagSlug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const tag = await BlogTag.findOne({ where: { slug: tagSlug } });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const blogs = await tag.getBlogs({
      where: { status: 'published' },
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: BlogTag,
          as: 'blogTags',
          attributes: ['id', 'name', 'slug', 'color']
        }
      ]
    });

    res.json({
      tag,
      blogs,
      total: tag.blogCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blogs by tag' });
  }
});

// Update a blog tag (admin/moderator only)
app.put('/blogs/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const tag = await BlogTag.findByPk(id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (name) {
      tag.name = name;
      tag.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description !== undefined) tag.description = description;
    if (color !== undefined) tag.color = color;

    await tag.save();

    res.json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete a blog tag (admin/moderator only)
app.delete('/blogs/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await BlogTag.findByPk(id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Remove all associations
    await BlogTagAssociation.destroy({ where: { tagId: id } });

    await tag.destroy();

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// ==================== PHASE 3: ANALYTICS & INSIGHTS APIs ====================

// Get user analytics
app.get('/analytics/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get post stats
    const totalPosts = await Post.count({ where: { userId } });
    const periodPostCount = await Post.count({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      }
    });

    // Get engagement stats
    const posts = await Post.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('likes')), 'totalLikes'],
        [sequelize.fn('SUM', sequelize.col('comments')), 'totalComments'],
        [sequelize.fn('SUM', sequelize.col('shares')), 'totalShares'],
        [sequelize.fn('AVG', sequelize.col('likes')), 'avgLikes']
      ],
      raw: true
    });

    const periodPostEngagement = await Post.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('likes')), 'periodLikes'],
        [sequelize.fn('SUM', sequelize.col('comments')), 'periodComments'],
        [sequelize.fn('SUM', sequelize.col('shares')), 'periodShares']
      ],
      raw: true
    });

    // Get comment stats
    const totalComments = await Comment.count({ where: { userId } });
    const periodComments = await Comment.count({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      }
    });

    // Get blog stats if BlogPost model exists
    let blogStats = { total: 0, periodBlogs: 0 };
    try {
      const BlogPost = sequelize.models.BlogPost;
      if (BlogPost) {
        blogStats.total = await BlogPost.count({ where: { userId } });
        blogStats.periodBlogs = await BlogPost.count({
          where: {
            userId,
            createdAt: { [Op.gte]: startDate }
          }
        });
      }
    } catch (err) {
      // BlogPost model doesn't exist
    }

    // Get video stats if Video model exists
    let videoStats = { total: 0, periodVideos: 0, totalViews: 0 };
    try {
      const Video = sequelize.models.Video;
      if (Video) {
        videoStats.total = await Video.count({ where: { userId } });
        videoStats.periodVideos = await Video.count({
          where: {
            userId,
            createdAt: { [Op.gte]: startDate }
          }
        });
        const views = await Video.findAll({
          where: { userId },
          attributes: [[sequelize.fn('SUM', sequelize.col('views')), 'totalViews']],
          raw: true
        });
        videoStats.totalViews = parseInt(views[0]?.totalViews || 0);
      }
    } catch (err) {
      // Video model doesn't exist
    }

    // Activity timeline (posts per day in period)
    const timeline = await Post.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      period: parseInt(period),
      posts: {
        total: totalPosts,
        period: periodPostCount,
        totalLikes: parseInt(posts[0]?.totalLikes || 0),
        totalComments: parseInt(posts[0]?.totalComments || 0),
        totalShares: parseInt(posts[0]?.totalShares || 0),
        avgLikes: parseFloat(posts[0]?.avgLikes || 0).toFixed(2),
        periodLikes: parseInt(periodPostEngagement[0]?.periodLikes || 0),
        periodComments: parseInt(periodPostEngagement[0]?.periodComments || 0),
        periodShares: parseInt(periodPostEngagement[0]?.periodShares || 0)
      },
      comments: {
        total: totalComments,
        period: periodComments
      },
      blogs: blogStats,
      videos: videoStats,
      timeline
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Get content analytics (top posts, trending, etc.)
app.get('/analytics/content', async (req, res) => {
  try {
    const { period = '7', limit = 10 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Top posts by engagement
    const topPosts = await Post.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'id',
        'userId',
        'content',
        'likes',
        'comments',
        'shares',
        'createdAt',
        [sequelize.literal('likes + (comments * 2) + (shares * 3)'), 'engagement']
      ],
      order: [[sequelize.literal('likes + (comments * 2) + (shares * 3)'), 'DESC']],
      limit: parseInt(limit)
    });

    // Hashtag trends (if hashtags exist)
    let trendingHashtags = [];
    try {
      const Hashtag = sequelize.models.Hashtag;
      if (Hashtag) {
        trendingHashtags = await Hashtag.findAll({
          where: {
            lastUsed: { [Op.gte]: startDate }
          },
          order: [['count', 'DESC']],
          limit: 10,
          attributes: ['name', 'count']
        });
      }
    } catch (err) {
      // Hashtag model doesn't exist
    }

    // Content type distribution
    const contentTypes = await Post.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Engagement trends over time
    const engagementTrend = await Post.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('likes')), 'totalLikes'],
        [sequelize.fn('SUM', sequelize.col('comments')), 'totalComments'],
        [sequelize.fn('SUM', sequelize.col('shares')), 'totalShares']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      period: parseInt(period),
      topPosts,
      trendingHashtags,
      contentTypes,
      engagementTrend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch content analytics' });
  }
});

// Get engagement metrics summary
app.get('/analytics/engagement', async (req, res) => {
  try {
    const { userId } = req.query;
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const where = { createdAt: { [Op.gte]: startDate } };
    if (userId) {
      where.userId = userId;
    }

    // Total engagement
    const totalPosts = await Post.count({ where });
    const totalComments = await Comment.count({ where });

    const engagement = await Post.findAll({
      where,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('likes')), 'totalLikes'],
        [sequelize.fn('SUM', sequelize.col('comments')), 'totalComments'],
        [sequelize.fn('SUM', sequelize.col('shares')), 'totalShares']
      ],
      raw: true
    });

    // Engagement rate (likes + comments + shares) / posts
    const totalEngagement =
      parseInt(engagement[0]?.totalLikes || 0) +
      parseInt(engagement[0]?.totalComments || 0) +
      parseInt(engagement[0]?.totalShares || 0);

    const engagementRate = totalPosts > 0 ? (totalEngagement / totalPosts).toFixed(2) : 0;

    // Best posting times (hour of day with most engagement)
    const hourlyEngagement = await Post.findAll({
      where,
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal("HOUR FROM \"createdAt\"")), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'postCount'],
        [sequelize.fn('AVG', sequelize.col('likes')), 'avgLikes']
      ],
      group: [sequelize.fn('EXTRACT', sequelize.literal("HOUR FROM \"createdAt\""))],
      order: [[sequelize.fn('AVG', sequelize.col('likes')), 'DESC']],
      limit: 5,
      raw: true
    });

    res.json({
      period: parseInt(period),
      totalPosts,
      totalComments,
      totalLikes: parseInt(engagement[0]?.totalLikes || 0),
      totalShares: parseInt(engagement[0]?.totalShares || 0),
      engagementRate: parseFloat(engagementRate),
      bestPostingHours: hourlyEngagement.map(h => ({
        hour: parseInt(h.hour),
        postCount: parseInt(h.postCount),
        avgLikes: parseFloat(h.avgLikes).toFixed(2)
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

// ==================== END ANALYTICS & INSIGHTS ====================

// ==================== PHASE 3: ADVANCED SEARCH APIs ====================

// Unified search across content
app.get('/search', async (req, res) => {
  try {
    const {
      query,
      type = 'all', // all, posts, comments, users
      sortBy = 'relevance', // relevance, date, popularity
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      userId,
      hashtag
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${query}%`;
    const results = {};
    const offset = (page - 1) * limit;

    // Build date filter
    const dateFilter = {};
    if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
    if (dateTo) dateFilter[Op.lte] = new Date(dateTo);
    const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postWhere = {
        content: { [Op.iLike]: searchTerm },
        ...dateWhere
      };
      if (userId) postWhere.userId = userId;

      let postOrder = [['createdAt', 'DESC']];
      if (sortBy === 'popularity') {
        postOrder = [[sequelize.literal('likes + comments + shares'), 'DESC']];
      }

      const posts = await Post.findAll({
        where: postWhere,
        limit: parseInt(limit),
        offset,
        order: postOrder
      });

      results.posts = {
        items: posts,
        count: posts.length
      };
    }

    // Search comments
    if (type === 'all' || type === 'comments') {
      const commentWhere = {
        content: { [Op.iLike]: searchTerm },
        ...dateWhere
      };
      if (userId) commentWhere.userId = userId;

      const comments = await Comment.findAll({
        where: commentWhere,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      results.comments = {
        items: comments,
        count: comments.length
      };
    }

    // Search by hashtag
    if (hashtag) {
      try {
        const PostHashtag = sequelize.models.PostHashtag;
        const Hashtag = sequelize.models.Hashtag;

        if (PostHashtag && Hashtag) {
          const tag = await Hashtag.findOne({
            where: { name: hashtag.toLowerCase() }
          });

          if (tag) {
            const postIds = await PostHashtag.findAll({
              where: { hashtagId: tag.id },
              attributes: ['postId']
            });

            const hashtagPosts = await Post.findAll({
              where: {
                id: { [Op.in]: postIds.map(p => p.postId) },
                ...dateWhere
              },
              limit: parseInt(limit),
              offset
            });

            results.hashtagPosts = {
              items: hashtagPosts,
              count: hashtagPosts.length,
              hashtag: tag.name
            };
          }
        }
      } catch (err) {
        console.error('Hashtag search error:', err);
      }
    }

    // Search blogs
    if (type === 'all' || type === 'blogs') {
      try {
        const BlogPost = sequelize.models.BlogPost;
        if (BlogPost) {
          const blogWhere = {
            [Op.or]: [
              { title: { [Op.iLike]: searchTerm } },
              { content: { [Op.iLike]: searchTerm } }
            ],
            status: 'published',
            ...dateWhere
          };
          if (userId) blogWhere.userId = userId;

          const blogs = await BlogPost.findAll({
            where: blogWhere,
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']]
          });

          results.blogs = {
            items: blogs,
            count: blogs.length
          };
        }
      } catch (err) {
        console.error('Blog search error:', err);
      }
    }

    res.json({
      query,
      type,
      page: parseInt(page),
      limit: parseInt(limit),
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Advanced search with filters
app.post('/search/advanced', async (req, res) => {
  try {
    const {
      keywords,
      contentType = 'posts',
      filters = {},
      sortBy = 'date',
      page = 1,
      limit = 20
    } = req.body;

    if (!keywords || keywords.trim().length < 2) {
      return res.status(400).json({ error: 'Keywords required' });
    }

    const searchTerm = `%${keywords}%`;
    const offset = (page - 1) * limit;

    // Build where clause based on filters
    const where = {
      content: { [Op.iLike]: searchTerm }
    };

    // Apply filters
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom) {
      where.createdAt = where.createdAt || {};
      where.createdAt[Op.gte] = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt = where.createdAt || {};
      where.createdAt[Op.lte] = new Date(filters.dateTo);
    }
    if (filters.type) where.type = filters.type;
    if (filters.minLikes) {
      where.likes = { [Op.gte]: parseInt(filters.minLikes) };
    }

    // Determine sort order
    let order = [['createdAt', 'DESC']];
    if (sortBy === 'popularity') {
      order = [['likes', 'DESC']];
    } else if (sortBy === 'comments') {
      order = [['comments', 'DESC']];
    }

    const { count, rows } = await Post.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order
    });

    res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      filters
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Advanced search failed' });
  }
});

// Get search suggestions
app.get('/search/suggestions', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = `%${query}%`;
    const suggestions = [];

    // Get hashtag suggestions
    try {
      const Hashtag = sequelize.models.Hashtag;
      if (Hashtag) {
        const hashtags = await Hashtag.findAll({
          where: { name: { [Op.iLike]: searchTerm } },
          limit: 5,
          order: [['count', 'DESC']],
          attributes: ['name', 'count']
        });
        suggestions.push(...hashtags.map(h => ({
          type: 'hashtag',
          value: h.name,
          label: `#${h.name} (${h.count} posts)`
        })));
      }
    } catch (err) {
      console.error('Hashtag suggestions error:', err);
    }

    // Get recent search terms (if we had a search history table)
    // This would require a SearchHistory model

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Save search (for search history - optional)
app.post('/search/history', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, type } = req.body;

    // Cache search in Redis for quick recent searches
    const searchKey = `search:history:${userId}`;
    await redis.lpush(searchKey, JSON.stringify({ query, type, timestamp: Date.now() }));
    await redis.ltrim(searchKey, 0, 19); // Keep last 20 searches
    await redis.expire(searchKey, 30 * 24 * 60 * 60); // 30 days

    res.json({ message: 'Search saved to history' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// Get search history
app.get('/search/history', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchKey = `search:history:${userId}`;
    const history = await redis.lrange(searchKey, 0, 19);
    const searches = history.map(h => JSON.parse(h));

    res.json({ history: searches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// ==================== END ADVANCED SEARCH ====================

// ==================== ELASTICSEARCH INTEGRATION ====================

const { Client } = require('@elastic/elasticsearch');

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD
  } : undefined
});

// Initialize Elasticsearch indices if they don't exist
async function initializeElasticsearchIndices() {
  try {
    // Posts index
    const postsIndexExists = await esClient.indices.exists({ index: 'posts' });
    if (!postsIndexExists) {
      await esClient.indices.create({
        index: 'posts',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                text_analyzer: {
                  type: 'standard',
                  stopwords: '_english_'
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              communityId: { type: 'keyword' },
              content: { type: 'text', analyzer: 'text_analyzer' },
              type: { type: 'keyword' },
              visibility: { type: 'keyword' },
              likes: { type: 'integer' },
              comments: { type: 'integer' },
              createdAt: { type: 'date' },
              isPublished: { type: 'boolean' }
            }
          }
        }
      });
    }

    // Comments index
    const commentsIndexExists = await esClient.indices.exists({ index: 'comments' });
    if (!commentsIndexExists) {
      await esClient.indices.create({
        index: 'comments',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                text_analyzer: {
                  type: 'standard',
                  stopwords: '_english_'
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              postId: { type: 'keyword' },
              userId: { type: 'keyword' },
              content: { type: 'text', analyzer: 'text_analyzer' },
              upvotes: { type: 'integer' },
              downvotes: { type: 'integer' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
    }

    // Videos index
    const videosIndexExists = await esClient.indices.exists({ index: 'videos' });
    if (!videosIndexExists) {
      await esClient.indices.create({
        index: 'videos',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                text_analyzer: {
                  type: 'standard',
                  stopwords: '_english_'
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              title: { type: 'text', analyzer: 'text_analyzer' },
              description: { type: 'text', analyzer: 'text_analyzer' },
              views: { type: 'integer' },
              likes: { type: 'integer' },
              category: { type: 'keyword' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
    }

    console.log('Elasticsearch indices initialized successfully');
  } catch (error) {
    if (error.message.includes('Index already exists')) {
      console.log('Elasticsearch indices already exist');
    } else {
      console.error('Failed to initialize Elasticsearch indices:', error.message);
    }
  }
}

// Index a post to Elasticsearch
async function indexPost(post) {
  try {
    await esClient.index({
      index: 'posts',
      id: post.id,
      body: {
        id: post.id,
        userId: post.userId,
        communityId: post.communityId,
        content: post.content,
        type: post.type,
        visibility: post.visibility,
        likes: post.likes,
        comments: post.comments,
        createdAt: post.createdAt,
        isPublished: post.isPublished
      }
    });
  } catch (error) {
    console.error('Failed to index post:', error.message);
  }
}

// Index a comment to Elasticsearch
async function indexComment(comment) {
  try {
    await esClient.index({
      index: 'comments',
      id: comment.id,
      body: {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        content: comment.content,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    console.error('Failed to index comment:', error.message);
  }
}

// Index a video to Elasticsearch
async function indexVideo(video) {
  try {
    await esClient.index({
      index: 'videos',
      id: video.id,
      body: {
        id: video.id,
        userId: video.userId,
        title: video.title,
        description: video.description,
        views: video.views,
        likes: video.likes,
        category: video.category,
        createdAt: video.createdAt
      }
    });
  } catch (error) {
    console.error('Failed to index video:', error.message);
  }
}

// Advanced Elasticsearch search across all content types
app.post('/search/elasticsearch', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, type = 'all', limit = 20, offset = 0, filters = {} } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const indices = type === 'all' ? ['posts', 'comments', 'videos'] : [type];

    const searchQuery = {
      bool: {
        must: [
          {
            multi_match: {
              query: query,
              fields: type === 'posts' ? ['content'] :
                type === 'comments' ? ['content'] :
                  type === 'videos' ? ['title', 'description'] :
                    ['content', 'title', 'description']
            }
          }
        ],
        filter: []
      }
    };

    // Add custom filters
    if (filters.visibility && type === 'posts') {
      searchQuery.bool.filter.push({ term: { visibility: filters.visibility } });
    }
    if (filters.category && type === 'videos') {
      searchQuery.bool.filter.push({ term: { category: filters.category } });
    }
    if (filters.minLikes) {
      searchQuery.bool.filter.push({ range: { likes: { gte: filters.minLikes } } });
    }
    if (filters.fromDate) {
      searchQuery.bool.filter.push({ range: { createdAt: { gte: filters.fromDate } } });
    }

    // Search Elasticsearch
    const searchResults = await esClient.search({
      index: indices.join(','),
      body: {
        query: searchQuery,
        size: limit,
        from: offset,
        highlight: {
          fields: {
            content: { pre_tags: ['<em>'], post_tags: ['</em>'] },
            title: { pre_tags: ['<em>'], post_tags: ['</em>'] },
            description: { pre_tags: ['<em>'], post_tags: ['</em>'] }
          }
        }
      }
    });

    const hits = searchResults.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      index: hit._index,
      ...hit._source,
      highlight: hit.highlight
    }));

    res.json({
      results: hits,
      total: searchResults.hits.total.value,
      query: query,
      offset: offset,
      limit: limit
    });
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Search with aggregations (trending, popular)
app.get('/search/trending', async (req, res) => {
  try {
    const { type = 'posts', days = 7, limit = 10 } = req.query;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const results = await esClient.search({
      index: type,
      body: {
        query: {
          range: {
            createdAt: { gte: startDate.toISOString() }
          }
        },
        aggs: {
          trending: {
            terms: {
              field: type === 'posts' ? 'content' : 'title',
              size: limit,
              min_doc_count: 2
            },
            aggs: {
              total_likes: { sum: { field: 'likes' } },
              total_interactions: { sum: { field: type === 'posts' ? 'comments' : 'views' } }
            }
          }
        },
        size: 0
      }
    });

    const trendingItems = results.aggregations.trending.buckets.map(bucket => ({
      value: bucket.key,
      count: bucket.doc_count,
      totalLikes: bucket.total_likes.value,
      totalInteractions: bucket.total_interactions.value,
      score: (bucket.total_likes.value * 0.7) + (bucket.total_interactions.value * 0.3)
    })).sort((a, b) => b.score - a.score);

    res.json({ trending: trendingItems });
  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({ error: 'Trending search failed' });
  }
});

// Search analytics - get search statistics
app.get('/search/analytics', async (req, res) => {
  try {
    const { type = 'posts', days = 30 } = req.query;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const results = await esClient.search({
      index: type,
      body: {
        query: {
          range: {
            createdAt: { gte: startDate.toISOString() }
          }
        },
        aggs: {
          daily_distribution: {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'day'
            }
          },
          avg_engagement: {
            avg: {
              field: type === 'posts' ? 'likes' : type === 'comments' ? 'upvotes' : 'views'
            }
          },
          visibility_distribution: {
            terms: {
              field: 'visibility',
              size: 5
            }
          }
        },
        size: 0
      }
    });

    res.json({
      totalDocuments: results.hits.total.value,
      dailyDistribution: results.aggregations.daily_distribution.buckets,
      avgEngagement: results.aggregations.avg_engagement.value,
      visibilityDistribution: results.aggregations.visibility_distribution.buckets
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Analytics calculation failed' });
  }
});

// Autocomplete suggestions
app.get('/search/suggest', async (req, res) => {
  try {
    const { query, type = 'posts', limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const suggestionField = type === 'posts' ? 'content' :
      type === 'comments' ? 'content' :
        type === 'videos' ? 'title' : 'content';

    const results = await esClient.search({
      index: type,
      body: {
        query: {
          match_phrase_prefix: {
            [suggestionField]: {
              query: query,
              boost: 2
            }
          }
        },
        size: limit,
        _source: [suggestionField]
      }
    });

    const suggestions = results.hits.hits
      .map(hit => hit._source[suggestionField])
      .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
      .slice(0, limit);

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ error: 'Suggestion failed' });
  }
});

// Bulk indexing endpoint (for maintenance/reindexing)
app.post('/search/reindex', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin (basic check via header)
    const isAdmin = req.header('x-user-role') === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    const { type = 'all' } = req.body;

    const types = type === 'all' ? ['posts', 'comments', 'videos'] : [type];
    const results = {};

    for (const contentType of types) {
      try {
        // Delete existing index
        await esClient.indices.delete({ index: contentType }).catch(() => { });

        // Recreate index (will use mapping from initialization)
        await initializeElasticsearchIndices();

        // Bulk index based on type
        let items;
        if (contentType === 'posts') {
          items = await Post.findAll({ limit: 10000 });
          for (const item of items) {
            await indexPost(item);
          }
        } else if (contentType === 'comments') {
          items = await Comment.findAll({ limit: 10000 });
          for (const item of items) {
            await indexComment(item);
          }
        } else if (contentType === 'videos') {
          items = await Video.findAll({ limit: 10000 });
          for (const item of items) {
            await indexVideo(item);
          }
        }

        results[contentType] = { indexed: items.length };
      } catch (error) {
        results[contentType] = { error: error.message };
      }
    }

    res.json({ message: 'Reindexing complete', results });
  } catch (error) {
    console.error('Reindexing error:', error);
    res.status(500).json({ error: 'Reindexing failed' });
  }
});

// Initialize Elasticsearch on startup
initializeElasticsearchIndices().catch(err => {
  console.error('Failed to initialize Elasticsearch:', err.message);
});

// ==================== END ELASTICSEARCH INTEGRATION ====================

// ==================== PHASE 6: ARCHIVING SYSTEM ====================

// Archive content (manual or automatic)
app.post('/archive', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentType, contentId, reason = 'manual' } = req.body;

    if (!contentType || !contentId) {
      return res.status(400).json({ error: 'contentType and contentId are required' });
    }

    // Fetch content based on type
    let content;
    let Model;

    switch (contentType) {
      case 'post':
        Model = Post;
        break;
      case 'blog':
        Model = Blog;
        break;
      case 'video':
        Model = Video;
        break;
      case 'comment':
        Model = Comment;
        break;
      case 'wiki':
        // Wiki archiving not yet implemented
        return res.status(400).json({ error: 'Wiki archiving is not supported yet' });
      default:
        return res.status(400).json({ error: 'Invalid content type. Supported: post, blog, video, comment' });
    }

    content = await Model.findByPk(contentId);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Verify ownership (unless admin/moderator)
    if (content.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to archive this content' });
    }

    // Create archive
    const archive = await Archive.create({
      contentType,
      contentId,
      userId,
      contentData: content.toJSON(),
      reason,
      metadata: {
        originalCreatedAt: content.createdAt,
        originalUpdatedAt: content.updatedAt,
        archiveSize: JSON.stringify(content.toJSON()).length
      }
    });

    res.json({
      message: 'Content archived successfully',
      archive: {
        id: archive.id,
        contentType: archive.contentType,
        archivedAt: archive.archivedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to archive content' });
  }
});

// Get user's archives
app.get('/archive', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentType, limit = 50, offset = 0 } = req.query;

    const whereClause = { userId };
    if (contentType) {
      whereClause.contentType = contentType;
    }

    const archives = await Archive.findAll({
      where: whereClause,
      order: [['archivedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['contentData'] } // Don't send full content in list
    });

    const total = await Archive.count({ where: whereClause });

    res.json({
      archives,
      total,
      hasMore: total > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// Get archive details with full content
app.get('/archive/:archiveId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { archiveId } = req.params;

    const archive = await Archive.findByPk(archiveId);

    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    if (archive.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ archive });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Restore content from archive
app.post('/archive/:archiveId/restore', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { archiveId } = req.params;

    const archive = await Archive.findByPk(archiveId);

    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    if (archive.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get appropriate model
    let Model;
    switch (archive.contentType) {
      case 'post':
        Model = Post;
        break;
      case 'blog':
        Model = Blog;
        break;
      case 'video':
        Model = Video;
        break;
      case 'comment':
        Model = Comment;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    // Check if content already exists
    const existing = await Model.findByPk(archive.contentId);
    if (existing) {
      return res.status(409).json({
        error: 'Content already exists. Delete it first or use a different restore method.'
      });
    }

    // Restore content
    const restored = await Model.create(archive.contentData);

    // Update archive stats
    await archive.update({
      restoreCount: archive.restoreCount + 1,
      lastRestored: new Date()
    });

    res.json({
      message: 'Content restored successfully',
      restored: {
        id: restored.id,
        type: archive.contentType
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore content' });
  }
});

// Delete archive permanently
app.delete('/archive/:archiveId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { archiveId } = req.params;

    const archive = await Archive.findByPk(archiveId);

    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    if (archive.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await archive.destroy();

    res.json({ message: 'Archive deleted permanently' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete archive' });
  }
});

// Search archives
app.get('/archive/search', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, contentType, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

    const whereClause = { userId };

    if (contentType) {
      whereClause.contentType = contentType;
    }

    if (dateFrom || dateTo) {
      whereClause.archivedAt = {};
      if (dateFrom) whereClause.archivedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.archivedAt[Op.lte] = new Date(dateTo);
    }

    // Search in contentData JSONB field
    if (query) {
      whereClause[Op.or] = [
        sequelize.where(
          sequelize.cast(sequelize.col('contentData'), 'text'),
          { [Op.iLike]: `%${query}%` }
        )
      ];
    }

    const archives = await Archive.findAll({
      where: whereClause,
      order: [['archivedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Archive.count({ where: whereClause });

    res.json({
      archives,
      total,
      query,
      hasMore: total > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search archives' });
  }
});

// ==================== END ARCHIVING SYSTEM ====================

// ==================== PHASE 6: SAVED SEARCHES ====================

// Create saved search
app.post('/saved-searches', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, contentType = 'all', filters, isPublic = false } = req.body;

    if (!name || !filters) {
      return res.status(400).json({ error: 'name and filters are required' });
    }

    const savedSearch = await SavedSearch.create({
      userId,
      name,
      description,
      contentType,
      filters,
      isPublic
    });

    res.json({ savedSearch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

// Get user's saved searches
app.get('/saved-searches', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentType } = req.query;

    const whereClause = { userId };
    if (contentType) {
      whereClause.contentType = contentType;
    }

    const searches = await SavedSearch.findAll({
      where: whereClause,
      order: [['lastUsed', 'DESC NULLS LAST'], ['createdAt', 'DESC']]
    });

    res.json({ searches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// Execute saved search
app.get('/saved-searches/:searchId/execute', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { searchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const savedSearch = await SavedSearch.findByPk(searchId);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    if (savedSearch.userId !== userId && !savedSearch.isPublic) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update usage stats
    await savedSearch.update({
      useCount: savedSearch.useCount + 1,
      lastUsed: new Date()
    });

    // Execute search based on filters
    const filters = savedSearch.filters;
    let results = [];

    // Determine which model to search
    let Model;
    switch (savedSearch.contentType) {
      case 'post':
        Model = Post;
        break;
      case 'blog':
        Model = Blog;
        break;
      case 'video':
        Model = Video;
        break;
      default:
        // Fallback: search posts for 'all' or unknown content types
        Model = Post;
    }

    // Build where clause from filters
    const whereClause = {};

    if (filters.keywords) {
      // Apply keyword filtering to appropriate field per model
      if (savedSearch.contentType === 'video') {
        // Videos use title/description instead of content
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${filters.keywords}%` } },
          { description: { [Op.iLike]: `%${filters.keywords}%` } }
        ];
      } else {
        // Default text field for posts/blogs
        whereClause.content = { [Op.iLike]: `%${filters.keywords}%` };
      }
    }

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) whereClause.createdAt[Op.gte] = new Date(filters.dateFrom);
      if (filters.dateTo) whereClause.createdAt[Op.lte] = new Date(filters.dateTo);
    }

    if (filters.minLikes) {
      whereClause.likes = { [Op.gte]: filters.minLikes };
    }

    results = await Model.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Model.count({ where: whereClause });

    res.json({
      savedSearch: {
        id: savedSearch.id,
        name: savedSearch.name,
        contentType: savedSearch.contentType
      },
      results,
      total,
      hasMore: total > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to execute saved search' });
  }
});

// Update saved search
app.put('/saved-searches/:searchId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { searchId } = req.params;
    const updates = req.body;

    const savedSearch = await SavedSearch.findByPk(searchId);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    if (savedSearch.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const allowedFields = ['name', 'description', 'filters', 'isPublic'];
    const updateData = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    await savedSearch.update(updateData);

    res.json({ savedSearch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

// Delete saved search
app.delete('/saved-searches/:searchId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { searchId } = req.params;

    const savedSearch = await SavedSearch.findByPk(searchId);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    if (savedSearch.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await savedSearch.destroy();

    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// ==================== END SAVED SEARCHES ====================

startServer();
