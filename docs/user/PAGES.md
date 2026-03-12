# Pages Guide

Welcome to the Milonexa Pages section. This comprehensive guide covers everything you need to know about creating, managing, and growing your brand page on the platform.

## What is a Page?

A **Page** is a public-facing profile for brands, creators, organizations, and communities. Similar to Facebook Pages, Milonexa Pages allow you to:

- Build a dedicated presence separate from your personal profile
- Engage with followers interested in your brand or work
- Share professional content and updates
- Track analytics and engagement metrics
- Grow your audience organically
- Collaborate with multiple page editors

Pages are ideal for:
- **Brands & Companies**: Apple, Nike, Coca-Cola brand pages
- **Content Creators**: Influencers, bloggers, videographers
- **Organizations**: Non-profits, government agencies, educational institutions
- **Communities**: Local meetup groups, fan communities, interest-based networks
- **Entertainment**: Music artists, movie studios, gaming companies
- **Publications**: News outlets, magazines, blogs

## Creating a Page

### Getting Started

To create a new page:
1. Click your profile icon in the top right corner
2. Select **"Create Page"** from the dropdown
3. Alternatively, navigate to **/pages** and click **"Create New Page"**

### Page Information Form

When creating a page, you'll provide the following information:

#### 1. Page Name (Required)
- The official name of your brand, organization, or creator handle
- Should match your real brand name (not keywords for SEO)
- Maximum 100 characters
- Examples: "National Geographic", "Taylor Swift", "TechCrunch"

#### 2. Page Category (Required)
Choose the category that best represents your page:

- **Brand**: Companies, products, consumer brands
- **Creator**: Individual creators, influencers, artists
- **Organization**: Non-profits, charities, government agencies, educational institutions
- **Community**: Local groups, fan communities, interest-based communities
- **Entertainment**: Musicians, actors, comedians, content creators (entertainment-focused)
- **Other**: Miscellaneous or hard-to-categorize pages

The category helps users discover your page through browsing and affects recommendation algorithms.

#### 3. Page Description (Required)
- Brief explanation of what your page is about
- What content followers can expect
- Maximum 500 characters
- Should be informative and engaging
- Examples:
  - "Professional photography and visual storytelling"
  - "The world's most authoritative tech news source"
  - "Sustainable fashion for conscious consumers"

#### 4. Website URL (Optional)
- Link to your official website
- Followers can easily access your site
- Can be updated later in page settings
- Format: https://www.example.com

#### 5. Logo/Avatar (Optional)
- Square image that represents your brand
- Recommended size: 512x512px (minimum 200x200px)
- Appears next to your page name everywhere
- Supported formats: JPG, PNG, WebP
- Maximum file size: 5MB
- Used as the primary visual identifier for your page

#### 6. Cover Photo (Optional)
- Large image displayed at the top of your page
- Recommended size: 1200x628px (16:9 aspect ratio)
- First impression for visitors to your page
- Supported formats: JPG, PNG, WebP
- Maximum file size: 10MB
- Update seasonally or for campaigns

### API: Creating a Page

To create a page programmatically:

```bash
POST /api/user/pages
Content-Type: application/json

{
  "name": "GreenTech Innovations",
  "description": "Building sustainable solutions for a better tomorrow",
  "category": "Brand",
  "website": "https://www.greentechinnovations.com"
}
```

**Response:**
```json
{
  "id": "page_abc123",
  "name": "GreenTech Innovations",
  "description": "Building sustainable solutions...",
  "category": "Brand",
  "website": "https://www.greentechinnovations.com",
  "pageHandle": "greentechinnovations",
  "createdAt": "2024-01-15T10:30:00Z",
  "avatar": null,
  "coverPhoto": null,
  "followers": 0,
  "isVerified": false
}
```

## Page URLs and Handles

### Unique Page Handle

Each page is assigned a unique URL handle (username-style identifier):
- Format: `/pages/@pagename` or `/pages/:id`
- Auto-generated from your page name, with numbers added if needed
- Can be customized in page settings (if your plan supports it)
- Examples:
  - `/pages/@greentechinnovations`
  - `/pages/@nike`
  - `/pages/@nyt`

### Sharing Your Page

Share your page URL with followers:
- Direct link in social media profiles
- QR code generation (available in share options)
- Page permalink in bio
- Include in email signatures

## Following a Page

### How to Follow

Users can follow your page to receive your posts in their feed:

1. Navigate to your page
2. Click the blue **"Follow"** button
3. User is now a follower and will receive notifications about your posts

### API: Follow a Page

```bash
POST /api/user/pages/:id/follow
```

**Response:**
```json
{
  "success": true,
  "following": true,
  "followersCount": 1523
}
```

### Notifications for Followers

Followers receive:
- New posts in their timeline feed
- Notifications about featured/pinned posts
- Event announcements (if your page creates events)
- Promotional content (if enabled)

## Unfollowing a Page

Users can unfollow your page at any time:

1. Click the **"Following"** button on your page
2. Select **"Unfollow"** from the dropdown
3. User is removed from your follower list

### API: Unfollow a Page

```bash
POST /api/user/pages/:id/unfollow
```

**Response:**
```json
{
  "success": true,
  "following": false,
  "followersCount": 1522
}
```

## Page Feed

Your page feed is where all your posts appear for followers to see.

### Feed Visibility

- Posts on your page are visible to all followers
- Public pages: posts are visible to anyone (followers and non-followers)
- Posts appear in reverse chronological order (newest first)
- Followers receive notifications based on their settings

### Feed Features

**Reactions & Engagement:**
- Followers can like, love, laugh, or react with emoji
- Comments allow discussion
- Shares amplify your content to other users' feeds
- Bookmark feature lets followers save posts

**Post Metrics:**
- View count
- Reaction count
- Comment count
- Share count
- Track engagement in real-time

## Creating Page Posts

### Composing a Post

Page posts are created through your page identity, not your personal account. This is important for brand voice consistency.

**How to Create a Page Post:**
1. Navigate to your page
2. Click the compose box ("Share an update...")
3. Select the page you're posting as (if you manage multiple pages)
4. Write your post content
5. Add media (images, videos, documents)
6. Set visibility and scheduling
7. Click **"Publish"** or **"Schedule"**

### Post Content Types

Pages support rich content creation:

**Text Posts:**
- Write directly in the compose box
- Format with bold, italic, links
- Mention other pages or users with @
- Use hashtags for discoverability
- Up to 5000 characters

**Image Posts:**
- Add up to 4 images per post
- Carousel format supported
- Recommended sizes: 1200x628px for single image
- Supported formats: JPG, PNG, GIF, WebP
- Maximum 10MB per image
- Alt text support for accessibility

**Video Posts:**
- Add 1 video per post
- Supported formats: MP4, MOV, AVI
- Maximum 100MB
- Auto-generates thumbnail (or upload custom)
- Video captions optional but recommended

**Mixed Content:**
- Combine text with multiple images
- Combine text with video
- Include links to external resources
- Embed polls for engagement

### API: Create Page Post

```bash
POST /api/content/posts
Content-Type: application/json

{
  "content": "Excited to announce our new sustainable packaging initiative!",
  "pageId": "page_abc123",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/packaging.jpg"
    }
  ],
  "visibility": "public"
}
```

**Response:**
```json
{
  "id": "post_xyz789",
  "pageId": "page_abc123",
  "content": "Excited to announce...",
  "createdAt": "2024-01-15T14:25:00Z",
  "views": 0,
  "reactions": 0,
  "comments": 0
}
```

## Scheduling Posts

### Why Schedule Posts?

- Post when your audience is most active
- Maintain consistent posting schedule
- Publish across time zones
- Plan content calendar in advance
- Automate recurring announcements

### How to Schedule

1. Create a post as normal
2. Instead of clicking **"Publish"** immediately
3. Click **"Schedule Post"**
4. Select date and time for publication
5. Click **"Schedule"**

**The post will automatically publish at the scheduled time.**

### Scheduled Post Management

View and manage scheduled posts:
1. Go to your page
2. Click **"Settings"** (⚙️)
3. Select **"Scheduled Posts"**
4. View all upcoming posts
5. Edit, reschedule, or delete as needed

### Best Times to Post

Based on platform data:
- **Weekdays**: 9 AM - 3 PM (working hours)
- **Peak Hours**: 12-1 PM, 5-6 PM
- **Best Day**: Tuesday-Thursday
- **Engagement**: Mornings slightly outperform evenings

Your page analytics will show YOUR audience's specific peak times.

## Page Insights & Analytics

### What is Page Insights?

Page Insights is a comprehensive analytics dashboard showing:
- How many people see your content
- How engaged your audience is
- Who your followers are
- When your audience is most active
- Growth trends over time

**Availability:** Page admins and editors only

### Accessing Analytics

1. Navigate to your page
2. Click **"Insights"** (bar chart icon)
3. View your analytics dashboard

### Key Metrics Explained

#### Follower Count
- Total followers on your page
- Daily/monthly change
- Growth chart over time
- Goal tracking (set targets)

#### Post Reach
- Number of unique users who see your content
- Organic reach vs. promoted reach
- Reach by post type (text, image, video)
- Reach trends
- Top performing posts

#### Engagement Rate
- Percentage of followers who engage with your content
- Reactions, comments, shares
- Engagement by content type
- Average engagement per post
- Trending engagement metrics

#### Post Performance Details
- View count per post
- Reaction types (likes, loves, laughs, etc.)
- Comment count and quality
- Share count and amplification
- Click-through rate (for linked posts)

#### Audience Demographics (When Available)
- Age distribution
- Gender distribution
- Geographic distribution
- Top countries and regions
- Device types used
- Time zones

#### Activity Timing
- When your audience is most active
- Most active days and hours
- Post performance by publish time
- Comparison to previous periods

### API: Get Page Insights

```bash
GET /api/user/pages/:id/insights
```

**Query Parameters:**
- `period`: day, week, month, year (default: month)
- `startDate`: ISO 8601 format (optional)
- `endDate`: ISO 8601 format (optional)

**Response:**
```json
{
  "pageId": "page_abc123",
  "period": "month",
  "followerCount": 1523,
  "followerGrowth": 45,
  "totalReach": 12450,
  "totalImpressions": 18920,
  "engagementRate": 8.4,
  "topPosts": [
    {
      "postId": "post_123",
      "content": "...",
      "reach": 2100,
      "engagement": 156,
      "publishedAt": "2024-01-10T14:00:00Z"
    }
  ],
  "demographics": {
    "ageGroups": { "18-24": 12, "25-34": 35, "35-44": 28, "45-54": 15, "55+": 10 },
    "topCountries": ["US", "UK", "CA"],
    "topCities": ["New York", "London", "Toronto"]
  }
}
```

### Exporting Reports

Export your analytics data:
1. Go to **Insights**
2. Click **"Export"**
3. Choose format: PDF, CSV, or Excel
4. Select date range
5. Download report

Create scheduled reports (daily, weekly, monthly) sent to your email.

## Managing Multiple Pages

### Viewing Your Pages

To see all pages you manage:
1. Click your profile icon (top right)
2. Select **"My Pages"**
3. View all pages you own or manage

Alternatively, navigate directly to `/pages/my-pages`

### Switching Between Pages

When composing content, you select which page you're posting as:
1. In the compose box, you'll see a page selector dropdown
2. Click to choose which page to post as
3. Your selected page appears next to the compose button

### Managing Page Access

**As a Page Admin:**
Add other people to manage your page:
1. Go to page **Settings** (⚙️)
2. Select **"Roles & Access"**
3. Click **"Add Editor"**
4. Search for and select the person
5. Assign role (see roles below)

### Page Roles

**Page Admin (Owner)**
- Full control over the page
- Can post, edit, delete posts
- Can manage page settings and appearance
- Can add/remove other admins and editors
- Can view all analytics
- Can delete the page
- Usually the original creator or owner

**Page Editor**
- Can post and edit posts
- Can schedule posts
- Can manage comments (moderate, delete)
- Can view analytics
- Cannot change page settings
- Cannot add/remove team members
- Great for content creators and social media managers

**Page Moderator**
- Can moderate comments and remove spam
- Can view limited analytics
- Cannot post or edit page settings
- Can report flagged content
- Great for community managers

## Featured Posts

### Pinning Posts

Feature important posts at the top of your page:

1. Create or publish a post
2. Click the three-dot menu (⋯) on the post
3. Select **"Pin to Top"** (or **"Feature Post"**)
4. Confirm pinning

**Pinned posts:**
- Appear at the very top of your page feed
- Remain prominent for specified duration
- Override chronological ordering
- Great for announcements, promotions, important updates
- Can have up to 3-5 pinned posts simultaneously (depending on plan)

### Unpinning

To remove a featured post:
1. Click the three-dot menu on the pinned post
2. Select **"Unpin"**
3. Post returns to chronological feed order

## Page Verification Badge

### What is Verification?

The verification badge (✓) indicates that your page is the authentic, official account for your brand or person. This:
- Builds trust with your audience
- Helps prevent impersonation
- Improves discoverability
- Shows legitimacy and authority

### Requesting Verification

**Eligibility Requirements:**
- Active page with regular content (at least 10 posts)
- Minimum followers (varies by category, typically 100-1000)
- Page must be publicly available
- Consistent with your official brand
- No violation of platform policies
- Account older than 30 days

**How to Request:**
1. Go to page **Settings** (⚙️)
2. Select **"Verification"**
3. Click **"Request Verification"**
4. Provide verification details:
   - Official website URL
   - Government ID or business documents
   - Proof of official social media accounts
5. Submit application

**Review Process:**
- Applications reviewed within 5-10 business days
- You'll receive notification of approval or denial
- Reasons for denial are provided
- Can reapply after 30 days

### Verified Status

Once verified:
- Blue checkmark appears on your page
- Appears next to your name in profiles and posts
- Improves visibility in search results
- Increases credibility with audience

## Follower Management

### Viewing Your Followers

See who follows your page:
1. Go to your page
2. Click **"Followers"**
3. View list of all followers with:
   - Profile avatar and name
   - Bio/description
   - Mutual followers
   - Follow/Remove options

### Follower List Features

**Search & Filter:**
- Search by username
- Filter by join date
- Filter by engagement level
- Sort by most recent

**Exporting Followers:**
Export your follower list for CRM integration:
1. Go to **Followers**
2. Click **"Export"**
3. Choose format: CSV, Excel, or JSON
4. Download file with:
   - Usernames
   - Join dates
   - Email (if available)
   - Engagement metrics

### Managing Followers

**Remove Follower:**
1. Find the follower in your list
2. Click the three-dot menu (⋯)
3. Select **"Remove Follower"**
4. They'll no longer see your posts
5. They can re-follow if they want

**Note:** Removed followers are not notified, but can still see your public posts if they visit your page directly.

### Engagement with Followers

**Direct Messages:**
- Some plans allow DM from page
- Engage in one-on-one conversations
- Build relationships with followers
- Available in Messages section

**Comments & Mentions:**
- Monitor comments on your posts
- Respond to questions and feedback
- Tag followers in relevant posts
- Create community through interaction

## Best Practices for Page Success

### Content Strategy

1. **Consistency**: Post regularly on a schedule
2. **Quality**: High-quality images, videos, and writing
3. **Relevance**: Share content your audience cares about
4. **Authenticity**: Be genuine and transparent
5. **Engagement**: Respond to comments and questions
6. **Variety**: Mix different content types
7. **Timing**: Post when your audience is active
8. **Storytelling**: Tell compelling brand stories

### Building Your Audience

1. **Cross-Promote**: Link your page from other platforms
2. **Collaborations**: Partner with complementary brands
3. **Contests & Giveaways**: Encourage follows and engagement
4. **Call to Actions**: Ask followers to share, comment, follow
5. **Hashtags**: Use relevant hashtags for discoverability
6. **Engagement**: Like and comment on followers' posts
7. **Analytics**: Use insights to refine your strategy

### Community Management

1. **Respond**: Answer questions and comments promptly
2. **Thank**: Acknowledge and thank engaged followers
3. **Moderate**: Remove spam and inappropriate content
4. **Guidelines**: Establish and enforce community rules
5. **Celebrate**: Highlight user-generated content
6. **Listen**: Pay attention to feedback and criticism

## Troubleshooting

**Q: How long does verification take?**
- A: Reviews typically take 5-10 business days. You'll receive a notification when complete.

**Q: Can I have multiple pages?**
- A: Yes! You can manage multiple pages from a single account.

**Q: What's the difference between a Page and my Personal Profile?**
- A: Pages are for brands/organizations, personal profiles are for individuals. Pages have separate followers and analytics.

**Q: How do I change my page name?**
- A: Go to Settings → Edit Page Info. Name changes can be made once per 60 days.

**Q: Can I delete a page?**
- A: Yes, admins can delete a page in Settings → Delete Page. This is permanent.

**Q: How do I merge two pages?**
- A: Unfortunately, pages cannot be merged. You'll need to manually migrate followers and content.

For additional support, visit [support.milonexa.com](https://support.milonexa.com) or contact our team.
