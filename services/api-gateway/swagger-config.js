const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Let\'s Connect API',
      version: '4.0.0',
      description: 'Unified Social Collaboration Platform API - Complete REST and GraphQL API documentation',
      contact: {
        name: 'API Support',
        email: 'support@letsconnect.com',
        url: 'https://letsconnect.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      },
      {
        url: 'https://api.letsconnect.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization token'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for third-party integrations'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            avatar: { type: 'string', format: 'uri', nullable: true },
            bio: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['user', 'moderator', 'admin'], default: 'user' },
            isActive: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['text', 'image', 'video', 'link'], default: 'text' },
            mediaUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
            likes: { type: 'integer', minimum: 0, default: 0 },
            shares: { type: 'integer', minimum: 0, default: 0 },
            comments: { type: 'integer', minimum: 0, default: 0 },
            isPublic: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Blog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1, maxLength: 200 },
            slug: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            excerpt: { type: 'string', maxLength: 500, nullable: true },
            featuredImage: { type: 'string', format: 'uri', nullable: true },
            status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
            views: { type: 'integer', minimum: 0, default: 0 },
            likes: { type: 'integer', minimum: 0, default: 0 },
            publishedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { 
              type: 'string', 
              enum: ['message', 'mention', 'reply', 'reaction', 'call', 'friend_request', 'server_invite', 'role_update', 'system', 'announcement']
            },
            title: { type: 'string' },
            body: { type: 'string' },
            actionUrl: { type: 'string', format: 'uri', nullable: true },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
            isRead: { type: 'boolean', default: false },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
            code: { type: 'string', description: 'Error code', nullable: true },
            details: { type: 'object', description: 'Additional error details', nullable: true }
          }
        },
        RateLimitStatus: {
          type: 'object',
          properties: {
            limit: { type: 'integer', description: 'Maximum requests allowed' },
            remaining: { type: 'integer', description: 'Requests remaining in current window' },
            reset: { type: 'integer', description: 'Unix timestamp when limit resets' },
            retryAfter: { type: 'integer', description: 'Seconds until retry (when limited)', nullable: true }
          }
        }
      },
      parameters: {
        limitParam: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Number of items to return'
        },
        offsetParam: {
          in: 'query',
          name: 'offset',
          schema: { type: 'integer', minimum: 0, default: 0 },
          description: 'Number of items to skip'
        },
        pageParam: {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number'
        }
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Authentication required' }
            }
          }
        },
        Forbidden: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Access forbidden' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Resource not found' }
            }
          }
        },
        RateLimited: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Too many requests. Please try again later.' }
            }
          },
          headers: {
            'RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Request limit per window'
            },
            'RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Requests remaining'
            },
            'RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Time when limit resets (Unix timestamp)'
            },
            'Retry-After': {
              schema: { type: 'integer' },
              description: 'Seconds to wait before retrying'
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  validationErrors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Users', description: 'User management operations' },
      { name: 'Posts', description: 'Social posts and feed management' },
      { name: 'Blogs', description: 'Blog content management' },
      { name: 'Notifications', description: 'Real-time notifications' },
      { name: 'Messages', description: 'Direct messaging and chat' },
      { name: 'Media', description: 'Media upload and management' },
      { name: 'Groups', description: 'Group/community management' },
      { name: 'Search', description: 'Content search and discovery' },
      { name: 'Analytics', description: 'Usage analytics and insights' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'System', description: 'System information and health checks' }
    ]
  },
  apis: ['./server.js', './swagger-routes.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
