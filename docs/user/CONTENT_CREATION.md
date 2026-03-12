# Content Creation Guide

Welcome to the Milonexa Content Creation guide. This comprehensive resource covers all the tools and features available for creating and sharing various types of content on the platform.

## Creating Text Posts

### Getting Started

Text posts are the most common way to share updates, thoughts, and information on Milonexa.

**How to Create a Text Post:**
1. Navigate to your home feed or profile
2. Click the compose box at the top that says **"What's on your mind?"**
3. Start typing your post content
4. Add media, mentions, hashtags, and formatting as desired
5. Click **"Post"** when ready to publish

### Post Visibility

You can control who sees each post:

**Public**
- Visible to anyone on the platform
- Appears in search results
- Shows in others' feeds
- Can be shared and reposted
- Best for: General content, announcements, shareable moments

**Friends Only**
- Only visible to your friends
- Doesn't appear in public search
- Shows in friends' feeds
- Cannot be reposted by non-friends
- Best for: Personal updates, family moments, semi-private content

**Private**
- Only you can see the post
- Invisible to everyone else
- Does not appear anywhere else
- Best for: Drafts, personal notes, private thoughts

### API: Create a Text Post

```bash
POST /api/content/posts
Content-Type: application/json

{
  "content": "Just launched my new portfolio! Check it out and let me know what you think.",
  "visibility": "public",
  "attachments": []
}
```

**Response:**
```json
{
  "id": "post_abc123",
  "userId": "user_xyz789",
  "content": "Just launched my new portfolio!",
  "visibility": "public",
  "createdAt": "2024-01-15T10:30:00Z",
  "likes": 0,
  "comments": 0,
  "shares": 0
}
```

## Post Character Limit

**Maximum:** 5,000 characters per post

This generous limit allows for:
- Short, punchy updates
- Longer, more thoughtful posts
- Multi-paragraph content
- Detailed announcements
- Song lyrics, quotes, and poetry

**Character Counter:**
As you type, you'll see a character counter in the bottom-right of the compose box. It shows:
- Current character count
- Maximum limit (5,000)
- Color changes to orange at 4,000 characters and red at 4,900

## Adding Images

### Image Support

Milonexa supports multiple image formats to accommodate all types of photography and graphics:

**Supported Formats:**
- JPG (JPEG) - Most common photo format
- PNG - Best for graphics, supports transparency
- GIF - Animated images supported
- WebP - Modern, optimized format

### Image Guidelines

**File Size:**
- Maximum 10MB per image
- Smaller files load faster (recommend < 5MB)
- Compress images for web to maintain quality while reducing size

**Dimensions:**
- No strict size requirements
- Recommended: 1200x628px for optimal feed display
- Aspect ratios: 1:1, 4:3, 16:9 all supported
- Minimum: 100x100px

**Quality:**
- Use high-quality images for best results
- Avoid overly compressed or pixelated images
- Ensure text in images is readable

### How to Add Images

**Drag and Drop:**
1. Click and drag image files directly into the compose box
2. Drop them to upload
3. Images appear in preview
4. Reorder by dragging within the post

**Click to Browse:**
1. Click the **image icon** (🖼️) in the compose toolbar
2. Select **"Choose Image"** or **"Upload Image"**
3. Browse your device and select file(s)
4. Click **"Open"** to confirm

**File Manager Integration:**
1. If you've recently uploaded images, they appear in suggested files
2. Click any recent image to add it quickly
3. Reduces re-uploading of frequently used images

### Multiple Images

**Maximum:** 4 images per post

**Display Format:**
- 1 image: Full width in feed
- 2 images: Side-by-side
- 3 images: 2 on top row, 1 larger on bottom
- 4 images: 2x2 grid

**Carousel Option:**
- Create swipeable image galleries
- Users swipe left/right to view images
- Great for product showcases, tutorials, before/after comparisons

### Image Alt Text

Add descriptions for accessibility and SEO:

1. Hover over an image in the post preview
2. Click the **"Alt Text"** button
3. Type a descriptive caption (max 200 characters)
4. Examples:
   - "Sunset over the Golden Gate Bridge"
   - "My new puppy, Max, sleeping"
   - "Screenshot of website analytics dashboard"

## Adding Videos

### Video Support

Share high-quality videos with your audience.

**Supported Formats:**
- MP4 - Most common, widely supported
- MOV - QuickTime format, Mac-friendly
- AVI - Windows video format
- MKV - Matroska format (high quality)

### Video Guidelines

**File Size:**
- Maximum 100MB per video
- Recommended: < 50MB for faster upload and streaming
- Bitrate: 1000-4000 kbps for good quality

**Duration:**
- No maximum length
- No minimum length
- Typical optimal length: 15 seconds to 10 minutes

**Dimensions:**
- Recommended: 1920x1080 (1080p or Full HD)
- Also supports: 4K (3840x2160), 720p (1280x720)
- Minimum: 400x300 px
- Aspect ratio: 16:9, 9:16, or 1:1 all supported

### How to Add Videos

**Drag and Drop:**
1. Drag a video file into the compose box
2. Drop to begin uploading
3. Progress indicator shows upload status
4. Video preview appears when ready

**Click to Upload:**
1. Click the **video icon** (🎬) in the compose toolbar
2. Select **"Upload Video"**
3. Choose file from your device
4. Wait for upload to complete

**Internet Connection:**
- Ensure stable connection during upload
- Large videos may take several minutes
- Video encoding happens in background after upload

### Video Features

**Auto-Generated Thumbnail:**
- Milonexa automatically selects a key frame as thumbnail
- Appears as preview in feed
- Users click to play video

**Custom Thumbnail:**
1. After uploading, click **"Change Thumbnail"**
2. Select frame from video timeline, or upload custom image
3. Upload custom images must be JPG/PNG format

**Captions & Subtitles:**
1. Click **"Add Captions"** during or after upload
2. Upload SRT or VTT caption file
3. Or manually enter captions with timestamps
4. Captions are optional but recommended for accessibility

**Video Tags:**
- Add tags when uploading (see section below)
- Makes videos discoverable through tag search
- Maximum 10 tags per video

### Maximum Videos Per Post

**Limit:** 1 video per post

If you want to share multiple videos:
- Create separate posts
- Combine into a single video file before uploading
- Create a playlist (see Videos and Media guide)

## Adding File Attachments

### Attachment Support

Share documents and other files with your posts.

**Supported Formats:**
- PDF - Documents and publications
- DOCX - Microsoft Word documents
- XLSX - Excel spreadsheets
- PPTX - PowerPoint presentations
- TXT - Plain text files
- ZIP - Compressed archives
- And many others (up to 50MB each)

### File Size Limits

**Maximum:** 50MB per file

**Recommended Sizes:**
- Documents: < 5MB
- Spreadsheets: < 10MB
- Archives: < 50MB

### How to Add Attachments

1. Click the **attachment icon** (📎 or 📄) in the compose toolbar
2. Select **"Add File"** or **"Attach Document"**
3. Browse your device and select file(s)
4. Click **"Open"** to attach

**Multiple Attachments:**
- Maximum 5 files per post
- Mix different file types
- Total size limited to 200MB per post

### Sharing Documents

**Use Cases:**
- Share research papers or whitepapers
- Distribute ebooks or guides
- Share presentations or slides
- Distribute templates or resources
- Upload job postings or requirements

**Access Control:**
- Files inherit post visibility settings
- Public post = publicly downloadable file
- Private post = only you can access

## Emoji Picker

### Using Emojis

Add expressive emojis to your posts.

**How to Insert Emojis:**
1. Click the **emoji icon** (😊) in the compose toolbar
2. A emoji picker panel opens
3. Browse categories or search by name
4. Click an emoji to insert it into your post
5. Click multiple times for multiple emojis

### Emoji Categories

**Browse by:**
- Smileys & Emotions
- People & Body
- Animals & Nature
- Food & Drink
- Travel & Places
- Activities
- Objects
- Symbols
- Flags

### Search Emojis

1. In the emoji picker, click the **search icon** (🔍)
2. Type emoji name (e.g., "heart", "fire", "rocket")
3. Matching emojis appear instantly
4. Click to select

### Emoji Usage Tips

- **Enhance tone**: 😄 vs. 😠 completely changes message tone
- **Call attention**: 🚀 at start of announcement
- **Add personality**: Use relevant emojis for visual interest
- **Don't overuse**: Limit to 1-3 emojis per post
- **Cultural awareness**: Some emojis have different meanings in different cultures

## Mentions

### How to Mention Users

Tag specific people in your posts.

**Creating a Mention:**
1. Type **@** in your post
2. Start typing a username
3. Autocomplete suggestions appear
4. Click or press Enter to select
5. The username appears as a blue link in your post

**Example:**
"Great job on the presentation @john_smith! You crushed it!"

### Mention Features

**Notifications:**
- Mentioned users receive a notification
- They see your post highlighted in their notifications
- Click notification to view your post and response

**Tagging Multiple People:**
- Use multiple @ mentions in a single post
- Maximum practical limit: 5-10 mentions
- Too many mentions can be considered spam

**Mentions in Comments:**
- Reply to someone's post and mention them
- Works the same way as in posts
- They receive notification of being mentioned in comments

### Best Practices

- **Relevant mentions**: Only mention people relevant to your post
- **Ask permission**: If mentioning for feedback, ask first
- **Credit creators**: Mention the original creator when sharing their work
- **Avoid spam**: Don't mention unrelated people for visibility

## Hashtags

### What Are Hashtags?

Hashtags (words preceded by #) categorize content and make it discoverable.

**Example:** #WebDevelopment, #TravelBlogger, #FitnessGoals

### Creating Hashtags

**In Your Post:**
1. Type **#** followed by a word or phrase (no spaces)
2. Hashtag appears in blue/highlighted
3. Users can click to see all posts with that hashtag
4. Use 1-5 hashtags per post (more is considered spam)

**Hashtag Rules:**
- No spaces allowed
- Can include letters, numbers, underscores
- Cannot include special characters (except _ and -)
- First character must be letter or number
- Case-insensitive (#travel = #Travel = #TRAVEL)

### Hashtag Discovery

**How People Find Your Posts:**
1. Users click a hashtag
2. Feed shows all public posts with that hashtag
3. Posts sorted by relevance and date
4. Subscribe to hashtags to follow their feed

**API: Posts by Hashtag**
```bash
GET /api/content/posts?hashtag=webdevelopment&page=1
```

### Hashtag Best Practices

**Popular Hashtags:**
- #Help - Request assistance
- #Throwback - Share old/archived content
- #TodayILearned - Share learnings
- #Motivation - Inspirational content
- #News - Current events

**Niche Hashtags:**
- Industry-specific: #ReactJS, #Blockchain
- Local: #NYCTech, #LondonStartups
- Community: #GreenEnergyMovement

**Strategy:**
1. **Research**: See what hashtags similar posts use
2. **Mix tiers**: 1-2 popular, 2-3 medium, 1 niche hashtag
3. **Relevance**: Only use hashtags truly relevant to your content
4. **Monitor**: Track which hashtags drive engagement
5. **Update**: Adjust hashtag strategy based on performance

## Creating Polls

### Interactive Polls

Engage your audience with polls to gather opinions.

**How to Create a Poll:**
1. Click in the compose box
2. Click the **poll icon** (📊)
3. Write your poll question
4. Add up to 4 answer options
5. Optionally set expiry time
6. Click **"Create Poll"** then **"Post"**

### Poll Options

**Question Text:**
- Maximum 200 characters
- Should be clear and unambiguous
- Be neutral (avoid biased language)

**Answer Choices:**
- Minimum 2 options
- Maximum 4 options
- Each option: maximum 100 characters
- Examples:
  - "Yes / No / Maybe"
  - "React / Vue / Angular / Svelte"
  - "Morning / Afternoon / Evening / Night"

**Expiry Time:**
- Optional setting
- Can be: 1 day, 3 days, 7 days, 30 days, or No expiry
- Poll closes at expiry and shows final results
- Users cannot vote after expiry

### Voting & Results

**Voting:**
- Users click an option to vote
- Vote counts immediately
- Users can change their vote
- Only one vote per user per poll

**Results Display:**
- Real-time percentage bars
- Vote count per option
- Total voters shown
- Results visible before and after voting
- Final snapshot when poll expires

**Poll Insights:**
- See detailed vote breakdown
- Understand audience preferences
- Use for content decisions
- Share results in follow-up posts

## Creating Blog Posts

### Blog Posts vs. Regular Posts

**Blog Posts:**
- Longer-form content (no character limit)
- Rich text editor with formatting
- Can be drafted and scheduled
- Have unique URLs
- Support comments and sharing
- Appear in blog section and feed
- Better for: Articles, tutorials, opinions, stories

**Regular Posts:**
- Short-form content (5,000 characters)
- Simple text formatting
- Immediate publishing
- No custom URLs
- Appear in main feed only
- Better for: Quick updates, reactions, announcements

### Accessing the Blog

**How to Write:**
1. Navigate to **/blog** or click **"Blog"** in main navigation
2. Click **"Write New Post"** or **"Create Article"** button
3. Opens blog post editor

### Blog Post Editor

The rich text editor includes formatting tools:

**Text Formatting:**
- **Bold** (Ctrl+B) - Emphasis for important terms
- *Italic* (Ctrl+I) - Secondary emphasis
- ~~Strikethrough~~ (Ctrl+Shift+X) - Show removed or corrected text
- Underline (Ctrl+U) - Additional emphasis

**Text Structure:**
- **Heading 1** (H1) - Main title/section headers
- **Heading 2** (H2) - Subsection headers
- **Heading 3** (H3) - Sub-subsection headers
- **Paragraph** - Normal text body
- **Quote** - Highlighted quotations
- **Code Block** - Formatted code snippets

**Lists:**
- **Bullet List** - Unordered items
- **Numbered List** - Ordered steps
- **Nested Lists** - Sublists for hierarchy

**Media:**
- **Insert Image** - Add images to article
- **Insert Video** - Embed videos (by URL or upload)
- **Insert Link** - Add hyperlinks to text
- **Insert Embed** - Embed external content (YouTube, Twitter, etc.)

### Blog Post Fields

**Title** (Required)
- Main heading of your article
- Maximum 200 characters
- Should be compelling and descriptive
- Appears in blog feed and search results

**Content** (Required)
- Your article body using rich editor
- No character limit
- Can be as long as needed
- Format with headings, lists, bold, etc.

**Tags** (Optional)
- Categorize your post by topic
- Maximum 10 tags
- Help readers find related posts
- Appear in tag cloud
- Examples: #Writing, #Tutorial, #Tips

**Cover Image** (Optional)
- Eye-catching image for article preview
- Appears at top of article
- Size: Minimum 600x400px
- Recommended: 1200x600px (16:9 ratio)
- File formats: JPG, PNG, WebP

**Custom Slug** (Optional)
- URL-friendly post identifier
- Default: Auto-generated from title
- Manual: Choose your own (e.g., "my-guide-to-reactjs")
- Must be unique
- Affects URL: /blog/@yourname/your-custom-slug

**Status**
- **Draft**: Private, unpublished post
- **Publish**: Make post public immediately
- **Schedule**: Set a future publish date/time

### API: Create Blog Post

```bash
POST /api/content/blogs
Content-Type: application/json

{
  "title": "Getting Started with React Hooks",
  "content": "<h2>Introduction</h2><p>React Hooks are a powerful feature...</p>",
  "tags": ["react", "javascript", "tutorial"],
  "coverImage": "https://cdn.example.com/react-cover.jpg",
  "slug": "getting-started-with-react-hooks",
  "status": "published"
}
```

**Response:**
```json
{
  "id": "blog_abc123",
  "title": "Getting Started with React Hooks",
  "slug": "getting-started-with-react-hooks",
  "userId": "user_xyz789",
  "views": 0,
  "likes": 0,
  "comments": 0,
  "publishedAt": "2024-01-15T10:30:00Z"
}
```

## Video Upload and Management

### Video Section

Access the video manager at **/videos** or click **"Videos"** in navigation.

### Uploading Videos

**Upload Interface:**
1. Click **"Upload Video"** button
2. Select video file from your device
3. Upload begins (shows progress bar)
4. While uploading, fill in video details

### Video Details

**Title** (Required)
- Name of your video
- Maximum 100 characters
- Should be descriptive and engaging
- Appears as video heading

**Description** (Optional)
- Detailed explanation of video content
- Maximum 5000 characters
- Support markdown formatting (bold, links, etc.)
- Include timestamps for longer videos
- Example: "[0:00] - Introduction [2:15] - Main topic [5:30] - Conclusion"

**Tags** (Optional)
- Categorize your video by topics
- Maximum 10 tags
- Helps with video discoverability
- Example tags: #Tutorial, #Gaming, #MusicVideo

**Category** (Required)
- Classify video type:
  - Technology
  - Entertainment
  - Education
  - Gaming
  - Music
  - Sports
  - News
  - How-To
  - Vlog
  - Other

**Thumbnail** (Optional)
- Custom preview image
- Auto-generated if not provided
- Size: 1280x720px (16:9 aspect ratio)
- File formats: JPG, PNG
- Click frame in timeline to select auto-thumbnail

**Privacy** (Required)
- **Public**: Visible to all, appears in search, can be shared
- **Unlisted**: Only visible via direct link, not in search
- **Private**: Only you can view

### API: Upload Video

```bash
POST /api/content/videos
Content-Type: multipart/form-data

{
  "video": <binary file>,
  "title": "My Amazing Travel Vlog",
  "description": "Exploring the streets of Tokyo...",
  "tags": ["travel", "japan", "vlog"],
  "category": "Vlog",
  "privacy": "public"
}
```

## Editing Posts

### Edit Your Posts

Change content after publishing.

**How to Edit:**
1. Hover over or click your post
2. Click the **three-dot menu** (⋯)
3. Select **"Edit"** or **"Edit Post"**
4. Modify your content
5. Click **"Save Changes"**

### What You Can Edit

- Post text content
- Images (add, remove, reorder)
- Visibility settings
- Hashtags and mentions
- Formatting

### What You Cannot Edit

- Video files (upload new video instead)
- Post type (post to blog, etc.)
- Publication date/time (unless resharing)

### Edit History

- Original post shows "Edited" indicator
- Click to see edit history
- Shows all versions and timestamps
- Users can see when content changed

### API: Edit Post

```bash
PUT /api/content/posts/:id
Content-Type: application/json

{
  "content": "Updated content goes here",
  "attachments": []
}
```

## Deleting Posts

### Permanent Deletion

Remove your posts completely.

**How to Delete:**
1. Click the **three-dot menu** (⋯) on your post
2. Select **"Delete"** or **"Delete Post"**
3. Confirm dialog: "Are you sure? This cannot be undone."
4. Post is removed permanently

### After Deletion

- Post disappears from your profile
- Removed from feed of all followers
- Removed from search results
- Cannot be recovered
- Comments and reactions are also deleted

### API: Delete Post

```bash
DELETE /api/content/posts/:id
```

## Reporting Posts

### Report Inappropriate Content

Flag posts that violate community guidelines.

**How to Report:**
1. On someone else's post, click the **three-dot menu** (⋯)
2. Select **"Report Post"** or **"Report"**
3. Choose report reason (see below)
4. Optionally add details in text field
5. Click **"Submit Report"**

### Report Reasons

- **Spam**: Unwanted promotional or repetitive content
- **Harassment**: Targeted abuse or bullying
- **Hate Speech**: Content promoting discrimination
- **Misinformation**: False or misleading information
- **Violence or Danger**: Threats or dangerous content
- **Sexual Content**: Inappropriate or exploitative content
- **Self-Harm**: Content promoting self-injury or suicide
- **Other**: Any other violation

### Privacy & Confidentiality

- Reports are confidential
- The reported user doesn't know who reported them
- Multiple reports trigger moderation review
- Your identity is protected

## Content Scheduling

### Schedule Posts

Publish posts at optimal times without manual posting.

**How to Schedule:**
1. Create a post as normal (text, images, video)
2. Instead of clicking **"Post"** immediately
3. Click **"Schedule Post"** or **"Schedule for Later"**
4. Select date and time for publication
5. Click **"Schedule"**

**Timezone Support:**
- Schedule in your local timezone
- Platform converts to UTC for consistency
- Shows scheduled time in your timezone

### Scheduling Options

- **Schedule for Later Today**: Publish at specific time today
- **Schedule for Tomorrow**: Specify time and day
- **Custom Date/Time**: Pick exact date and time
- **Recurring Posts**: Schedule similar posts for multiple dates (if supported)

### Managing Scheduled Posts

View and modify scheduled posts:
1. Go to your profile
2. Click **"Scheduled"** or **"Scheduled Posts"**
3. View upcoming posts with:
   - Post preview
   - Scheduled date/time
   - Edit or cancel options

4. Edit: Modify content, text, scheduling
5. Cancel: Remove from schedule (can repost manually)
6. Reschedule: Change publication date/time

### API: Schedule Post

```bash
POST /api/content/posts
Content-Type: application/json

{
  "content": "Check out my new project launching tomorrow!",
  "visibility": "public",
  "publishAt": "2024-01-16T14:00:00Z"
}
```

## Content Discoverability

### Making Content Discoverable

**Use These Features:**
- **Hashtags**: Add 1-5 relevant hashtags
- **Keywords**: Use descriptive titles and content
- **Mentions**: Mention relevant people or pages
- **Categories**: Choose appropriate tags/categories
- **Timing**: Post when your audience is active
- **Engagement**: Respond to comments to boost visibility
- **Quality**: High-quality images/videos get more visibility

### Best Practices

1. **Write compelling titles** for blog posts and videos
2. **Use descriptive language** throughout your content
3. **Add alt text** to images for accessibility and SEO
4. **Link to related content** using mentions and links
5. **Engage with similar content** to build community
6. **Post regularly** but don't spam
7. **Listen to audience** and create relevant content

For more guidance on content creation, visit our [Blog](https://blog.milonexa.com) or contact support.
