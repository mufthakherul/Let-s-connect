-- Database Optimization Script for Let's Connect Platform
-- Phase 4: Scale & Performance (v2.5)
-- Adds indexes to frequently queried columns across all services

-- =====================================================
-- USER SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c users;

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON "Users" (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users" (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON "Users" (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON "Users" ("isActive");
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "Users" ("createdAt");

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON "Profiles" ("userId");
CREATE INDEX IF NOT EXISTS idx_profiles_location ON "Profiles" (location);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON "Profiles" (company);

-- Skills table indexes
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON "Skills" ("userId");
CREATE INDEX IF NOT EXISTS idx_skills_name ON "Skills" (name);
CREATE INDEX IF NOT EXISTS idx_skills_endorsements ON "Skills" (endorsements DESC);

-- Endorsements table indexes
CREATE INDEX IF NOT EXISTS idx_endorsements_skill_id ON "Endorsements" ("skillId");
CREATE INDEX IF NOT EXISTS idx_endorsements_endorser_id ON "Endorsements" ("endorserId");

-- Pages table indexes
CREATE INDEX IF NOT EXISTS idx_pages_owner_id ON "Pages" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_pages_category ON "Pages" (category);
CREATE INDEX IF NOT EXISTS idx_pages_is_verified ON "Pages" ("isVerified");
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON "Pages" ("createdAt");

-- PageFollowers table indexes
CREATE INDEX IF NOT EXISTS idx_page_followers_page_id ON "PageFollowers" ("pageId");
CREATE INDEX IF NOT EXISTS idx_page_followers_user_id ON "PageFollowers" ("userId");

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON "Notifications" ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON "Notifications" ("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON "Notifications" ("createdAt" DESC);

-- =====================================================
-- CONTENT SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c content;

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON "Posts" ("authorId");
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON "Posts" (visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON "Posts" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON "Posts" (likes DESC);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON "Comments" ("postId");
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON "Comments" ("authorId");
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON "Comments" ("createdAt" DESC);

-- Likes table indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON "Likes" ("postId");
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON "Likes" ("userId");
CREATE INDEX IF NOT EXISTS idx_likes_composite ON "Likes" ("postId", "userId");

-- Hashtags table indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON "Hashtags" (tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON "Hashtags" (count DESC);

-- Videos table indexes
CREATE INDEX IF NOT EXISTS idx_videos_uploader_id ON "Videos" ("uploaderId");
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON "Videos" (visibility);
CREATE INDEX IF NOT EXISTS idx_videos_views ON "Videos" (views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON "Videos" ("createdAt" DESC);

-- Blogs table indexes
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON "Blogs" ("authorId");
CREATE INDEX IF NOT EXISTS idx_blogs_status ON "Blogs" (status);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON "Blogs" ("createdAt" DESC);

-- =====================================================
-- MESSAGING SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c messages;

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON "Conversations" ("updatedAt" DESC);

-- ConversationParticipants table indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_id ON "ConversationParticipants" ("userId");
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_id ON "ConversationParticipants" ("conversationId");

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON "Messages" ("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON "Messages" ("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON "Messages" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON "Messages" ("isRead");

-- MessageReactions table indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON "MessageReactions" ("messageId");
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON "MessageReactions" ("userId");

-- =====================================================
-- COLLABORATION SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c collaboration;

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON "Documents" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON "Documents" ("folderId");
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON "Documents" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON "Documents" ("updatedAt" DESC);

-- DocumentVersions table indexes
CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id ON "DocumentVersions" ("documentId");
CREATE INDEX IF NOT EXISTS idx_doc_versions_created_at ON "DocumentVersions" ("createdAt" DESC);

-- Folders table indexes
CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON "Folders" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON "Folders" ("parentId");

-- Wikis table indexes
CREATE INDEX IF NOT EXISTS idx_wikis_creator_id ON "Wikis" ("creatorId");
CREATE INDEX IF NOT EXISTS idx_wikis_category ON "Wikis" (category);
CREATE INDEX IF NOT EXISTS idx_wikis_created_at ON "Wikis" ("createdAt" DESC);

-- WikiVersions table indexes
CREATE INDEX IF NOT EXISTS idx_wiki_versions_wiki_id ON "WikiVersions" ("wikiId");
CREATE INDEX IF NOT EXISTS idx_wiki_versions_created_at ON "WikiVersions" ("createdAt" DESC);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON "Projects" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_projects_status ON "Projects" (status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON "Projects" ("createdAt" DESC);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON "Tasks" ("projectId");
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON "Tasks" ("assigneeId");
CREATE INDEX IF NOT EXISTS idx_tasks_status ON "Tasks" (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON "Tasks" (priority);

-- Databases table indexes
CREATE INDEX IF NOT EXISTS idx_databases_owner_id ON "Databases" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_databases_created_at ON "Databases" ("createdAt" DESC);

-- DatabaseViews table indexes
CREATE INDEX IF NOT EXISTS idx_database_views_database_id ON "DatabaseViews" ("databaseId");

-- =====================================================
-- MEDIA SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c media;

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON "Files" ("uploaderId");
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON "Files" ("mimeType");
CREATE INDEX IF NOT EXISTS idx_files_created_at ON "Files" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_files_size ON "Files" (size);

-- =====================================================
-- SHOP SERVICE DATABASE OPTIMIZATIONS
-- =====================================================

\c shop;

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON "Products" ("sellerId");
CREATE INDEX IF NOT EXISTS idx_products_category ON "Products" (category);
CREATE INDEX IF NOT EXISTS idx_products_price ON "Products" (price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON "Products" (stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON "Products" ("createdAt" DESC);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON "Orders" ("buyerId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON "Orders" (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON "Orders" ("createdAt" DESC);

-- OrderItems table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON "OrderItems" ("orderId");
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON "OrderItems" ("productId");

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON "Reviews" ("productId");
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON "Reviews" ("reviewerId");
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON "Reviews" (rating DESC);

-- CartItems table indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON "CartItems" ("userId");
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON "CartItems" ("productId");

-- Wishlists table indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON "Wishlists" ("userId");
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON "Wishlists" ("productId");

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

\c users;
CREATE INDEX IF NOT EXISTS idx_users_active_role ON "Users" ("isActive", role) WHERE "isActive" = true;

\c content;
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created ON "Posts" (visibility, "createdAt" DESC) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_videos_visibility_views ON "Videos" (visibility, views DESC) WHERE visibility = 'public';

\c messages;
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON "Messages" ("conversationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON "Messages" ("conversationId", "isRead") WHERE "isRead" = false;

\c collaboration;
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON "Tasks" ("projectId", status);
CREATE INDEX IF NOT EXISTS idx_documents_folder_updated ON "Documents" ("folderId", "updatedAt" DESC);

\c shop;
CREATE INDEX IF NOT EXISTS idx_products_category_price ON "Products" (category, price);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON "Orders" ("buyerId", status);

-- =====================================================
-- OPTIMIZATION SUMMARY
-- =====================================================

SELECT 'Database optimization complete!' AS status,
       'Total indexes created: 80+' AS summary,
       'Query performance improved for most common operations' AS result;
