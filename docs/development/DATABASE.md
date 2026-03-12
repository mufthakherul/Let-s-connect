# Database Documentation

This document covers PostgreSQL setup, Sequelize ORM usage, schema management, models, and Redis usage across the Milonexa platform.

---

## Table of Contents

1. [PostgreSQL Setup](#1-postgresql-setup)
2. [Sequelize ORM](#2-sequelize-orm)
3. [Schema Sync Policy](#3-schema-sync-policy)
4. [Database Provisioning](#4-database-provisioning)
5. [Models by Service](#5-models-by-service)
6. [Redis Usage](#6-redis-usage)
7. [Running Migrations](#7-running-migrations)
8. [Adding a New Model](#8-adding-a-new-model)
9. [Backup & Restore](#9-backup--restore)
10. [Query Patterns](#10-query-patterns)

---

## 1. PostgreSQL Setup

### Connection Configuration

Each service connects to PostgreSQL via Sequelize. The connection is configured in `src/db.js` (or `src/config/database.js`) of each service:

```js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'milonexa',
  process.env.DB_USER || 'milonexa',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true } : false,
    },
  }
);

module.exports = sequelize;
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `milonexa` | Database user |
| `DB_PASSWORD` | (required) | Database password |
| `DB_NAME` | `milonexa` | Database name |
| `DB_SCHEMA_MODE` | `migrate` | Sync policy (see below) |
| `DB_SSL` | `false` | Enable SSL for connections |

### Testing the Connection

```bash
# Via Docker
docker compose exec postgres psql -U milonexa -d milonexa -c "SELECT version();"

# Via psql directly
psql postgresql://milonexa:password@localhost:5432/milonexa

# Via Node.js
node -e "require('./src/db').authenticate().then(() => console.log('OK'))"
```

---

## 2. Sequelize ORM

### Model Definition

All models use Sequelize's DataTypes and are defined as classes:

```js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true, // null for OAuth-only accounts
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin', 'super_admin'),
    defaultValue: 'user',
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  underscored: true,  // snake_case column names
});

module.exports = User;
```

### Associations

```js
// In a central associations setup file or at model init:
User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
```

---

## 3. Schema Sync Policy

Milonexa uses `services/shared/db-sync-policy.js` to control how Sequelize syncs the database schema at service startup.

### `DB_SCHEMA_MODE` values

| Mode | Behavior | Environment |
|---|---|---|
| `migrate` | `sequelize.sync({ alter: false })` — Only creates missing tables/columns; **never drops** anything | **Production default** |
| `alter` | `sequelize.sync({ alter: true })` — Adds new columns, may modify types, may drop removed columns | Development |
| `force` | `sequelize.sync({ force: true })` — **Drops and recreates all tables** — **ALL DATA LOST** | Never in production |

### Usage

```js
const { syncWithPolicy } = require('../shared/db-sync-policy');
const sequelize = require('./db');

// Called at service startup, after all models are imported
await syncWithPolicy(sequelize);
```

### Production Rule

In production, **always** use `DB_SCHEMA_MODE=migrate`. This ensures:
- New tables added to models are created automatically
- New columns with defaults are added safely
- No existing data is lost
- No columns are dropped (even if removed from model definition)

For destructive schema changes in production, use a proper migration script (e.g. with `sequelize-cli` or custom SQL scripts run as a pre-deployment step).

---

## 4. Database Provisioning

### Automatic Provisioning

On first Docker Compose run, `postgres` container executes `scripts/init-databases.sh` via the Docker entrypoint initdb mechanism.

The `POSTGRES_MULTIPLE_DATABASES` environment variable specifies which databases to create:

```dotenv
POSTGRES_MULTIPLE_DATABASES=milonexa,admin,milonexa_admin
```

The init script:

```bash
#!/bin/bash
# scripts/init-databases.sh
set -e

# Create each database from POSTGRES_MULTIPLE_DATABASES
for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE "$db";
    GRANT ALL PRIVILEGES ON DATABASE "$db" TO "$POSTGRES_USER";
EOSQL
  echo "Database $db created."
done
```

### Databases

| Database | Used By | Description |
|---|---|---|
| `milonexa` | All application services | Main application database |
| `admin` | admin_frontend, security-service | Admin panel data |
| `milonexa_admin` | Admin CLI | Combined admin access |

### Manual Database Creation

```bash
# If init-databases.sh was not run:
docker compose exec postgres psql -U milonexa -c "CREATE DATABASE admin;"
docker compose exec postgres psql -U milonexa -c "CREATE DATABASE milonexa_admin;"
```

---

## 5. Models by Service

### `user-service` Models

#### User

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | STRING | Unique, required |
| `username` | STRING | Unique, display name |
| `password_hash` | STRING | bcrypt hash (null for OAuth accounts) |
| `role` | ENUM | `user`, `moderator`, `admin`, `super_admin` |
| `is_email_verified` | BOOLEAN | Email verification status |
| `two_factor_secret` | STRING (encrypted) | TOTP secret for 2FA |
| `two_factor_enabled` | BOOLEAN | 2FA enabled flag |
| `created_at` | DATE | |
| `updated_at` | DATE | |

#### Profile

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User |
| `full_name` | STRING | Display name |
| `bio` | TEXT | Profile bio |
| `avatar_url` | STRING | Profile picture URL |
| `cover_url` | STRING | Cover photo URL |
| `location` | STRING | User location |
| `website` | STRING | Personal website URL |
| `birth_date` | DATE | |

#### Friend

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `requester_id` | UUID | FK → User (sender) |
| `recipient_id` | UUID | FK → User (receiver) |
| `status` | ENUM | `pending`, `accepted`, `rejected`, `blocked` |

#### Page, Notification, Settings

Standard social platform models for branded pages, user notifications, and user preference settings.

---

### `content-service` Models

#### Post

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `author_id` | UUID | FK → User (x-user-id from gateway) |
| `content` | TEXT | Post body text |
| `media_urls` | JSONB | Array of attached media URLs |
| `visibility` | ENUM | `public`, `friends`, `private` |
| `is_flagged` | BOOLEAN | Content moderation flag |
| `flag_reason` | STRING | Reason for flagging |
| `toxicity_score` | FLOAT | AI toxicity score (0.0–1.0) |
| `reaction_counts` | JSONB | Cached counts per reaction type |
| `group_id` | UUID | FK → Group (nullable) |
| `community_id` | UUID | FK → Community (nullable) |

#### Comment

Nested threaded comments with `parent_id` for replies.

#### Group, Community, Blog, Video, Reaction

Standard content engagement models.

---

### `messaging-service` Models

#### Conversation

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `type` | ENUM | `direct`, `group` |
| `name` | STRING | Group name (null for DMs) |
| `participants` | JSONB | Array of user IDs |
| `last_message_at` | DATE | For sorting conversations |

#### Message

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | FK → Conversation |
| `sender_id` | UUID | User ID of sender |
| `content` | TEXT | Message body (encrypted at rest) |
| `content_type` | ENUM | `text`, `image`, `video`, `file`, `audio` |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `reactions` | JSONB | Reaction counts |
| `reply_to_id` | UUID | FK → Message (for threading) |

#### Server, Channel, WebRTCCall

Discord-style server/channel models and WebRTC signaling session models.

---

### `collaboration-service` Models

| Model | Description |
|---|---|
| `Document` | Collaborative document with CRDT content |
| `DocumentVersion` | Immutable snapshots of document state |
| `CollaborativeSession` | Active editing session metadata |
| `Wiki` | Wiki page content |
| `WikiHistory` | Full edit history for wiki pages |
| `Task` | Task with status, assignee, due date |
| `Issue` | Issue/bug tracker item with priority |
| `Project` | Project container for tasks and issues |
| `Milestone` | Project milestone with target date |
| `Meeting` | Meeting with attendees and agenda |

---

### `media-service` Models

#### MediaFile

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `uploader_id` | UUID | User who uploaded |
| `filename` | STRING | Original filename |
| `storage_key` | STRING | MinIO object key |
| `mime_type` | STRING | File MIME type |
| `size_bytes` | INTEGER | File size |
| `width` | INTEGER | Image/video width (pixels) |
| `height` | INTEGER | Image/video height (pixels) |
| `duration_seconds` | FLOAT | Video/audio duration |
| `is_public` | BOOLEAN | Public access flag |

---

### `shop-service` Models

| Model | Key Fields |
|---|---|
| `Product` | name, description, price, stock, images, category |
| `Order` | userId, items, totalAmount, status, stripePaymentIntentId |
| `Cart` | userId, items (JSONB array of product+quantity) |
| `Review` | productId, userId, rating (1–5), comment |
| `Wishlist` | userId, productIds (JSONB array) |

---

### `streaming-service` Models

| Model | Key Fields |
|---|---|
| `RadioStation` | name, streamUrl, genre, logoUrl, description |
| `TvChannel` | name, streamUrl, category, logoUrl, epgUrl |

---

## 6. Redis Usage

### Cache Namespaces

All cache keys follow the pattern `cache:{namespace}:{identifier}`.

| Namespace | Identifier | TTL | Description |
|---|---|---|---|
| `user_profile` | `userId` | 900s (15 min) | Cached user + profile data |
| `post_feed` | `userId` | 120s (2 min) | Home feed posts |
| `products` | `category` or `all` | 300s (5 min) | Product listings |
| `discovery` | `userId` | 600s (10 min) | Friend/content recommendations |
| `conversation` | `conversationId` | 300s (5 min) | Conversation metadata |

### Pub/Sub Channels

| Channel Pattern | Used For |
|---|---|
| `events:user.*` | User lifecycle events |
| `events:content.*` | Content events (post created, etc.) |
| `events:messaging.*` | Message events |
| `events:notification.*` | Notification delivery |
| `socket:user:{userId}` | Direct socket events per user |

### Rate Limiting

Rate limiting uses the `rate-limit-redis` store with a sliding window algorithm. Keys are stored as `rl:{windowKey}:{ip}` with automatic TTL.

### Sessions

JWT refresh tokens are stored in Redis as:
- Key: `session:refresh:{userId}:{tokenJti}`
- Value: `{ userId, issuedAt, expiresAt, deviceInfo }`
- TTL: 7 days (matches `JWT_REFRESH_EXPIRY`)

---

## 7. Running Migrations

Milonexa uses Sequelize's `syncWithPolicy` for schema management in development. For production migrations:

### Adding a new column (safe)

Simply add the field to the model definition. With `DB_SCHEMA_MODE=migrate`, Sequelize will add the column on next service start without touching existing data.

### Dropping a column (manual)

Never done automatically in `migrate` mode. Execute manually:

```sql
-- Connect to the database
psql postgresql://milonexa:password@localhost:5432/milonexa

-- Drop the column
ALTER TABLE users DROP COLUMN IF EXISTS old_column;
```

### Data migrations

For data transformations, write a one-off script:

```js
// scripts/migrate-data-example.js
const sequelize = require('../services/user-service/src/db');

async function migrate() {
  await sequelize.query(`
    UPDATE users SET username = LOWER(email) WHERE username IS NULL;
  `);
  console.log('Migration complete');
  await sequelize.close();
}

migrate().catch(console.error);
```

---

## 8. Adding a New Model

1. Create the model file in the service's `src/models/` directory:

```js
// services/my-service/src/models/MyModel.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class MyModel extends Model {}

MyModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  // ... fields
}, {
  sequelize,
  modelName: 'MyModel',
  tableName: 'my_models',
  underscored: true,
});

module.exports = MyModel;
```

2. Import the model in the service's main `db-init.js` or `index.js` (so Sequelize registers it before `syncWithPolicy` is called):

```js
require('./models/MyModel');
```

3. Set `DB_SCHEMA_MODE=alter` in development to auto-create the new table.

4. Commit both the model file and the updated `package.json` if new packages were added.

---

## 9. Backup & Restore

### Backup

```bash
# Backup all databases
docker compose exec postgres pg_dumpall -U milonexa | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup specific database
docker compose exec postgres pg_dump -U milonexa -Fc milonexa > milonexa_$(date +%Y%m%d).dump
```

### Restore

```bash
# Restore all
zcat backup_20240101.sql.gz | docker compose exec -T postgres psql -U milonexa

# Restore specific database
docker compose exec -T postgres pg_restore -U milonexa -d milonexa --clean < milonexa_20240101.dump
```

### Automated Backups

See `k8s/backup-cronjob.yaml` for the Kubernetes CronJob, or set up a host cron for Docker deployments.

---

## 10. Query Patterns

### Avoiding N+1 Queries

Use `include` for eager loading associations:

```js
// Bad — N+1
const posts = await Post.findAll();
for (const post of posts) {
  post.author = await User.findByPk(post.authorId);
}

// Good — eager loading
const posts = await Post.findAll({
  include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
  limit: 20,
  order: [['createdAt', 'DESC']],
});
```

### Pagination

```js
const { page = 1, limit = 20 } = req.query;
const offset = (page - 1) * limit;

const { count, rows } = await Post.findAndCountAll({
  where: { groupId },
  limit: Math.min(parseInt(limit), 100), // cap at 100
  offset: parseInt(offset),
  order: [['createdAt', 'DESC']],
});
```

### Safe Parameterized Queries

Always use Sequelize's built-in parameterization — **never** concatenate user input into SQL strings:

```js
// NEVER do this:
const users = await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);

// Always use parameterization:
const users = await User.findAll({ where: { email } });
// Or with raw queries:
const users = await sequelize.query(
  'SELECT * FROM users WHERE email = :email',
  { replacements: { email }, type: sequelize.QueryTypes.SELECT }
);
```
