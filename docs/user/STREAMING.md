# Streaming Guide

Discover and enjoy 60,000+ TV channels, internet radio stations, and live streaming rooms on Milonexa. This comprehensive guide covers all streaming features.

## Table of Contents

1. [Live TV Browser](#live-tv-browser)
2. [Browsing TV Channels](#browsing-tv-channels)
3. [Channel Management](#channel-management)
4. [Playlists and Import/Export](#playlists-and-importexport)
5. [Internet Radio](#internet-radio)
6. [Listening History](#listening-history)
7. [AI Recommendations](#ai-recommendations)
8. [Live Streaming Rooms](#live-streaming-rooms)
9. [Device Support](#device-support)

---

## Live TV Browser

Welcome to Milonexa's extensive TV streaming service with access to 60,000+ IPTV channels from around the world.

### Accessing Live TV

**URL**: `/tv`

The Live TV browser provides:
- Channel discovery and search
- Real-time streaming of television broadcasts
- Category and country filtering
- Favorite channel management
- Playlist creation and sharing
- Channel quality indicators
- Watch history tracking

### Channel Information

Each channel displays:
- **Channel Name**: Official broadcast name
- **Category**: Type of content (News, Sports, Movies, etc.)
- **Country**: Broadcasting country/region
- **Language**: Primary broadcast language
- **Logo**: Official channel branding
- **Stream URL**: M3U8 streaming protocol
- **Status**: Active/Inactive indicator
- **Quality**: Available bitrates and resolutions

### Channel Status Indicators

**Active** (Green):
- Currently broadcasting
- Stream is available
- Quality is stable
- Recommended for viewing

**Inactive** (Gray):
- Not currently broadcasting
- Scheduled broadcast coming
- Stream temporarily unavailable
- Try again later

**Limited Quality** (Yellow):
- Stream available but degraded
- Lower resolution/bitrate
- May have buffering
- Check connection quality

---

## Browsing TV Channels

### Browse by Category

Filter channels by content type:

**Available Categories**:
- **News**: CNN, BBC, Al Jazeera, Reuters, AP News
- **Sports**: ESPN, Sky Sports, DAZN, Eurosport, BeIN Sports
- **Entertainment**: HBO, Netflix, SHOWTIME, Paramount+
- **Movies**: Premium movies, classics, documentaries
- **Kids**: Disney, Cartoon Network, Nickelodeon, PBS Kids
- **Music**: Music videos, music documentaries, concerts
- **Documentary**: Educational, nature, history
- **Religious**: Faith-based programming
- **Lifestyle**: Fashion, cooking, travel
- **Regional**: Local and regional stations

**API Endpoint**:

`GET /api/streaming/tv/channels?category=news`

**Response**:
```json
{
  "channels": [
    {
      "id": "ch_abc123",
      "name": "CNN",
      "category": "news",
      "country": "United States",
      "language": "English",
      "logo": "https://cdn.example.com/cnn-logo.png",
      "streamUrl": "https://stream.example.com/cnn/playlist.m3u8",
      "status": "active",
      "quality": ["720p", "1080p"],
      "isFavorite": false
    }
  ],
  "total": 1250,
  "pageInfo": { "page": 1, "limit": 20 }
}
```

### Browse by Country

Select channels from specific countries:

**API Endpoint**:

`GET /api/streaming/tv/channels?country=Spain`

**Supported Countries**: 195+ countries with active channels

**Features**:
- Dropdown country selector
- Flag icons for visual identification
- Regional content discovery
- Local and international stations

### Browse by Language

Filter channels by broadcast language:

**API Endpoint**:

`GET /api/streaming/tv/channels?language=Spanish`

**Supported Languages**: 100+ languages

**Language Priority**:
- Primary broadcast language
- Secondary/tertiary language tracks
- Subtitle availability

### Search Channels

Find specific channels quickly:

**API Endpoint**:

`GET /api/streaming/tv/channels?search=CNN`

**Query Parameters**:
- `search`: Channel name (partial match)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset

**Response**:
```json
{
  "channels": [
    {
      "id": "ch_abc123",
      "name": "CNN",
      "category": "news",
      "country": "United States",
      "matchScore": 1.0
    },
    {
      "id": "ch_def456",
      "name": "CNN International",
      "category": "news",
      "country": "United Kingdom",
      "matchScore": 0.95
    }
  ],
  "total": 2
}
```

---

## Channel Management

### Adding to Favorites

Save your favorite channels for quick access:

**Endpoint**: `POST /api/streaming/tv/favorites`

**Request Body**:
```json
{
  "channelId": "ch_abc123"
}
```

**Response**:
```json
{
  "id": "fav_ghi789",
  "userId": "user_xyz789",
  "channelId": "ch_abc123",
  "addedAt": "2024-01-15T17:00:00Z"
}
```

### Viewing Favorites

Retrieve your saved channels:

**Endpoint**: `GET /api/streaming/tv/favorites`

**Features**:
- Quick access to favorite channels
- Custom sorting and organization
- Sync across devices
- Offline availability (cached)

### Removing from Favorites

Remove channels from favorites:

**Endpoint**: `DELETE /api/streaming/tv/favorites/:favoriteId`

### Channel Health Check

Check channel availability and quality:

**Endpoint**: `GET /api/streaming/tv/channels/:channelId/health`

**Response**:
```json
{
  "channelId": "ch_abc123",
  "status": "active",
  "uptime": 99.8,
  "bitrate": 5000,
  "resolution": "1080p",
  "latency": "2s",
  "lastChecked": "2024-01-15T17:05:00Z"
}
```

---

## Playlists and Import/Export

### Creating TV Playlists

Organize channels into custom playlists:

**Endpoint**: `POST /api/streaming/tv/playlists`

**Request Body**:
```json
{
  "name": "Evening News Channels",
  "description": "My favorite news sources",
  "isPublic": false,
  "channelIds": ["ch_abc123", "ch_def456", "ch_ghi789"]
}
```

**Response**:
```json
{
  "id": "playlist_jkl012",
  "userId": "user_xyz789",
  "name": "Evening News Channels",
  "description": "My favorite news sources",
  "channels": 3,
  "isPublic": false,
  "createdAt": "2024-01-15T17:10:00Z"
}
```

### Managing Playlists

**Retrieving Playlists**:

**Endpoint**: `GET /api/streaming/tv/playlists`

**Editing Playlists**:

**Endpoint**: `PATCH /api/streaming/tv/playlists/:playlistId`

**Request Body**:
```json
{
  "name": "Updated playlist name",
  "description": "Updated description",
  "isPublic": true
}
```

**Deleting Playlists**:

**Endpoint**: `DELETE /api/streaming/tv/playlists/:playlistId`

### Adding Channels to Playlists

Add channels after playlist creation:

**Endpoint**: `POST /api/streaming/tv/playlists/:playlistId/channels`

**Request Body**:
```json
{
  "channelIds": ["ch_mno345", "ch_pqr678"]
}
```

### Removing from Playlists

Remove specific channels:

**Endpoint**: `DELETE /api/streaming/tv/playlists/:playlistId/channels/:channelId`

### Importing M3U Playlists

Import custom M3U playlist files (IPTV format):

**Endpoint**: `POST /api/streaming/tv/import-m3u`

**Request Body**:
```json
{
  "m3uUrl": "https://example.com/playlist.m3u",
  "playlistName": "Custom IPTV Playlist",
  "autoAdd": true
}
```

**Supported Formats**:
- Standard M3U format
- M3U8 playlists
- Extended M3U with metadata
- URL-based sources

**Response**:
```json
{
  "id": "import_stu901",
  "playlistId": "playlist_jkl012",
  "channelsImported": 250,
  "channelsFailed": 2,
  "importedAt": "2024-01-15T17:15:00Z"
}
```

### Exporting M3U Files

Export your playlists as M3U files:

**Endpoint**: `GET /api/streaming/tv/playlists/:playlistId/export-m3u`

**Query Parameters**:
- `format`: "m3u" or "m3u8" (default: m3u8)
- `withMetadata`: Include EXTINF metadata (default: true)

**Response**: M3U file download

**Example M3U Content**:
```
#EXTM3U
#EXTINF:-1 tvg-id="ch_abc123" tvg-name="CNN" tvg-logo="https://cdn.example.com/cnn-logo.png" group-title="News",CNN
https://stream.example.com/cnn/playlist.m3u8

#EXTINF:-1 tvg-id="ch_def456" tvg-name="BBC News",BBC News
https://stream.example.com/bbc/playlist.m3u8
```

---

## Internet Radio

### Accessing Internet Radio

**URL**: `/radio`

Milonexa hosts thousands of radio stations streaming 24/7.

### Radio Station Information

Each station includes:
- **Station Name**: Broadcasting name
- **Genre**: Music or content type
- **Country**: Broadcast origin
- **Bitrate**: Audio quality (kbps)
- **Stream URL**: Direct stream address
- **Website**: Station official website
- **Current Show**: Now playing info

### Browse by Genre

Discover radio by music genre:

**Available Genres**:
- **Pop**: Contemporary pop music
- **Rock**: Rock, alternative rock
- **Jazz**: Jazz, blues
- **Classical**: Classical, orchestral
- **Electronic**: EDM, techno, house
- **Hip-Hop**: Hip-hop, rap, R&B
- **Country**: Country, Americana
- **Reggae**: Reggae, dancehall
- **Latin**: Reggaeton, salsa, Latin pop
- **Talk Radio**: News, talk shows, podcasts

**API Endpoint**:

`GET /api/streaming/radio/stations?genre=jazz`

**Response**:
```json
{
  "stations": [
    {
      "id": "radio_vwx234",
      "name": "Jazz FM",
      "genre": "jazz",
      "country": "United Kingdom",
      "bitrate": 128,
      "streamUrl": "https://stream.example.com/jazz-fm.m3u8",
      "website": "https://www.jazzbbc.co.uk",
      "isFavorite": false
    }
  ],
  "total": 5000
}
```

### Most Popular Stations

View the most-listened-to stations globally:

**Endpoint**: `GET /api/streaming/radio/popular`

**Query Parameters**:
- `timeframe`: "day", "week", "month" (default: week)
- `limit`: Results per page (default: 20)
- `genre`: Filter by genre (optional)

### Radio Station Details

Get comprehensive station information:

**Endpoint**: `GET /api/streaming/radio/stations/:stationId`

**Response**:
```json
{
  "id": "radio_vwx234",
  "name": "Jazz FM",
  "genre": "jazz",
  "subGenres": ["bebop", "smooth jazz", "fusion"],
  "country": "United Kingdom",
  "city": "London",
  "language": "English",
  "bitrate": 128,
  "bitrates": [64, 128, 256],
  "streamUrl": "https://stream.example.com/jazz-fm.m3u8",
  "website": "https://www.jazzbbc.co.uk",
  "socials": {
    "twitter": "@JazzFM",
    "facebook": "JazzFM"
  },
  "description": "London-based jazz radio station",
  "listeners": 150000,
  "uptime": 99.9
}
```

---

## Listening History

### Automatic Tracking

Milonexa automatically tracks your listening:

**Tracked Data**:
- Channels watched / Radio stations played
- Play duration
- Timestamp of playback
- Device used
- Quality watched

### Viewing History

Access your complete streaming history:

**Endpoint**: `GET /api/streaming/history`

**Query Parameters**:
- `type`: "tv" or "radio" or "all" (default: all)
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset
- `startDate`: ISO timestamp filter
- `endDate`: ISO timestamp filter

**Response**:
```json
{
  "history": [
    {
      "id": "hist_yz901",
      "contentType": "tv",
      "contentId": "ch_abc123",
      "contentName": "CNN",
      "playedAt": "2024-01-15T18:00:00Z",
      "duration": 3600,
      "watchedDuration": 2400,
      "device": "Chrome on Windows",
      "quality": "720p"
    },
    {
      "id": "hist_yz902",
      "contentType": "radio",
      "contentId": "radio_vwx234",
      "contentName": "Jazz FM",
      "playedAt": "2024-01-15T20:30:00Z",
      "duration": 1800,
      "watchedDuration": 1800
    }
  ],
  "total": 342
}
```

### History Analytics

View statistics about your viewing:

**Endpoint**: `GET /api/streaming/history/analytics`

**Response**:
```json
{
  "totalHours": 145.5,
  "favoriteChannel": "CNN",
  "favoriteGenre": "News",
  "mostWatchedCountry": "United States",
  "averageSessionDuration": 45,
  "viewingTrends": [
    { "date": "2024-01-15", "hours": 4.5 },
    { "date": "2024-01-14", "hours": 3.2 }
  ]
}
```

### Clearing History

Clear your viewing history:

**Endpoint**: `DELETE /api/streaming/history`

**Query Parameters**:
- `type`: Clear specific type ("tv", "radio", or "all")
- `olderThan`: Delete history older than date (ISO timestamp)

---

## AI Recommendations

### Getting Recommendations

Receive personalized content suggestions:

**Endpoint**: `GET /api/streaming/recommendations`

**Query Parameters**:
- `type`: "tv" or "radio" or "all" (default: all)
- `limit`: Number of recommendations (default: 10, max: 50)
- `reason`: Show recommendation reason

**Response**:
```json
{
  "recommendations": [
    {
      "id": "ch_abc456",
      "name": "BBC News",
      "type": "tv",
      "category": "news",
      "country": "United Kingdom",
      "reason": "Similar to CNN which you watch frequently",
      "score": 0.92,
      "rationale": "You watch news channels daily. BBC News has similar editorial quality."
    },
    {
      "id": "radio_def567",
      "name": "Classic Jazz Radio",
      "type": "radio",
      "genre": "jazz",
      "reason": "Popular with people who listen to Jazz FM",
      "score": 0.87
    }
  ]
}
```

### Recommendation Factors

The AI considers:
- **Watch History**: Your viewing patterns
- **Favorites**: Channels you've marked as favorite
- **Genre Preferences**: Content types you enjoy
- **Time Patterns**: When you typically watch
- **Similar Users**: What similar users watch
- **Trending**: Current popular content
- **New Content**: Recently added channels

### Feedback on Recommendations

Help improve recommendations:

**Endpoint**: `POST /api/streaming/recommendations/:recommendationId/feedback`

**Request Body**:
```json
{
  "useful": true,
  "reason": "watched", // or "not_interested", "already_watch"
  "notes": "Great suggestion!"
}
```

---

## Live Streaming Rooms

### Creating a Live Room

Start broadcasting to your audience:

**Endpoint**: `POST /api/streaming/live-rooms`

**Request Body**:
```json
{
  "title": "Evening Gaming Session",
  "description": "Join me for some competitive gaming",
  "category": "gaming",
  "isPublic": true,
  "allowChat": true,
  "maxViewers": 1000,
  "previewImage": "https://cdn.example.com/preview.jpg"
}
```

**Response**:
```json
{
  "id": "room_ghi890",
  "title": "Evening Gaming Session",
  "streamKey": "stream_live_abc123xyz",
  "rtmpUrl": "rtmp://ingest.milonexa.com:1935/live",
  "viewerLink": "https://milonexa.com/live/room_ghi890",
  "status": "active",
  "viewers": 0,
  "createdAt": "2024-01-15T21:00:00Z"
}
```

### Broadcasting Setup

**Broadcasting Software**:
- OBS Studio (recommended)
- Streamlabs OBS
- XSplit
- Wirecast

**Configuration**:
- **RTMP URL**: `rtmp://ingest.milonexa.com:1935/live`
- **Stream Key**: Available in room settings
- **Bitrate**: Recommended 4000-6000 kbps (1080p60)
- **Resolution**: 1920x1080 (1080p) recommended
- **Codec**: H.264 video, AAC audio

### Viewer Interaction

**Live Chat**:
- Real-time messaging from viewers
- Moderator tools for managing chat
- Emotes and reactions
- Pinned messages

**Viewer Features**:
- Subscribe to follow streamer
- Send tips/donations
- Ask questions in Q&A
- React with emojis
- Share stream to social media

**Endpoint for Chat**:

`WebSocket: /api/streaming/live-rooms/:roomId/chat`

### Viewer Count

Monitor audience size:

**Endpoint**: `GET /api/streaming/live-rooms/:roomId/stats`

**Response**:
```json
{
  "viewers": 250,
  "peakViewers": 500,
  "duration": 3600,
  "chatMessages": 1250,
  "reactions": 850,
  "tips": 2500,
  "shareCount": 125
}
```

### Ending a Stream

Stop broadcasting:

**Endpoint**: `POST /api/streaming/live-rooms/:roomId/end`

**Response**:
```json
{
  "status": "ended",
  "duration": 3600,
  "viewers": 150,
  "saved": true,
  "replayUrl": "https://milonexa.com/replays/room_ghi890"
}
```

### Stream Replays

Access recorded streams:

**Endpoint**: `GET /api/streaming/live-rooms/:roomId/replay`

Replays are automatically saved for 30 days.

---

## Device Support

### Streaming Device Compatibility

**Web Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Apps**:
- iOS 14+ (Safari, native app)
- Android 8+ (Chrome, Firefox, native app)

**Smart TVs**:
- Android TV 5.0+
- Roku devices (Channel available)
- Apple TV (tvOS 11+)
- Fire TV devices

### Chromecast Support

Cast streams to your Chromecast device:

**Features**:
- One-tap casting from web/mobile
- Remote playback control
- Audio-only mode for radio
- Queue management

**Setup**:
1. Connect Chromecast to WiFi
2. Open Milonexa app/browser
3. Select stream
4. Tap Cast icon
5. Select device

### AirPlay Support

Stream to Apple devices:

**Compatible Devices**:
- Apple TV
- AirPlay speakers
- Mac computers
- iPad/iPhone

**Features**:
- Seamless device switching
- Multi-room audio
- Quality adjustment

### Casting Tips

1. **Stable WiFi**: Ensure strong wireless connection
2. **Device Proximity**: Keep casting device and receiver close
3. **Quality Adjustment**: Lower quality if experiencing buffering
4. **Audio Sync**: Check audio/video sync on recipient device
5. **Device Selection**: Refresh device list if not appearing

---

## Streaming Quality

### Adaptive Bitrate

Automatic quality adjustment based on:
- Internet connection speed
- Device performance
- Available bandwidth
- Content encoding

### Available Qualities

**TV Streams**:
- 480p (1.5 Mbps)
- 720p (3 Mbps)
- 1080p (5 Mbps)
- 4K (15 Mbps, when available)

**Radio Streams**:
- 64 kbps (lowest)
- 128 kbps (standard)
- 256 kbps (high)
- 320 kbps (maximum)

### Manual Quality Selection

Override automatic quality selection:

**In Player**:
- Click settings/gear icon
- Select "Quality"
- Choose desired bitrate
- Stream adjusts after 5-10 seconds

---

## Troubleshooting

**Stream buffering?**
- Check internet speed (minimum 3 Mbps for 720p)
- Reduce video quality
- Close other bandwidth-consuming apps
- Restart router

**Can't find a channel?**
- Search by channel name
- Try browsing by category
- Check if channel is available in your region
- Verify channel is currently active

**Playback not starting?**
- Refresh browser/app
- Clear cache and cookies
- Try different quality
- Check browser compatibility

**Audio/video out of sync?**
- Refresh stream
- Switch quality settings
- Restart casting device
- Contact support

---

## Tips for Best Experience

1. **Optimize Connection**: Use wired Ethernet for stability
2. **Device Placement**: Position router for strong WiFi
3. **Update Browser**: Keep browser software current
4. **Use Favorites**: Save frequently watched channels
5. **Create Playlists**: Organize channels by preference
6. **Check History**: Review watch history for rediscovery
7. **Enable Recommendations**: Get personalized suggestions

For technical support, visit support@milonexa.com or contact our help team.
