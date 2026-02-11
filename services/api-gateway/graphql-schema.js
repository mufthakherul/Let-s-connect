const { buildSchema } = require('graphql');
const axios = require('axios');

// Phase 6: GraphQL Schema
const schema = buildSchema(`
  type User {
    id: ID!
    username: String!
    email: String!
    firstName: String
    lastName: String
    bio: String
    avatar: String
    role: String
    isActive: Boolean
    createdAt: String
  }

  type Post {
    id: ID!
    userId: ID!
    content: String!
    type: String
    mediaUrls: [String]
    likes: Int
    comments: Int
    createdAt: String
    updatedAt: String
  }

  type Blog {
    id: ID!
    userId: ID!
    title: String!
    content: String!
    excerpt: String
    coverImage: String
    status: String
    views: Int
    likes: Int
    createdAt: String
    publishedAt: String
  }

  type Video {
    id: ID!
    userId: ID!
    channelId: ID
    title: String!
    description: String
    videoUrl: String!
    thumbnailUrl: String
    duration: Int
    views: Int
    likes: Int
    createdAt: String
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    body: String!
    isRead: Boolean!
    priority: String
    createdAt: String
  }

  type Call {
    id: ID!
    callerId: ID!
    recipientId: ID!
    type: String!
    status: String!
    duration: Int
    isScreenSharing: Boolean
    isRecording: Boolean
    networkQuality: String
    createdAt: String
  }

  type PaginatedPosts {
    posts: [Post]
    total: Int
    hasMore: Boolean
  }

  type PaginatedBlogs {
    blogs: [Blog]
    total: Int
    hasMore: Boolean
  }

  type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int, offset: Int): [User]
    
    # Content queries
    post(id: ID!): Post
    posts(limit: Int, offset: Int): PaginatedPosts
    
    blog(id: ID!): Blog
    blogs(limit: Int, offset: Int): PaginatedBlogs
    
    video(id: ID!): Video
    videos(limit: Int, offset: Int): [Video]
    
    # Notification queries
    notifications(unreadOnly: Boolean, limit: Int, offset: Int): [Notification]
    notificationCount(unreadOnly: Boolean): Int
    
    # Call queries
    call(id: ID!): Call
    callHistory(limit: Int, offset: Int): [Call]
    
    # Search
    search(query: String!, contentType: String, limit: Int): SearchResults
  }

  type SearchResults {
    posts: [Post]
    blogs: [Blog]
    videos: [Video]
    total: Int
  }

  type Mutation {
    # Post mutations
    createPost(content: String!, type: String, mediaUrls: [String]): Post
    updatePost(id: ID!, content: String): Post
    deletePost(id: ID!): Boolean
    
    # Blog mutations
    createBlog(title: String!, content: String!, excerpt: String, coverImage: String): Blog
    updateBlog(id: ID!, title: String, content: String): Blog
    deleteBlog(id: ID!): Boolean
    
    # Notification mutations
    markNotificationRead(id: ID!): Notification
    markAllNotificationsRead: Boolean
    
    # Call mutations
    initiateCall(recipientId: ID!, type: String!): Call
    endCall(id: ID!, duration: Int): Call
  }

  type Subscription {
    # Real-time subscriptions
    notificationReceived(userId: ID!): Notification
    callIncoming(userId: ID!): Call
    postCreated: Post
  }
`);

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:8001',
  content: process.env.CONTENT_SERVICE_URL || 'http://content-service:8002',
  messaging: process.env.MESSAGING_SERVICE_URL || 'http://messaging-service:8003'
};

// Root resolver
const root = {
  // User queries
  user: async ({ id }, context) => {
    try {
      const response = await axios.get(`${services.user}/users/${id}`, {
        headers: { 'x-user-id': context.userId }
      });
      return response.data.user;
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  users: async ({ limit = 20, offset = 0 }, context) => {
    try {
      const response = await axios.get(`${services.user}/users`, {
        params: { limit, offset },
        headers: { 'x-user-id': context.userId }
      });
      return response.data.users;
    } catch (error) {
      throw new Error('Failed to fetch users');
    }
  },

  // Content queries
  post: async ({ id }, context) => {
    try {
      const response = await axios.get(`${services.content}/posts/${id}`, {
        headers: { 'x-user-id': context.userId }
      });
      return response.data.post;
    } catch (error) {
      throw new Error('Failed to fetch post');
    }
  },

  posts: async ({ limit = 20, offset = 0 }, context) => {
    try {
      const response = await axios.get(`${services.content}/posts`, {
        params: { limit, offset },
        headers: { 'x-user-id': context.userId }
      });
      return {
        posts: response.data.posts,
        total: response.data.total,
        hasMore: response.data.hasMore
      };
    } catch (error) {
      throw new Error('Failed to fetch posts');
    }
  },

  blog: async ({ id }, context) => {
    try {
      const response = await axios.get(`${services.content}/blogs/${id}`, {
        headers: { 'x-user-id': context.userId }
      });
      return response.data.blog;
    } catch (error) {
      throw new Error('Failed to fetch blog');
    }
  },

  blogs: async ({ limit = 20, offset = 0 }, context) => {
    try {
      const response = await axios.get(`${services.content}/blogs`, {
        params: { limit, offset },
        headers: { 'x-user-id': context.userId }
      });
      return {
        blogs: response.data.blogs,
        total: response.data.total,
        hasMore: response.data.hasMore
      };
    } catch (error) {
      throw new Error('Failed to fetch blogs');
    }
  },

  // Notification queries
  notifications: async ({ unreadOnly = false, limit = 50, offset = 0 }, context) => {
    try {
      const response = await axios.get(`${services.messaging}/notifications`, {
        params: { unreadOnly, limit, offset },
        headers: { 'x-user-id': context.userId }
      });
      return response.data.notifications;
    } catch (error) {
      throw new Error('Failed to fetch notifications');
    }
  },

  notificationCount: async ({ unreadOnly = true }, context) => {
    try {
      const response = await axios.get(`${services.messaging}/notifications`, {
        params: { unreadOnly },
        headers: { 'x-user-id': context.userId }
      });
      return response.data.unreadCount || response.data.total;
    } catch (error) {
      return 0;
    }
  },

  // Call queries
  call: async ({ id }, context) => {
    try {
      const response = await axios.get(`${services.messaging}/calls/${id}`, {
        headers: { 'x-user-id': context.userId }
      });
      return response.data.call;
    } catch (error) {
      throw new Error('Failed to fetch call');
    }
  },

  callHistory: async ({ limit = 20, offset = 0 }, context) => {
    try {
      const response = await axios.get(`${services.messaging}/calls/history`, {
        params: { limit, offset },
        headers: { 'x-user-id': context.userId }
      });
      return response.data.calls;
    } catch (error) {
      throw new Error('Failed to fetch call history');
    }
  },

  // Mutations
  createPost: async ({ content, type = 'text', mediaUrls = [] }, context) => {
    try {
      const response = await axios.post(
        `${services.content}/posts`,
        { content, type, mediaUrls },
        { headers: { 'x-user-id': context.userId } }
      );
      return response.data.post;
    } catch (error) {
      throw new Error('Failed to create post');
    }
  },

  markNotificationRead: async ({ id }, context) => {
    try {
      const response = await axios.put(
        `${services.messaging}/notifications/${id}/read`,
        {},
        { headers: { 'x-user-id': context.userId } }
      );
      return response.data.notification;
    } catch (error) {
      throw new Error('Failed to mark notification as read');
    }
  },

  markAllNotificationsRead: async (args, context) => {
    try {
      await axios.put(
        `${services.messaging}/notifications/read-all`,
        {},
        { headers: { 'x-user-id': context.userId } }
      );
      return true;
    } catch (error) {
      return false;
    }
  },

  initiateCall: async ({ recipientId, type }, context) => {
    try {
      const response = await axios.post(
        `${services.messaging}/calls/initiate`,
        { recipientId, type },
        { headers: { 'x-user-id': context.userId } }
      );
      return response.data.call;
    } catch (error) {
      throw new Error('Failed to initiate call');
    }
  }
};

module.exports = { schema, root };
