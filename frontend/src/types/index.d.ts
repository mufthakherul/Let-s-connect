/**
 * Shared API & domain type definitions for incremental TypeScript migration.
 * As JS files are converted to TS, import from here instead of redeclaring.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  role: 'user' | 'moderator' | 'admin';
  createdAt: string;
  token?: string;
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  visibility: 'public' | 'followers' | 'private';
  mediaUrls?: string[];
  tags?: string[];
  likes: number;
  reactionCount?: number;
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Reaction {
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  count: number;
  userReacted: boolean;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  replyToId?: string;
  createdAt: string;
  delivered?: boolean;
  read?: boolean;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  size?: number;
  mimeType?: string;
  uploadedAt: string;
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images?: string[];
  stock?: number;
  sellerId: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    traceId?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface TrendingTopic {
  tag: string;
  count: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface PersonSuggestion {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
  mutualConnections?: number;
  reason?: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AiTagResult {
  tags: string[];
}

export interface AiTranslateResult {
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage: string;
}

export interface AiDigestItem {
  id: string;
  title: string;
  summary: string;
  score?: number;
}

export interface AiSuggestion {
  suggestions: string[];
}
