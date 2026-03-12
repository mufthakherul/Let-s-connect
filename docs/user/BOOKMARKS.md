# Bookmarks Guide

Welcome to the Milonexa Bookmarks guide. This guide covers everything you need to know about saving, organizing, and managing bookmarks on the platform.

## What Can Be Bookmarked

The bookmark feature allows you to save various types of content for later reference and organization. Currently supported bookmarkable content includes:

### Posts
- Regular text posts from your feed
- Image posts and galleries
- Posts with video attachments
- Posts from friends, pages, and public accounts
- Keep all your favorite posts in one place

### Videos
- Any video uploaded to Milonexa
- Videos in playlists
- Creator channels
- Video collections
- Build your personal video library

### Blog Posts
- Long-form articles and blog posts
- Tutorial articles
- Opinion pieces
- News articles
- Create a reading list for later

### Products
- Product listings (when available)
- Shopping posts
- Deals and promotions
- Wishlists and saved items
- Keep track of items you want

### Wiki Pages
- Community-contributed wiki content
- Reference materials
- How-to guides and tutorials
- Knowledge base articles
- Build a personal knowledge base

### Documents
- Shared documents and files
- PDFs and presentations
- Research papers
- Reference materials
- Organize important files

### Future Content Types
Milonexa continues to add new bookmarkable content types. Check back for:
- Audio/Podcasts
- Events
- Job listings
- Communities and groups
- And more!

## Adding a Bookmark

### How to Bookmark

Bookmarking is simple and consistent across all content types.

**On Any Supported Content:**
1. Look for the **bookmark icon** (🔖 or ribbon symbol)
2. Click the icon once
3. Icon fills in or changes color to indicate saved
4. Confirmation message appears: "Saved to bookmarks"

**Bookmark Location:**
- Posts: Top-right corner near share/menu options
- Videos: Below the player near engagement buttons
- Blog posts: Top-right near post metadata
- Products: Below product information
- Documents: Near download/sharing options

**Keyboard Shortcut:**
- Some browsers may support Ctrl+D or Cmd+D for bookmarks (platform dependent)

### API: Add Bookmark

```bash
POST /api/user/bookmarks
Content-Type: application/json

{
  "contentType": "post",
  "contentId": "post_abc123"
}
```

**Response:**
```json
{
  "id": "bookmark_xyz789",
  "userId": "user_123",
  "contentType": "post",
  "contentId": "post_abc123",
  "bookmarkedAt": "2024-01-15T10:30:00Z"
}
```

## Removing Bookmarks

### How to Unbookmark

Remove items from your bookmarks at any time.

**Method 1: From Content**
1. On any bookmarked item, the bookmark icon is filled/highlighted
2. Click the filled bookmark icon again
3. Icon returns to outline/unfilled state
4. Confirmation: "Removed from bookmarks"
5. Item is removed from your bookmarks collection

**Method 2: From Bookmarks Page**
1. Go to /bookmarks
2. Find the item you want to remove
3. Click the **three-dot menu** (⋯) on the item
4. Select **"Remove from Bookmarks"**
5. Item is immediately removed

**Method 3: Bulk Remove**
1. Go to /bookmarks
2. Click **"Select Multiple"** checkbox
3. Check items you want to remove
4. Click **"Delete"** or **"Remove Selected"** button
5. Items are removed from bookmarks

**Permanent Deletion:**
- Removing a bookmark does NOT delete the original content
- Original post/video/article remains on the platform
- You can re-bookmark anytime
- Original creators are not notified of your unbookmark

### API: Remove Bookmark

```bash
DELETE /api/user/bookmarks/:id
```

Alternatively, delete by content:

```bash
DELETE /api/user/bookmarks/content/:contentType/:contentId
```

## Viewing Bookmarks

### Accessing Your Bookmarks

Navigate to your bookmarks collection:
1. Click your **profile icon** (top-right)
2. Select **"Bookmarks"** or **"Saved Items"**
3. Or go directly to **/bookmarks**
4. See your complete bookmarks library

### Bookmarks Page Layout

**Header Section:**
- "My Bookmarks" title
- Total count of bookmarks
- Search/filter options
- Sorting controls

**Content Area:**
- Chronological list (newest saved first)
- Item preview with thumbnail/icon
- Content type badge (Post, Video, Blog, etc.)
- Original creator/author info
- Date bookmarked
- Quick action buttons

**Sidebar (if applicable):**
- Bookmark folders
- Saved collections
- Quick statistics

## Filtering by Content Type

### Category Tabs

Organize your bookmarks by type:

**All**
- View all bookmarks together
- Default view when opening bookmarks
- Shows all content types mixed

**Posts**
- Text posts only
- Image posts
- Posts with videos
- Excludes blog posts and other content types

**Videos**
- All bookmarked videos
- Includes embedded videos in posts
- Shows video thumbnails
- Sortable by duration, views, upload date

**Blogs**
- Blog articles only
- Long-form content
- Reading list organization
- Filter by tags or author

**Products**
- Product listings
- Wishlists
- Shopping items
- Price tracking (if enabled)

**Documents**
- PDFs and files
- Presentations
- Reference materials
- Organized by type and upload date

**Other**
- Any other bookmarkable content types
- Future content types as they're added

### API: Get Bookmarks by Type

```bash
GET /api/user/bookmarks?type=post
```

**Query Parameters:**
- `type`: Filter by content type (post, video, blog, product, document, wiki)
- `sortBy`: Sorting method (date, title, author, popularity)
- `order`: asc or desc
- `page`: Pagination page number
- `limit`: Results per page (default: 20)

**Response:**
```json
{
  "bookmarks": [
    {
      "id": "bookmark_123",
      "contentType": "post",
      "content": {
        "id": "post_abc123",
        "title": "Amazing React Tutorial",
        "author": "jane_developer",
        "preview": "Learn React from scratch...",
        "bookmarkedAt": "2024-01-10T14:20:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47
  }
}
```

## Each Bookmark Item

### Information Displayed

Every bookmarked item shows:

**Content Preview**
- Thumbnail or icon specific to content type
- First 100-200 characters of text (for text content)
- Video thumbnail with duration
- Blog post title and excerpt
- Document name and type

**Content Type Badge**
- Visual indicator of content type
- Examples: "📝 Post", "🎬 Video", "📄 Blog", "📦 Product"
- Color-coded for easy scanning

**Original Creator/Author**
- Creator name and avatar
- Click to view creator's profile
- Hover to see quick profile preview

**Date Bookmarked**
- When you saved the item
- Format: "Saved 2 days ago", "Saved Jan 10, 2024"
- Useful for remembering why you saved it

**Engagement Metrics** (varies by type)
- Posts: Like count, comment count, shares
- Videos: View count, rating, duration
- Blogs: Read time, engagement metrics
- Products: Price, reviews, availability

**Action Buttons:**
- **Open**: Go to the full content
- **Bookmark Menu**: Remove, add to folder, etc.
- **Share**: Share the bookmarked item with others
- **Report**: Report inappropriate content

## Bookmark Folders

### Creating Bookmark Folders

Organize bookmarks into categories:

**How to Create:**
1. Go to /bookmarks
2. Click **"Create Folder"** or **"New Collection"**
3. Enter folder name (max 50 characters)
4. Optional: Add description (max 200 characters)
5. Click **"Create"**

**Folder Details:**
- Name: Short, descriptive title (e.g., "React Tutorials", "Design Inspiration")
- Color: Optionally assign color for visual organization
- Privacy: Keep folders private (visible only to you)
- Emoji: Add emoji to folder for quick recognition

### Moving Bookmarks into Folders

**Method 1: During Bookmark**
1. Click bookmark icon on content
2. If folder option appears, select folder
3. Content saves directly to folder

**Method 2: From Bookmarks Page**
1. Find bookmarked item
2. Click **three-dot menu** (⋯)
3. Select **"Move to Folder"**
4. Choose destination folder
5. Item moves immediately

**Method 3: Drag and Drop**
1. Go to /bookmarks
2. Click and drag bookmark item
3. Hover over destination folder
4. Drop to move

**Bulk Move:**
1. Select multiple bookmarks (checkbox)
2. Click **"Move Selected"**
3. Choose destination folder
4. All selected items move at once

### Managing Folders

**Rename Folder:**
1. Right-click folder or click **three-dot menu**
2. Select **"Rename"**
3. Enter new name
4. Click **"Save"**

**Delete Folder:**
1. Click folder's **three-dot menu** (⋯)
2. Select **"Delete Folder"**
3. Choose what to do with items:
   - Move to main bookmarks
   - Delete items with folder (be careful!)
4. Confirm deletion

**Change Folder Color:**
1. Click folder **three-dot menu** (⋯)
2. Select **"Change Color"**
3. Pick color from palette
4. Color updates immediately for visual organization

### Folder Organization

**Typical Folder Structure:**
- **Learning**: Tutorials and educational content
- **Design Inspiration**: Design posts, images, and articles
- **Reference**: Useful documents and guides
- **Ideas**: Interesting ideas to explore later
- **To Review**: Content that needs deeper reading
- **Projects**: Content related to current projects
- **News**: Relevant news and updates

**Nesting:**
- Folders can contain sub-folders (if supported)
- Creates nested hierarchy for detailed organization
- Click folder to expand and see contents

## Searching Within Bookmarks

### Search Bookmarks

Find specific bookmarks quickly:

**How to Search:**
1. Go to /bookmarks
2. Click the **search box** at the top
3. Type keywords or content names
4. Results appear as you type
5. Click result to open or manage

**Search By:**
- Content title or keyword
- Author or creator name
- Bookmark folder name
- Tags or categories
- Date range (optional filter)

**Example Searches:**
- "React tutorial" - Finds blog or video about React tutorials
- "jane_developer" - Shows all bookmarks from this creator
- "design" - Finds anything tagged or titled with design

### Sorting Options

**Sort By:**
- **Date Added** (newest first): Recently bookmarked items appear first
- **Date Added** (oldest first): Items you bookmarked long ago
- **Title A-Z**: Alphabetical order by content title
- **Author A-Z**: Alphabetical by creator name
- **Popularity**: Most engaged items (reactions, views)
- **Content Type**: Group by post, video, blog, etc.

## Exporting Bookmarks

### Export Your Bookmarks

Download your bookmarks data:

**How to Export:**
1. Go to /bookmarks
2. Click **"Settings"** or **"More Options"** (⋯)
3. Select **"Export Bookmarks"**
4. Choose export format (see below)
5. File downloads to your device

**Export Formats:**

**JSON Format**
- Most complete data
- Includes all metadata
- Useful for backup or import to other apps
- Machine-readable format
- Structure:
  ```json
  {
    "bookmarks": [
      {
        "id": "bookmark_123",
        "contentType": "post",
        "contentId": "post_abc123",
        "title": "Post Title",
        "url": "https://milonexa.com/posts/abc123",
        "author": "creator_name",
        "bookmarkedAt": "2024-01-10T14:20:00Z"
      }
    ],
    "folders": [...]
  }
  ```

**CSV Format**
- Spreadsheet-compatible
- Opens in Excel, Google Sheets, etc.
- Good for analysis and sorting
- Columns: Title, Type, Author, URL, Date Saved, Folder

**HTML Format**
- Browser bookmark file
- Can import to browser bookmarks
- Useful for quick reference
- Formatted as readable webpage

**API: Export Bookmarks**

```bash
GET /api/user/bookmarks/export?format=json
```

**Query Parameters:**
- `format`: json, csv, or html (default: json)

**Response:** File download with specified format

## Sharing Bookmark Collections

### Share a Bookmark Folder

Share your bookmark collections with others:

**How to Share:**
1. Go to your bookmarks
2. Right-click a folder or click its menu
3. Select **"Share Folder"** or **"Generate Link"**
4. Link is generated
5. Copy and share with others

**Share Options:**
- **Public Link**: Anyone with the link can view
- **Viewable Only**: Viewers cannot modify
- **With Password**: Add password protection to shared link
- **Expiring Link**: Link expires after set time (e.g., 7 days)

**Shared Link Features:**
- Click to view shared bookmarks
- Can see folder contents and organization
- Cannot edit shared collection
- Original owner controls permissions
- Can revoke access anytime

**Share on Social:**
- Share link to Milonexa posts
- Share on other social media
- Email a link to friends
- Include in blog posts or articles

## Best Practices

### Effective Bookmarking

1. **Be Selective**: Bookmark items you'll actually reference
2. **Name Folders Clearly**: Use descriptive, searchable names
3. **Regular Cleanup**: Remove items you no longer need
4. **Use Folders**: Organize by topic or project
5. **Review Regularly**: Check bookmarks weekly for updates
6. **Tag Content**: Use folder structure as a tagging system
7. **Back Up**: Periodically export your bookmarks

### Folder Organization

**By Topic:**
- Web Development
- Design Inspiration
- Business Growth
- Personal Learning
- Entertainment

**By Project:**
- Project Alpha
- Client Work
- Portfolio
- Research

**By Priority:**
- Urgent Review
- This Week
- This Month
- Someday

**By Status:**
- To Read
- Currently Reading
- Read and Reference
- Archived

## Troubleshooting

**Q: I can't find the bookmark icon on certain content.**
- A: Some content types may not support bookmarks yet. Only supported types (posts, videos, blogs, products, documents, wiki) can be bookmarked.

**Q: Where are my bookmarks synced?**
- A: Bookmarks sync to your Milonexa account and are accessible from any device. Web, mobile, and app versions all access the same bookmarks.

**Q: Can I bookmark someone else's private posts?**
- A: No, you can only bookmark content you have permission to view. Private posts can only be bookmarked by the owner.

**Q: Can I edit bookmarked content?**
- A: Bookmarking just saves a reference. To edit, go to the original content. Changes to original content automatically reflect in your bookmark preview.

**Q: What happens if the original content is deleted?**
- A: The bookmark remains but links to deleted content. The preview becomes unavailable, but the bookmark entry stays in your collection until you delete it.

**Q: How many bookmarks can I have?**
- A: No limit on standard accounts. Premium accounts may have enhanced features. Check your account settings for details.

**Q: Can I sort bookmarks differently within folders?**
- A: Yes, sorting applies to all bookmarks regardless of folder. System-wide sorting affects what's displayed across all folders.

For more support, visit [support.milonexa.com](https://support.milonexa.com) or contact the community team.
