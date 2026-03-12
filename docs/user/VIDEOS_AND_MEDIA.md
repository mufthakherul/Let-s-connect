# Videos and Media Guide

Welcome to the Milonexa Videos and Media guide. This comprehensive resource covers everything you need to know about uploading, sharing, and managing video content and media files.

## Video Browser

### Accessing the Video Section

Navigate to the video browser:
1. Click **"Videos"** in the main navigation menu
2. Or go directly to **/videos**
3. Explore all public videos on the platform

### Video Grid Layout

The video browser displays videos in a responsive grid:
- Thumbnail preview with play button overlay
- Video title
- Creator name and avatar
- View count and engagement metrics
- Duration indicator
- Add to playlist button

### Search and Browse

**Browse by Category:**
Click **"Categories"** to filter videos:
- Technology - Tech tutorials, reviews, demos
- Entertainment - Movies, shows, entertainment content
- Education - Courses, lectures, educational content
- Gaming - Game streams, gameplay, reviews
- Music - Music videos, performances, covers
- Sports - Games, highlights, training
- Comedy - Stand-up, sketches, funny videos
- How-To - Tutorials and instructional videos
- Vlog - Personal vlogs and daily content
- News - News reports and journalism
- Other - Miscellaneous content

**Search by Keywords:**
1. Click the **search icon** (🔍) in the video header
2. Type keywords, titles, or creator names
3. Results appear instantly
4. Filter by:
   - Upload date (Last week, month, year)
   - Duration (Short: <5min, Medium: 5-30min, Long: >30min)
   - Video quality (720p, 1080p, 4K)
   - Sort by (Relevance, Date, Views, Rating)

### API: Search Videos

```bash
GET /api/content/videos?search=react+tutorial&category=Technology&sortBy=views
```

**Query Parameters:**
- `search`: Search query string
- `category`: Video category (Technology, Entertainment, etc.)
- `sortBy`: Sorting method (relevance, date, views, rating)
- `duration`: Video duration filter
- `page`: Pagination (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Response:**
```json
{
  "videos": [
    {
      "id": "video_abc123",
      "title": "Complete React Tutorial for Beginners",
      "creator": "John Developer",
      "creatorId": "user_xyz789",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "duration": 3600,
      "views": 50000,
      "likes": 2300,
      "comments": 450,
      "publishedAt": "2024-01-10T10:00:00Z",
      "category": "Technology"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 287
  }
}
```

## Video Player

### Playing Videos

Click any video thumbnail to open the video player.

### Player Features

**Basic Controls:**
- **Play/Pause** (spacebar): Start or pause playback
- **Timeline**: Scrub to any point in video
- **Current Time/Duration**: Shows playback position
- **Volume**: Adjust sound level
- **Fullscreen** (F): Expand to full screen
- **Exit Fullscreen** (Esc): Return to normal view

**Advanced Controls:**

**Quality Selector** (Settings ⚙️ → Quality)
- Video quality options vary by upload:
  - 720p (HD) - Standard quality
  - 1080p (Full HD) - High quality
  - 1440p (2K) - Very high quality
  - 2160p (4K) - Ultra high quality
  - Auto - Adapts to connection speed
- Higher quality requires better internet

**Playback Speed** (Settings ⚙️ → Speed)
- 0.5x - Half speed (slower)
- 0.75x - Three-quarter speed
- 1.0x - Normal speed (default)
- 1.25x - Slightly faster
- 1.5x - One and a half speed
- 2.0x - Double speed (fastest)
- Useful for: Skimming content, repeating sections, learning at own pace

**Captions/Subtitles** (CC icon)
- Click to toggle captions on/off
- Language options (if available)
- Caption settings:
  - Font size
  - Font style
  - Background opacity
  - Color customization

**Theater Mode** (Theater icon)
- Expands video to use more screen space
- Collapses sidebar and recommendations
- Better focus on video content

**Picture-in-Picture** (PiP icon)
- Watch video in small window while browsing
- Continue browsing while watching
- Resize PiP window as needed

### Engagement Options

**During Playback:**
- **Like** (👍): Show appreciation for video
- **Dislike** (👎): Indicate you didn't enjoy it
- **Bookmark** (🔖): Save for later viewing
- **Share** (↗️): Share with friends or social media
- **More** (⋯): Additional options

**Below Player:**
- Creator information and follow button
- Video statistics (views, likes, comments)
- Video description and tags
- Comments section

## Video Upload

### Starting the Upload Process

**How to Access Upload:**
1. Navigate to **/videos**
2. Click **"Upload Video"** button (usually top right)
3. Or drag and drop video into page
4. Upload interface opens

### Supported Formats

**Video Codecs:**
- H.264 (most compatible)
- H.265 (newer, better compression)
- VP9 (open-source)
- AV1 (latest, best compression)

**Container Formats:**
- **MP4** (.mp4) - Most common, widely supported
- **MOV** (.mov) - Apple QuickTime format
- **AVI** (.avi) - Windows format
- **MKV** (.mkv) - Matroska, high quality
- **WebM** (.webm) - Web format
- **FLV** (.flv) - Flash Video (legacy)
- **WMV** (.wmv) - Windows Media Video

### File Size Limits

**Upload Limit:** 500MB maximum

**Recommended Sizes:**
- Short videos (< 1 min): 20-50 MB
- Medium videos (1-5 min): 50-200 MB
- Long videos (> 5 min): 200-500 MB
- Upload larger videos in segments

**Bitrate Guidelines:**
- 720p: 1000-2000 kbps
- 1080p: 2000-4000 kbps
- 1440p: 4000-6000 kbps
- 4K: 6000-12000 kbps

### Video Upload Form

**Title** (Required)
- Name of your video
- Maximum 100 characters
- Should be clear and descriptive
- Examples:
  - "How to Build a REST API with Node.js"
  - "Parkour Training for Beginners"
  - "DIY Home Office Setup Guide"

**Description** (Optional)
- Detailed explanation of video content
- Maximum 5000 characters
- Supports markdown formatting
- Include timestamps for longer videos
- Add links to resources mentioned
- Example:
  ```
  In this tutorial, I'll show you how to create a REST API with Node.js.
  
  Topics covered:
  [0:00] - Introduction
  [2:15] - Project setup
  [5:30] - Creating routes
  [12:45] - Error handling
  [18:20] - Testing API
  
  Resources:
  - Node.js: https://nodejs.org
  - Express: https://expressjs.com
  ```

**Thumbnail** (Optional)
- Custom preview image for video
- Auto-generated from keyframe if not provided
- Recommended size: 1280x720px (16:9 aspect ratio)
- Maximum file size: 5MB
- Formats: JPG, PNG, WebP

**Select Thumbnail:**
1. Use auto-generated (first frame highlighted)
2. Or click **"Choose Thumbnail"** to upload custom image
3. Or click timeline to select specific frame

**Tags** (Optional)
- Categorize your video by topic
- Maximum 10 tags
- Help viewers find your video
- Auto-complete suggests popular tags
- Examples: #React #WebDevelopment #JavaScript #Tutorial

**Category** (Required)
- Classify video content:
  - Technology: Tech, programming, gadgets
  - Entertainment: Movies, shows, clips
  - Education: Courses, lectures, learning
  - Gaming: Games, streams, esports
  - Music: Music videos, performances
  - Sports: Games, training, highlights
  - Comedy: Humor, stand-up, sketches
  - How-To: Tutorials, guides, DIY
  - Vlog: Personal content, daily vlogs
  - News: News reporting, journalism
  - Other: Miscellaneous

**Privacy** (Required)
- **Public**: Visible to all users, appears in search
- **Unlisted**: Only visible via direct link, not in search
- **Private**: Only you can view (can share link with specific people)

### Upload Progress

**Upload Interface:**
- Progress bar showing upload percentage
- Current upload speed (e.g., 5.2 MB/s)
- Time remaining estimate
- Cancel option (stops and discards upload)

**Video Processing:**
- After upload completes, video enters encoding queue
- Platform processes video for different quality levels:
  - Generates 720p, 1080p (if source supports)
  - Creates thumbnail and keyframes
  - Extracts metadata
- Processing usually takes 5-30 minutes
- You can edit details while processing occurs

**Notifications:**
- Receive notification when processing completes
- Receive notification if errors occur
- Email notification (optional)

### API: Upload Video

```bash
POST /api/content/videos
Content-Type: multipart/form-data

{
  "video": <binary file>,
  "title": "My Amazing Travel Vlog",
  "description": "Exploring the streets of Tokyo and experiencing the local culture.",
  "thumbnail": <binary image file (optional)>,
  "tags": ["travel", "japan", "vlog"],
  "category": "Vlog",
  "privacy": "public"
}
```

**Response:**
```json
{
  "id": "video_abc123",
  "title": "My Amazing Travel Vlog",
  "status": "processing",
  "uploadedAt": "2024-01-15T10:30:00Z",
  "estimatedProcessingTime": "15 minutes"
}
```

## Creating Playlists

### What is a Playlist?

A playlist is a curated collection of videos organized by theme or topic.

**Use Cases:**
- Create a course: Series of tutorial videos in learning order
- Best-of collections: Your favorite videos from creators
- Themed playlists: Group videos by topic or mood
- Binge-watch lists: Collections for viewing sessions

### Creating a Playlist

**Quick Create:**
1. Click **"Add to Playlist"** button on any video
2. Select **"Create New Playlist"**
3. Name your playlist
4. Click **"Create"**
5. Video is automatically added

**Full Create:**
1. Go to **/videos/playlists**
2. Click **"Create Playlist"**
3. Fill in playlist details:
   - **Name**: Max 100 characters
   - **Description**: Max 500 characters
   - **Cover Image**: Recommended 1280x720px
   - **Privacy**: Public, Unlisted, or Private
4. Click **"Create Playlist"**

### Managing Playlists

**Access Your Playlists:**
1. Go to /videos/playlists or click "My Playlists"
2. See all your created playlists
3. Click any playlist to open

**Playlist Settings:**
1. Open a playlist you created
2. Click **"Edit"** or **"Playlist Settings"**
3. Modify:
   - Name
   - Description
   - Cover image
   - Privacy settings
4. Save changes

**Adding Videos:**
1. In a playlist, click **"Add Video"** button
2. Search for and select videos
3. Click to add (can add multiple at once)
4. Or click **"Add to Playlist"** on any video and select this playlist

**Reordering Videos:**
1. Open playlist in edit mode
2. Click and drag videos to reorder
3. Or use numbered position fields
4. Save changes

**Removing Videos:**
1. Open playlist
2. Click **"Remove"** on any video
3. Or click the **X** or **delete icon**
4. Confirm removal

**Deleting a Playlist:**
1. Open playlist
2. Click **"Delete Playlist"**
3. Confirm deletion (videos are not deleted, only the collection)

### API: Playlist Management

**Create Playlist:**
```bash
POST /api/content/playlists
Content-Type: application/json

{
  "name": "React Tutorial Series",
  "description": "Complete beginner to advanced React tutorials",
  "privacy": "public"
}
```

**Add Video to Playlist:**
```bash
PUT /api/content/playlists/:id/videos
Content-Type: application/json

{
  "videoId": "video_xyz789",
  "position": 1
}
```

**Reorder Playlist:**
```bash
PUT /api/content/playlists/:id/videos
Content-Type: application/json

{
  "videos": [
    { "videoId": "video_1", "position": 1 },
    { "videoId": "video_2", "position": 2 },
    { "videoId": "video_3", "position": 3 }
  ]
}
```

## Video Reactions and Comments

### Reacting to Videos

Show appreciation for videos:

**Like/Dislike:**
- Click **👍 Like** to show appreciation
- Click **👎 Dislike** to show disapproval
- Click again to remove your reaction
- Like count updates in real-time

**Custom Reactions:**
- Click the reaction dropdown for more options
- Available reactions: 😍, 🎉, 😢, 🔥, etc.
- Click emoji to add custom reaction
- Only one reaction type per user per video

### Commenting

**Write a Comment:**
1. Scroll to comments section below video
2. Click comment box
3. Type your comment (max 500 characters)
4. Optional: Add emoji, mentions, links
5. Click **"Comment"** or press Ctrl+Enter

**Comment Features:**
- See all comments instantly
- Nested replies (comment on comments)
- @ mentions to reply to specific people
- Edit/delete your own comments
- Like other comments
- Report inappropriate comments

**Comment Sorting:**
- Newest first (default)
- Most popular
- Most relevant

## Video Statistics

### Video Metrics

Videos display real-time statistics:

**View Count**
- Total number of times video has been played
- Updates in real-time
- Shows growth over time
- Click to see view history chart

**Engagement Metrics:**
- **Likes**: Number of positive reactions
- **Dislikes**: Number of negative reactions
- **Comments**: Total discussion comments
- **Shares**: Number of times shared
- **Bookmarks**: Number of saves

**Display Format:**
- Below player: "1.2M views", "45K likes", "2.3K comments"
- Click metrics to see more details
- Click view count to see viewing trends

**Creator Analytics:**
- Creators see additional detailed metrics
- Watch time (total and average)
- Click-through rate
- Traffic sources
- Viewer retention graph
- Audience demographics

## Media Gallery

### Accessing Media Gallery

Your personal media storage and management:
1. Click **"Media"** in main navigation
2. Or go to **/media**
3. View all your uploaded content in one place

### Media Gallery Features

**View All Files:**
- Images (uploaded or from posts)
- Videos (uploaded or embedded)
- Documents (PDFs, Word, Excel, etc.)
- Audio files
- Other file types

**File Organization:**
- Chronological view (newest first)
- Filter by file type
- Filter by upload date
- Search by filename

**Grid and List Views:**
- Click **grid icon** for thumbnail view
- Click **list icon** for detailed list
- Switch between views as needed

### Storage Usage

**Usage Indicator:**
- Shows total storage used
- Shows storage quota
- Percentage used bar
- Example: "2.4 GB of 50 GB used (4.8%)"

**Upgrade Storage:**
- If reaching limit, click **"Upgrade"**
- Choose new storage tier
- Billing information updated

### File Management

**Bulk Operations:**
1. Click **"Select Multiple"** checkbox in top-left
2. Check boxes next to files you want
3. Choose action from toolbar:
   - **Delete**: Remove selected files
   - **Download**: Bulk download as ZIP
   - **Move**: Organize into folders (if available)
   - **Copy**: Duplicate files

**Individual File Actions:**
1. Hover over any file
2. Click **three-dot menu** (⋯)
3. Options:
   - **Download**: Save file to device
   - **Copy Link**: Get shareable link
   - **Delete**: Remove file
   - **Rename**: Change filename
   - **Share**: Create sharing link with permissions

**Single File Download:**
- Click any file thumbnail
- Opens file preview
- Click **"Download"** button
- File saves to downloads folder

### Upload to Media Gallery

**Direct Upload:**
1. Click **"Upload"** in top-right
2. Click **"Choose Files"** or drag-drop
3. Select files (supports multiple)
4. Files upload immediately
5. Can organize after upload

**From Posts:**
- Images from posts auto-save to gallery
- Videos from posts auto-save to gallery
- Documents from posts auto-save to gallery
- Access at any time in Media Gallery

### API: Upload to Media

```bash
POST /api/media/upload
Content-Type: multipart/form-data

{
  "file": <binary file>,
  "name": "my-screenshot.png"
}
```

**Response:**
```json
{
  "id": "media_abc123",
  "name": "my-screenshot.png",
  "type": "image/png",
  "size": 245678,
  "uploadedAt": "2024-01-15T10:30:00Z",
  "url": "https://cdn.example.com/media/abc123.png"
}
```

## Supported File Types

### Images

**Formats:**
- JPG/JPEG - Photography, photo-quality images
- PNG - Graphics, transparent backgrounds, screenshots
- GIF - Animated images, memes, clips
- WebP - Modern format, better compression
- SVG - Vector graphics, scalable

**Size Limits:**
- Maximum 10MB per image
- Recommended: < 5MB for faster loading

**Optimal Dimensions:**
- Profile/Avatar: 512x512px or larger
- Cover photos: 1200x628px (16:9)
- Posts: 1200x628px (16:9)
- Thumbnails: 1280x720px

### Videos

**Formats:**
- MP4 - Most common, widely supported
- MOV - Apple QuickTime
- AVI - Windows format
- MKV - Matroska, high quality

**Size Limits:**
- Maximum 500MB per video
- Recommended: < 100MB for faster upload

**Optimal Properties:**
- Resolution: 1920x1080 (1080p) or higher
- Bitrate: 2000-4000 kbps for 1080p
- Frame rate: 24, 30, or 60 fps
- Duration: No maximum

### Documents

**Formats:**
- PDF - Universal document format
- DOCX - Microsoft Word
- XLSX - Excel spreadsheets
- PPTX - PowerPoint presentations
- TXT - Plain text files
- ODP/ODS/ODT - OpenDocument formats

**Size Limits:**
- Maximum 50MB per document
- Recommended: < 10MB

**Usage:**
- Share research papers
- Distribute templates
- Share spreadsheets
- Upload presentations
- Distribute guides and manuals

### Audio

**Formats:**
- MP3 - Most common audio format
- WAV - Uncompressed high-quality audio
- FLAC - Lossless compression
- AAC - Advanced audio codec
- OGG - Open-source format

**Size Limits:**
- Maximum 50MB per audio file
- Recommended: < 10MB

**Usage:**
- Upload podcast episodes
- Share music files
- Distribute audio clips
- Audio attachments to posts

## Shared Media from Chat

### Media in Conversations

When you share media in chat or group messages:
- Files automatically save to Media Gallery
- Access anytime without re-downloading
- Share history preserved
- Files available even after chat deletes

### Auto-Archive

**What Gets Archived:**
- Images shared in direct messages
- Videos shared in group chats
- Documents shared in channels
- Any file uploaded through Milonexa

**Frequency:**
- Automatic, no action needed
- Real-time archiving
- Retroactive archiving of older content

**Privacy:**
- Your archived media is private
- Only you can access
- Original sharing restrictions remain (private chat = private archive)

## Media Best Practices

### For Images

1. **Optimize Size**: Compress before uploading
2. **High Quality**: Use good lighting and resolution
3. **Appropriate Format**: JPG for photos, PNG for graphics
4. **Descriptive Names**: Use clear filenames
5. **Alt Text**: Add descriptions for accessibility

### For Videos

1. **Good Quality**: 1080p minimum for best results
2. **Stable Footage**: Use tripod or stabilization
3. **Good Audio**: Quality microphone and clean sound
4. **Proper Lighting**: Well-lit videos look professional
5. **Engaging Thumbnails**: Custom thumbnails increase clicks

### For Documents

1. **Readable Text**: Ensure good contrast and size
2. **Organized Structure**: Use clear headings and sections
3. **Proper Formatting**: Professional appearance
4. **Secure**: Mark confidential documents as private
5. **Virus-Free**: Scan files before sharing

## Troubleshooting

**Q: My video won't upload, what's wrong?**
- A: Check file size (< 500MB), format (MP4, MOV), and internet connection. Try uploading from a different browser.

**Q: How long does video processing take?**
- A: Usually 5-30 minutes depending on video length and platform load.

**Q: Can I edit a video after uploading?**
- A: You can edit title, description, thumbnail, and tags. To change the video file itself, delete and re-upload.

**Q: How do I make my video private?**
- A: During upload or in video settings, set privacy to "Private". Only you can view.

**Q: Can I download videos I've uploaded?**
- A: Yes, go to Media Gallery, find your video, and click "Download".

For additional help, visit [support.milonexa.com](https://support.milonexa.com).
