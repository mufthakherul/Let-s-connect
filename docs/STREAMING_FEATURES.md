# Streaming Features - IPFM & IPTV

## Overview

Let's Connect now includes comprehensive streaming capabilities for both live radio (IPFM - Internet Protocol FM) and live television (IPTV - Internet Protocol Television). Users can discover, watch, and manage live content from around the world.

## Features

### 🎵 Live Radio (IPFM)

#### Station Management
- **Browse Stations**: Explore radio stations by genre, country, and language
- **Search**: Find stations by name or description
- **Add Stations**: Contribute new radio stations to the platform
- **Popular Stations**: Discover trending stations based on listener count
- **Genre Filtering**: Filter stations by music/content genre

#### Playback Features
- **Live Streaming**: Stream audio directly in the browser
- **Volume Control**: Adjust volume with slider
- **Mute/Unmute**: Quick mute toggle
- **Station Info**: View station details, bitrate, and current listeners

#### Personalization
- **Favorites**: Save your favorite stations for quick access
- **History**: View your listening history
- **Playlists**: Create and manage custom station playlists
- **M3U Import/Export**: Import and export M3U playlist files

### 📺 Live TV (IPTV)

#### Channel Management
- **Browse Channels**: Explore TV channels by category, country, and language
- **Search**: Find channels by name or description
- **Add Channels**: Contribute new TV channels to the platform
- **Popular Channels**: Discover trending channels based on viewer count
- **Category Filtering**: Filter channels by category (News, Sports, Entertainment, etc.)

#### Playback Features
- **Live Streaming**: Stream video directly in the browser with HTML5 player
- **Fullscreen Mode**: Watch in fullscreen
- **Quality Support**: Supports SD, HD, Full HD, and 4K streams
- **Channel Info**: View channel details, resolution, and current viewers

#### Personalization
- **Favorites**: Save your favorite channels for quick access
- **History**: View your viewing history
- **Playlists**: Create and manage custom channel playlists
- **M3U Import/Export**: Import and export M3U playlist files
- **EPG Support**: Electronic Program Guide integration (when available)

## Architecture

### Backend Service

The streaming service is a dedicated microservice (`streaming-service`) that handles:

- **Database Models**: PostgreSQL database with models for:
  - `RadioStation`: Radio station information and metadata
  - `TVChannel`: TV channel information and metadata
  - `Favorite`: User favorites for radio/TV
  - `PlaybackHistory`: User playback history
  - `Playlist`: User-created playlists with M3U support

- **API Endpoints**:
  - `/api/streaming/radio/*` - Radio station endpoints
  - `/api/streaming/tv/*` - TV channel endpoints
  - `/api/streaming/favorites` - Favorites management
  - `/api/streaming/playlists` - Playlist management
  - `/api/streaming/history` - Playback history

- **Features**:
  - Stream URL validation
  - Real-time listener/viewer counting
  - M3U playlist parsing and generation
  - Caching for improved performance
  - Search and filtering

### Frontend Components

#### Radio Component (`Radio.js`)
- Interactive station browser with cards
- Audio player with controls
- Favorites and history management
- Station addition dialog
- Genre filtering

#### TV Component (`TV.js`)
- Interactive channel browser with cards
- HTML5 video player with controls
- Favorites and history management
- Channel addition dialog
- Category filtering

#### Streaming Service (`streamingService.js`)
- API integration utility
- Handles all HTTP requests to streaming service
- Token-based authentication

## Usage

### Accessing Streaming Features

1. **Navigate to the Apps Menu**: Click the 9-dot grid icon in the top navigation bar
2. **Select "Live Radio"** to listen to radio stations
3. **Select "Live TV"** to watch TV channels

Or directly navigate to:
- `/radio` - Live Radio page
- `/tv` - Live TV page

### Adding a Radio Station

1. Go to the Live Radio page
2. Click "Add Station" button
3. Fill in the form:
   - **Name** (required): Station name
   - **Stream URL** (required): Direct audio stream URL
   - **Description**: Brief description
   - **Genre**: Music/content genre
   - **Country**: Country of origin
   - **Language**: Broadcast language
   - **Logo URL**: Station logo image
   - **Bitrate**: Audio quality in kbps
4. Click "Add Station"

### Adding a TV Channel

1. Go to the Live TV page
2. Click "Add Channel" button
3. Fill in the form:
   - **Name** (required): Channel name
   - **Stream URL** (required): M3U8 or direct video stream URL
   - **Description**: Brief description
   - **Category**: Content category (News, Sports, etc.)
   - **Country**: Country of origin
   - **Language**: Broadcast language
   - **Logo URL**: Channel logo image
   - **Resolution**: Video quality (SD/HD/FHD/4K)
   - **EPG URL**: Electronic Program Guide URL (optional)
4. Click "Add Channel"

### Creating Playlists

1. Navigate to the Playlists section
2. Click "Create Playlist"
3. Add stations/channels to your playlist
4. Export as M3U file for use in other players
5. Import existing M3U playlists

## API Endpoints

### Radio Stations

```
GET    /api/streaming/radio/stations        - List all stations
GET    /api/streaming/radio/stations/:id    - Get single station
POST   /api/streaming/radio/stations        - Add new station
PUT    /api/streaming/radio/stations/:id    - Update station
DELETE /api/streaming/radio/stations/:id    - Delete station
POST   /api/streaming/radio/stations/:id/listen - Start listening
POST   /api/streaming/radio/stations/:id/stop   - Stop listening
GET    /api/streaming/radio/popular         - Get popular stations
GET    /api/streaming/radio/genres          - Get available genres
```

### TV Channels

```
GET    /api/streaming/tv/channels           - List all channels
GET    /api/streaming/tv/channels/:id       - Get single channel
POST   /api/streaming/tv/channels           - Add new channel
PUT    /api/streaming/tv/channels/:id       - Update channel
DELETE /api/streaming/tv/channels/:id       - Delete channel
POST   /api/streaming/tv/channels/:id/watch - Start watching
POST   /api/streaming/tv/channels/:id/stop  - Stop watching
GET    /api/streaming/tv/popular            - Get popular channels
GET    /api/streaming/tv/categories         - Get available categories
```

### Favorites

```
GET    /api/streaming/favorites             - Get user favorites
POST   /api/streaming/favorites             - Add to favorites
DELETE /api/streaming/favorites/:id         - Remove from favorites
```

### Playlists

```
GET    /api/streaming/playlists             - Get user playlists
POST   /api/streaming/playlists             - Create playlist
POST   /api/streaming/playlists/import      - Import M3U playlist
GET    /api/streaming/playlists/:id/export  - Export as M3U
```

### History

```
GET    /api/streaming/history               - Get playback history
```

## Database Schema

### RadioStation
```sql
- id: UUID (Primary Key)
- name: String (required)
- description: Text
- streamUrl: String (required)
- websiteUrl: String
- genre: String
- country: String
- language: String
- logoUrl: String
- bitrate: Integer
- isActive: Boolean (default: true)
- listeners: Integer (default: 0)
- metadata: JSONB
- addedBy: UUID (User ID)
- createdAt: Timestamp
- updatedAt: Timestamp
```

### TVChannel
```sql
- id: UUID (Primary Key)
- name: String (required)
- description: Text
- streamUrl: String (required)
- epgUrl: String
- category: String
- country: String
- language: String
- logoUrl: String
- resolution: String (SD/HD/FHD/4K)
- isActive: Boolean (default: true)
- viewers: Integer (default: 0)
- metadata: JSONB
- addedBy: UUID (User ID)
- createdAt: Timestamp
- updatedAt: Timestamp
```

### Favorite
```sql
- id: UUID (Primary Key)
- userId: UUID (required)
- itemId: UUID (required)
- itemType: ENUM('radio', 'tv')
- createdAt: Timestamp
```

### PlaybackHistory
```sql
- id: UUID (Primary Key)
- userId: UUID (required)
- itemId: UUID (required)
- itemType: ENUM('radio', 'tv')
- duration: Integer (seconds)
- lastPosition: Integer (seconds)
- createdAt: Timestamp
```

### Playlist
```sql
- id: UUID (Primary Key)
- userId: UUID (required)
- name: String (required)
- description: Text
- type: ENUM('radio', 'tv', 'mixed')
- isPublic: Boolean (default: false)
- items: JSONB (array of items)
- createdAt: Timestamp
- updatedAt: Timestamp
```

## Stream Format Support

### Radio (Audio)
- MP3
- AAC
- OGG
- HLS (HTTP Live Streaming)
- Direct HTTP streams

### TV (Video)
- HLS (M3U8)
- MPEG-DASH
- Direct HTTP streams
- RTMP (via transcoding)

## Configuration

### Environment Variables

```bash
# Streaming service port
STREAMING_SERVICE_PORT=8009

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/streaming

# Redis (for caching)
REDIS_URL=redis://redis:6379
```

## Deployment

The streaming service is automatically deployed with the Let's Connect platform via Docker Compose:

```bash
docker-compose up -d streaming-service
```

The service will be available at:
- Port: 8009
- API Gateway: `/api/streaming/*`

## Performance

- **Caching**: Stream metadata is cached for 5 minutes to reduce database load
- **Database Indexing**: Optimized queries with proper indexing
- **Rate Limiting**: Protected by API Gateway rate limits
- **Stream Validation**: URLs are validated before being added

## Security

- **Authentication Required**: All endpoints require valid JWT token
- **User Authorization**: Users can only edit/delete their own contributions
- **URL Validation**: Stream URLs are validated before saving
- **Rate Limiting**: Prevents abuse via API Gateway

## Future Enhancements

- [ ] Recording capabilities for time-shifting
- [ ] Multi-quality stream selection
- [ ] Social features (share what you're watching/listening)
- [ ] Recommendations based on viewing/listening history
- [ ] EPG (Electronic Program Guide) with schedule
- [ ] Chromecast/AirPlay support
- [ ] Mobile app integration
- [ ] Parental controls and content rating
- [ ] Regional restrictions support
- [ ] Community moderation for user-contributed content

## Troubleshooting

### Stream Not Playing

1. **Check Stream URL**: Ensure the stream URL is valid and accessible
2. **CORS Issues**: Some streams may have CORS restrictions
3. **Format Support**: Verify the stream format is supported by the browser
4. **Network**: Check your internet connection

### No Stations/Channels Showing

1. **Database**: Ensure the streaming database is properly initialized
2. **Service Status**: Check if the streaming service is running
3. **Filters**: Clear any active genre/category filters
4. **Add Content**: If empty, add stations/channels using the "Add" button

### Performance Issues

1. **Clear Cache**: Clear browser cache and reload
2. **Check Network**: Verify internet speed is sufficient for streaming
3. **Quality**: Select a lower quality stream if available
4. **Browser**: Try a different browser (Chrome/Firefox recommended)

## Support

For issues or questions regarding streaming features:
1. Check the [main documentation](../README.md)
2. Review [API documentation](./API.md)
3. Submit an issue on GitHub

## License

Part of the Let's Connect platform. See main LICENSE file.
