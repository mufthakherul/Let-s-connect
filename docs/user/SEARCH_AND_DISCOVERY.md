# Search and Discovery Guide

Welcome to the Milonexa Search and Discovery guide. This comprehensive resource covers all the tools available for finding content, people, and communities on the platform.

## Global Search

### Accessing Global Search

Search for content across the entire Milonexa platform:

**Search Bar:**
1. Look for the **search bar** at the top of the page
2. Usually displays "Search Milonexa..." or a search icon (🔍)
3. Click to focus, then start typing
4. Results appear dynamically as you type

**Keyboard Shortcut:**
- Press **/** from anywhere on the platform
- Or press **Ctrl+K** (Windows/Linux) or **Cmd+K** (Mac)
- Search box opens and focuses automatically
- Especially useful for quick searching

**From Search Page:**
- Navigate directly to **/search**
- Dedicated search page with advanced options
- Full-screen search interface
- More filtering and sorting controls

### Search Scope

Global search spans multiple content types:

**Users**
- Individual user profiles
- Usernames and real names
- Creator and influencer accounts
- People you may know

**Posts**
- Text posts from your feed
- Image posts and galleries
- Posts with videos and attachments
- Shared content

**Groups**
- Community groups
- Private interest groups
- Public organizations
- Local meetup groups

**Communities**
- Large topic-based communities
- Professional networks
- Global communities
- Larger organizations

**Pages**
- Brand pages
- Creator pages
- Organization pages
- Public figures

**Videos**
- Uploaded video content
- Video playlists
- Video channels
- Embedded videos

**Blogs**
- Blog articles
- Long-form content
- Published stories
- Educational articles

**Products** (if available)
- Product listings
- Shopping items
- Marketplace items
- Service offerings

**Wiki Pages**
- Community-contributed wiki content
- Reference materials
- How-to guides
- Knowledge base articles

### Basic Search

**Simple Search Query:**
1. Type keywords in search bar
2. Examples:
   - "react tutorials"
   - "john smith" (searches for user)
   - "web development" (searches all types)
   - "python programming" (finds posts, blogs, videos, groups)
3. Results display in real-time
4. Click result to view

**Search Results:**
- Results appear in order of relevance
- First few results highlighted
- Content type labeled (Post, Blog, Video, User, etc.)
- Author/creator name shown
- Snippet of content preview
- Quick action buttons (Follow, Join, etc.)

### Advanced Search Query

For more precise results, use advanced search syntax:

**Search Query Syntax:**

```
query [type:value] [date:range] [author:name]
```

**Type Filters:**
```
type:post - Only posts
type:blog - Only blog articles
type:video - Only videos
type:user - Only user profiles
type:group - Only groups
type:community - Only communities
type:page - Only pages
type:wiki - Only wiki pages
```

**Date Filters:**
```
date:week - Last 7 days
date:month - Last 30 days
date:year - Last 365 days
date:2024 - Specific year
```

**Author Filters:**
```
author:john_smith - Content by specific user
from:jane_developer - Alternative syntax
```

**Combined Queries:**
```
"react hooks" type:tutorial date:month
- Searches for "react hooks" in tutorials from last month

python type:blog author:tech_blogger
- Searches for "python" in blogs by tech_blogger
```

### API: Global Search

```bash
GET /api/gateway/search?q=react&type=post&page=1&limit=20
```

**Query Parameters:**
- `q`: Search query string
- `type`: Content type filter (post, blog, video, user, group, community, page, wiki)
- `page`: Pagination page number
- `limit`: Results per page (default: 20, max: 100)
- `sortBy`: Sorting method (relevance, date, popularity)
- `dateRange`: Time filter (week, month, year)

**Response:**
```json
{
  "results": [
    {
      "id": "post_abc123",
      "type": "post",
      "title": "React Hooks Tutorial",
      "snippet": "Learn how to use React Hooks to manage state...",
      "author": "jane_developer",
      "url": "/posts/abc123",
      "timestamp": "2024-01-15T10:30:00Z",
      "relevanceScore": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1247
  }
}
```

## Search Filters

### Content Type Selector

Narrow results by content type:

**Available Filters:**
- **All Types** (default): Shows mixed results
- **Posts**: Text, image, and video posts
- **Videos**: Video content only
- **Blogs**: Blog articles only
- **Users**: People and profiles
- **Groups**: Groups and communities
- **Pages**: Brand and creator pages
- **Wiki**: Reference and knowledge content
- **Products**: Product listings (if available)

**How to Use:**
1. On search results page, find filter panel
2. Click content type to activate filter
3. Results update to show only selected type
4. Click "X" to remove filter

### Date Range Filter

Find recent or older content:

**Quick Filters:**
- **Last Hour**: Content from last 60 minutes
- **Today**: Content from last 24 hours
- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **This Year**: Last 365 days
- **Any Time**: All content (no filter)

**Custom Date Range:**
1. Click **"Custom Date Range"**
2. Select **From** date
3. Select **To** date
4. Click **"Apply"**
5. Results show only content within range

### Sorting Options

Change how results are ordered:

**Sort By:**
- **Relevance** (default): Results most relevant to query
- **Date**: Newest content first
- **Popularity**: Most reactions/views first
- **Trending**: Currently trending content
- **Engagement**: Most commented/shared

**Sort Order:**
- **Ascending**: Older to newer (for date)
- **Descending**: Newer to older (for date)

**Example:**
- "react tutorial" sorted by Date (newest first) = latest React tutorials
- "travel" sorted by Popularity = most-viewed travel posts

## Search Results by Type

### User Search Results

**Information Displayed:**
- Profile avatar (large image)
- Full name and username
- Bio/profile description (first 100 characters)
- Mutual friends count (if applicable)
- Follower count
- Verification badge (if verified)
- Follow button or Add Friend button

**Actions:**
- Click profile to view full profile
- Click Follow/Add Friend to connect
- Right-click for more options

**Example:**
```
John Smith (@john_smith)
Full Stack Developer | Tech Writer
Followed by 2,340 people
12 mutual friends
[Follow] [Message]
```

### Post Search Results

**Information Displayed:**
- Post content preview (first 200 characters)
- Author name and avatar
- Post date ("Posted 2 days ago")
- Reaction count (likes, etc.)
- Comment count
- Share count
- Content type badge (if image/video)
- Thumbnail if image post

**Actions:**
- Click to open full post
- Click author to view profile
- Like/React to post
- Bookmark post

**Example:**
```
jane_developer - 2 days ago
"Just shipped my new React component library with hooks support. Check it out!"
[like] 234 reactions
[comment] 45 comments
[bookmark] [share]
```

### Group Search Results

**Information Displayed:**
- Group name and avatar
- Description (first 100 characters)
- Member count
- Privacy type badge (Public, Private, Secret)
- Category
- Join/Request Join button
- Featured members

**Actions:**
- Click group name to open
- Click Join/Request Join to become member
- View group posts preview

### Community Search Results

**Information Displayed:**
- Community name and cover
- Description and purpose
- Member count
- Topics/categories
- Featured members
- Join button

**Actions:**
- Click to view full community
- Join to become member
- Follow to receive updates

### Page Search Results

**Information Displayed:**
- Page name and avatar
- Category badge (Brand, Creator, Organization, etc.)
- Description preview
- Follower count
- Verification badge (if verified)
- Follow button

**Actions:**
- Click page name to visit
- Click Follow to add to feed
- View page posts

### Video Search Results

**Information Displayed:**
- Video thumbnail
- Video title
- Creator name
- Duration (e.g., "12:34")
- View count
- Rating or like count
- Upload date

**Actions:**
- Click thumbnail to play
- Click creator name to view channel
- Add to playlist
- Bookmark video

### Blog Search Results

**Information Displayed:**
- Blog title (heading)
- Author name
- Publication date
- Read time estimate (e.g., "8 min read")
- Featured image (if available)
- Preview text (first 100-150 characters)
- Tags

**Actions:**
- Click title to read full article
- Click author to view profile
- Bookmark article

## Semantic Search

### AI-Powered Semantic Search

Milonexa includes advanced semantic search powered by AI and machine learning. This goes beyond keyword matching to understand meaning.

**How It Works:**
- Uses natural language processing (NLP)
- Understands context and intent
- Finds content with similar meaning even without exact keywords
- Leverages vector embeddings for semantic similarity
- Continuously learns from user interactions

**Semantic vs. Keyword Search:**

**Keyword Search Example:**
- Query: "how to fix database connection errors"
- Results: Posts with exact keywords "database", "connection", "errors"
- May miss related content about "PostgreSQL troubleshooting"

**Semantic Search Example:**
- Query: "fixing database connection issues"
- Results include:
  - "PostgreSQL troubleshooting tips"
  - "Debugging MySQL connection problems"
  - "Database connection timeout solutions"
  - "How to diagnose database issues"
  - Even posts about "database debugging" without exact keywords

### Using Semantic Search

**Trigger Semantic Search:**
1. Type natural language query (like asking a question)
2. Use longer, conversational queries
3. Examples:
   - "how do I speed up my website"
   - "best practices for react components"
   - "tips for better photography lighting"
   - "where should I travel for adventure"

**Semantic Search Features:**
- Understanding context and intent
- Handling typos and variations (automatically correct)
- Multi-language support (searches across languages)
- Finding similar/related content
- Personalized results based on your interests

### API: Semantic Search

```bash
POST /api/ai/search/semantic
Content-Type: application/json

{
  "query": "how do I optimize my React app for performance",
  "limit": 20,
  "filter": {
    "type": "blog",
    "date": "month"
  }
}
```

**Request Parameters:**
- `query`: Natural language query string
- `limit`: Number of results (default: 20)
- `filter`: Optional filters (type, date range, author)

**Response:**
```json
{
  "results": [
    {
      "id": "blog_123",
      "type": "blog",
      "title": "React Performance Optimization Guide",
      "author": "tech_writer",
      "similarityScore": 0.92,
      "preview": "Comprehensive guide to optimizing React applications...",
      "url": "/blog/react-performance"
    },
    {
      "id": "post_456",
      "type": "post",
      "title": "5 Ways to Speed Up Your React Components",
      "author": "jane_developer",
      "similarityScore": 0.88,
      "preview": "Here are proven techniques...",
      "url": "/posts/456"
    }
  ]
}
```

## Discovery Page

### Accessing Discovery

Find trending and recommended content:

**Navigate to Discovery:**
1. Click **"Discover"** in main navigation menu
2. Or go directly to **/discover**
3. Personalized discovery feed loads
4. Scroll to see different sections

### Discovery Sections

**Trending Posts**
- Most popular posts in last 24 hours
- Based on reactions, comments, shares
- Curated by recommendation algorithm
- Update hourly
- Shows:
  - Post content preview
  - Author and engagement metrics
  - Interactive preview

**Trending Hashtags**
- Most used hashtags today/this week
- Ranked by frequency and engagement
- Click hashtag to see all posts
- Shows hashtag statistics
- Subscribe to hashtags for updates

**People to Follow**
- Suggested user accounts
- Based on:
  - Your interests and follow patterns
  - Mutual friends and connections
  - Similar interests
  - Account activity and quality
- Shows:
  - Profile avatar and name
  - Bio
  - Mutual friends
  - Follow button

**Trending Groups**
- Most active and growing groups
- Shows group growth metrics
- Categories: Technology, Entertainment, etc.
- Member count and activity level
- Join button or Request Join (for private)

**Featured Communities**
- Curated list of active communities
- Staff-selected quality communities
- Community badges and verification
- Purpose and member count
- Join button

**Featured Pages**
- Brand, creator, and organization pages
- Verified pages with large followings
- Categories by type
- Follower count
- Follow button

**Trending Videos**
- Most viewed videos recently
- Based on watch time and engagement
- Duration and creator shown
- Thumbnail with play button
- Click to play
- Add to playlist option

### API: Get Discovery Data

```bash
GET /api/content/discovery
```

**Query Parameters:**
- `type`: Specific discovery type (posts, hashtags, people, groups, communities, pages, videos)
- `period`: Time period (day, week, month)
- `limit`: Results per category (default: 10)

**Response:**
```json
{
  "trendingPosts": [
    {
      "id": "post_abc123",
      "content": "Amazing discovery!",
      "author": "jane_developer",
      "reactions": 1245,
      "trend_rank": 1
    }
  ],
  "trendingHashtags": [
    {
      "tag": "ReactJS",
      "postCount": 5234,
      "trend_rank": 1
    }
  ],
  "peopleToFollow": [
    {
      "userId": "user_xyz789",
      "name": "John Developer",
      "followers": 12340,
      "mutualFriends": 3
    }
  ],
  "trendingGroups": [
    {
      "id": "group_def456",
      "name": "Web Developers",
      "members": 8920,
      "growth": 234
    }
  ]
}
```

## Hashtag Pages

### What Are Hashtag Pages?

Dedicated pages that collect all posts with a specific hashtag.

**Accessing Hashtag Pages:**
1. Click any hashtag (#tag) in posts or search results
2. Or type directly: `/hashtags/tagname` or `/#tagname`
3. Page shows all posts with that hashtag

### Hashtag Page Content

**Header Section:**
- Hashtag name (#topic)
- Post count ("1,247 posts with this tag")
- Follower count (for popular hashtags)
- Follow button
- Subscribe button (get notifications)

**Feed:**
- All public posts with hashtag
- Sorted by date (newest first) or popularity
- Only posts using exact hashtag
- Includes reposts and mentions
- Can filter by date range

**Hashtag Statistics:**
- Total posts count
- Activity trend (growing/declining)
- Top contributors
- Related hashtags
- Peak activity times

### Following Hashtags

**How to Follow:**
1. Go to hashtag page
2. Click **"Follow"** button
3. Now you receive:
   - Posts with this hashtag in your feed
   - Notifications about trending posts with hashtag
   - Hashtag updates in your notifications

**Manage Followed Hashtags:**
1. Go to Settings → Notifications or Preferences
2. Find "Followed Hashtags" section
3. Unfollow hashtags you no longer want
4. Adjust notification settings per hashtag

### API: Get Posts by Hashtag

```bash
GET /api/content/posts?hashtag=webdevelopment&page=1&limit=20
```

**Query Parameters:**
- `hashtag`: Hashtag name (without #)
- `page`: Pagination page number
- `limit`: Results per page
- `sortBy`: date or popularity
- `dateRange`: Time filter

**Response:**
```json
{
  "hashtag": "webdevelopment",
  "posts": [
    {
      "id": "post_abc123",
      "content": "Building web applications with React...",
      "author": "jane_developer",
      "createdAt": "2024-01-15T10:30:00Z",
      "hashtags": ["#webdevelopment", "#react"],
      "reactions": 234
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1247
  }
}
```

## Search History

### Saving Search History

Milonexa saves your recent searches for quick access:

**Automatic Saving:**
- Every search is saved automatically
- Stored locally on your device
- Accessible when clicking search bar
- Appears in dropdown suggestion list

**View Search History:**
1. Click search bar
2. See recent searches listed
3. Click any recent search to repeat it
4. Or type new search

### Managing Search History

**Clear Individual Search:**
1. Hover over search in history list
2. Click the **X** button next to search
3. Search is removed from history

**Clear All History:**
1. Click search bar
2. Look for **"Clear All History"** option
3. Click to clear all searches
4. All history is permanently removed

**Privacy Notes:**
- Search history is stored locally on your device
- Not sent to Milonexa servers (privacy-first approach)
- Clearing browser cache may clear search history
- Incognito/Private mode searches not saved

### Managing Search History Settings

**In Settings:**
1. Go to Settings → Privacy & Security
2. Find "Search History" option
3. Toggle on/off to enable/disable saving
4. When disabled, searches are not saved

## Advanced Search Tips

### Effective Search Strategies

**1. Use Specific Keywords:**
- "React hooks tutorial" better than "React"
- "sustainable fashion tips" better than "fashion"
- More specific = better results

**2. Use Quotation Marks:**
- `"exact phrase"` searches for exact matches
- `"machine learning basics"` finds posts with exact phrase
- Without quotes, results contain words in any order

**3. Use Negative Search:**
- `-keyword` excludes that keyword
- `React -Vue` finds React posts but excludes Vue
- Helpful to filter out unwanted results

**4. Combine Search Types:**
- `author:john type:blog` finds blogs by John
- `date:month type:video` finds videos from last month
- Combine multiple filters for precise search

**5. Use Operators:**
- `AND`: Include multiple terms (default)
- `OR`: Include any term (e.g., "React OR Vue")
- `NOT`: Exclude term (e.g., "JavaScript NOT jQuery")

### Search Examples

**Find All Videos by a Creator:**
- Query: `from:jane_developer type:video`
- Results: All videos uploaded by jane_developer

**Find Recent Blog Posts:**
- Query: `tutorial type:blog date:week`
- Results: Tutorial blog posts from last 7 days

**Find Popular Posts from Groups:**
- Query: `web development type:post sortBy:popularity`
- Results: Most popular web development posts

**Find Pages in Category:**
- Query: `type:page category:Brand`
- Results: All verified brand pages

## Search Performance

### Optimizing Search

**For Faster Results:**
1. Use specific keywords (searches index on keywords)
2. Specify content type (narrows search space)
3. Add date filter (reduces result count)
4. Avoid very common words alone (e.g., "the")
5. Use exact phrases for specific matches

**Handling No Results:**
1. Try broader search terms
2. Remove date restrictions
3. Expand content type filter
4. Check spelling and typos
5. Try semantic search with different phrasing

## Troubleshooting

**Q: Why aren't my posts showing in search?**
- A: Check post visibility is set to Public. Private/Friend posts don't appear in general search.

**Q: How often does search index update?**
- A: Real-time indexing. New posts appear in search within seconds.

**Q: Can I search private messages?**
- A: No, search only covers public posts and profiles. Private messages are not searchable.

**Q: Why are results not in the order I expect?**
- A: Default is relevance ranking. Change sort option to Date or Popularity.

**Q: How do I report search result quality?**
- A: Click the **three-dot menu** on any result and select "Report Issue". Helps improve search algorithm.

For additional search help, visit [support.milonexa.com](https://support.milonexa.com).
