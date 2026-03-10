-- Database Optimization and Index Improvement for Milonexa
-- Phase 3 - Data & Scale
-- Created: March 10, 2026

-- ======================================================================
-- PART 1: INDEX ANALYSIS AND OPTIMIZATION
-- ======================================================================

-- Check for missing indexes on foreign keys
-- Foreign keys without indexes can cause performance issues
SELECT
    c.conrelid::regclass AS table_name,
    a.attname AS column_name,
    'CREATE INDEX idx_' || c.conrelid::regclass || '_' || a.attname || 
    ' ON ' || c.conrelid::regclass || ' (' || a.attname || ');' AS create_index_statement
FROM
    pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE
    c.contype = 'f'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
            AND a.attnum = ANY(i.indkey)
            AND i.indkey[0] = a.attnum
    )
ORDER BY c.conrelid::regclass::text;

-- Identify unused indexes (candidates for removal)
-- Indexes that are never used consume space and slow down writes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM
    pg_stat_user_indexes
WHERE
    idx_scan = 0
    AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY
    pg_relation_size(indexrelid) DESC;

-- Find duplicate indexes
-- Multiple indexes with the same columns waste resources
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS total_size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
         COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;

-- ======================================================================
-- PART 2: ESSENTIAL INDEXES FOR COMMON QUERIES
-- ======================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email_verified = true;

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public_recent ON posts(created_at DESC) WHERE visibility = 'public';

-- Comments table indexes  
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC);

-- Reactions/Likes table indexes
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_post ON reactions(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- Friendships table indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user1_id ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2_id ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user1_id, status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read) WHERE read = false;

-- Media uploads table indexes
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_user_type ON media(user_id, media_type);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(expires_at) WHERE expires_at > NOW();

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read = false;

-- ======================================================================
-- PART 3: COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ======================================================================

-- Feed queries (user's posts and friends' posts)
CREATE INDEX IF NOT EXISTS idx_posts_feed_query ON posts(user_id, visibility, created_at DESC);

-- User activity timeline
CREATE INDEX IF NOT EXISTS idx_user_activity ON posts(user_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- Popular posts (for trending/hot feeds)
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(created_at DESC, reaction_count DESC)
    WHERE visibility = 'public' AND deleted_at IS NULL;

-- Search optimization (partial text matching)
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- ======================================================================
-- PART 4: QUERY PERFORMANCE ANALYSIS
-- ======================================================================

-- Find slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM
    pg_stat_statements
WHERE
    mean_exec_time > 100  -- queries taking more than 100ms on average
ORDER BY
    mean_exec_time DESC
LIMIT 20;

-- Table bloat analysis
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM
    pg_stat_user_tables
ORDER BY
    pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ======================================================================
-- PART 5: AUTOVACUUM TUNING
-- ======================================================================

-- Adjust autovacuum settings for high-traffic tables
ALTER TABLE posts SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE comments SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE reactions SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE messages SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- ======================================================================
-- PART 6: CONSTRAINT AND REFERENTIAL INTEGRITY
-- ======================================================================

-- Ensure foreign key constraints for data integrity
-- (Add if not already present)

-- Posts -> Users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_posts_user') THEN
        ALTER TABLE posts ADD CONSTRAINT fk_posts_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Comments -> Posts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_post') THEN
        ALTER TABLE comments ADD CONSTRAINT fk_comments_post 
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Comments -> Users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_user') THEN
        ALTER TABLE comments ADD CONSTRAINT fk_comments_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ======================================================================
-- PART 7: PARTITIONING FOR LARGE TABLES (Optional)
-- ======================================================================

-- For very large tables, consider partitioning by date
-- Example for messages table (if it grows very large)

-- CREATE TABLE messages_partitioned (
--     id SERIAL,
--     sender_id INTEGER,
--     recipient_id INTEGER,
--     content TEXT,
--     created_at TIMESTAMP DEFAULT NOW()
-- ) PARTITION BY RANGE (created_at);

-- CREATE TABLE messages_2026_01 PARTITION OF messages_partitioned
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- CREATE TABLE messages_2026_02 PARTITION OF messages_partitioned
--     FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- -- etc...

-- ======================================================================
-- PART 8: MAINTENANCE OPERATIONS
-- ======================================================================

-- Vacuum analyze all tables (run during low-traffic periods)
-- VACUUM ANALYZE;

-- Reindex heavily updated tables (helps with index bloat)
-- REINDEX TABLE posts;
-- REINDEX TABLE comments;
-- REINDEX TABLE reactions;

-- Update table statistics
ANALYZE users;
ANALYZE posts;
ANALYZE comments;
ANALYZE reactions;
ANALYZE messages;
ANALYZE friendships;
ANALYZE media;
ANALYZE notifications;

-- ======================================================================
-- PART 9: MONITORING QUERIES
-- ======================================================================

-- Monitor active queries
CREATE OR REPLACE VIEW v_active_queries AS
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query,
    query_start,
    NOW() - query_start AS duration
FROM
    pg_stat_activity
WHERE
    state != 'idle'
    AND query NOT LIKE '%pg_stat_activity%'
ORDER BY
    query_start;

-- Monitor table sizes
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows
FROM
    pg_stat_user_tables
ORDER BY
    pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM
    pg_stat_user_indexes
ORDER BY
    idx_scan DESC;

-- ======================================================================
-- COMPLETION
-- ======================================================================

-- Grant necessary permissions
GRANT SELECT ON v_active_queries TO milonexa_app;
GRANT SELECT ON v_table_sizes TO milonexa_app;
GRANT SELECT ON v_index_usage TO milonexa_app;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database optimization completed successfully';
    RAISE NOTICE 'Indexes created, constraints validated, monitoring views deployed';
END $$;
