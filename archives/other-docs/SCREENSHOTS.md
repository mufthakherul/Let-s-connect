# Let's Connect - Application Screenshots

This document showcases all the pages and features of the Let's Connect platform.

## Table of Contents
- [Public Pages (No Authentication Required)](#public-pages)
  - [Home Page](#home-page)
  - [Login Page](#login-page)
  - [Register Page](#register-page)
  - [Videos Page](#videos-page)
  - [Shop Page](#shop-page)
  - [Docs Page](#docs-page)
- [Authenticated Pages (Login Required)](#authenticated-pages)
  - [Feed Page](#feed-page)
  - [Groups Page](#groups-page)
  - [Bookmarks Page](#bookmarks-page)
  - [Chat Page](#chat-page)
  - [Profile Page](#profile-page)
- [Dark Mode](#dark-mode)

---

## Public Pages

### Home Page
**URL:** `http://localhost:3000/`  
**Access:** Public (No login required)

The landing page showcases the platform's features and provides quick access to registration and exploration.

**Key Features:**
- Hero section with platform overview
- Feature cards highlighting main capabilities
- Social & Communication features
- Professional & Productivity tools
- Technology stack information
- Call-to-action buttons

![Home Page](screenshots/01-home-page.png)

---

### Login Page
**URL:** `http://localhost:3000/login`  
**Access:** Public

Simple and clean login interface for existing users.

**Fields:**
- Email address
- Password
- Login button

![Login Page](screenshots/02-login-page.png)

---

### Register Page
**URL:** `http://localhost:3000/register`  
**Access:** Public

User registration form to create a new account.

**Fields:**
- Username (required)
- Email address (required)
- Password (required)
- First Name (optional)
- Last Name (optional)
- Register button

![Register Page](screenshots/03-register-page.png)

---

### Videos Page
**URL:** `http://localhost:3000/videos`  
**Access:** Public (Browse without login, upload requires authentication)

YouTube-style video platform with channels and playlists.

**Features:**
- Browse public videos
- Video cards with thumbnails
- View counts and engagement metrics
- Tabs: Explore, Channels, Playlists
- Share functionality

![Videos Page](screenshots/04-videos-page.png)

---

### Shop Page
**URL:** `http://localhost:3000/shop`  
**Access:** Public (Browse without login, purchase requires authentication)

E-commerce platform for browsing products.

**Features:**
- Product catalog
- Shopping cart (when authenticated)
- Product reviews
- Categories and search

![Shop Page](screenshots/05-shop-page.png)

---

### Docs Page
**URL:** `http://localhost:3000/docs`  
**Access:** Public (Read without login, edit requires authentication)

Documentation and wiki platform for knowledge sharing.

**Features:**
- Public documents browsing
- Wiki pages
- Projects tab
- Notion-style collaboration tools

![Docs Page](screenshots/06-docs-page.png)

---

## Authenticated Pages

### Feed Page
**URL:** `http://localhost:3000/feed`  
**Access:** Requires Authentication

Social media feed with Facebook/Twitter-style posting and interaction.

**Features:**
- Create posts with text, images, and videos
- Post visibility controls (Public, Friends, Private)
- Thread creation option
- Emoji, image, and video attachments
- Posts feed with reactions and comments
- Real-time updates

![Feed Page](screenshots/07-feed-page.png)

---

### Groups Page
**URL:** `http://localhost:3000/groups`  
**Access:** Requires Authentication

Facebook-style groups with privacy controls.

**Features:**
- Browse and join groups
- Create new groups
- Privacy settings:
  - 🌐 Public - Anyone can join
  - 🔒 Private - Approval required
  - 🔐 Secret - Invite only
- Group categories
- Member count display
- Group descriptions and metadata

![Groups Page](screenshots/08-groups-page.png)

---

### Bookmarks Page
**URL:** `http://localhost:3000/bookmarks`  
**Access:** Requires Authentication

Twitter/X-style bookmarks for saving content.

**Features:**
- Save posts, videos, and articles
- View all saved items
- Remove bookmarks
- See when content was saved
- Empty state with helpful message

![Bookmarks Page](screenshots/09-bookmarks-page.png)

---

### Chat Page
**URL:** `http://localhost:3000/chat`  
**Access:** Requires Authentication

Real-time messaging platform with Discord/WhatsApp features.

**Features:**
- Direct messages
- Server discovery
- Real-time messaging with Socket.IO
- Conversation list
- Message input with emoji support
- Server browsing and joining

![Chat Page](screenshots/10-chat-page.png)

---

### Profile Page
**URL:** `http://localhost:3000/profile`  
**Access:** Requires Authentication

User profile management.

**Features:**
- Profile avatar with user initials
- Display name and username
- Email address
- Edit profile information:
  - First Name
  - Last Name
  - Bio
- Update profile button
- LinkedIn-style professional information

![Profile Page](screenshots/11-profile-page.png)

---

## Dark Mode

The platform features a complete dark mode theme that can be toggled using the sun/moon icon in the navigation bar.

**Dark Mode Features:**
- System-wide dark theme
- Persistent preference (saved to local storage)
- Smooth color transitions
- All components adapted for dark mode
- Improved readability in low-light conditions
- Material-UI theme integration

![Home Page - Dark Mode](screenshots/12-home-dark-mode.png)

---

## Navigation

### Top Navigation Bar
- **Logo:** "Let's Connect" (links to home)
- **Public Links:** Videos, Shop, Docs
- **Authenticated Links:** Feed, Groups, Chat (visible when logged in)
- **Theme Toggle:** Sun/Moon icon for light/dark mode
- **User Menu:** Profile, Notifications, Logout (visible when logged in)
- **Auth Buttons:** Login, Sign Up (visible when logged out)

### Mobile Navigation
- Hamburger menu for responsive design
- Drawer navigation on smaller screens
- All features accessible on mobile devices

---

## Technology Stack

- **Frontend:** React 18.3, Material-UI v5, Zustand, React Query
- **Backend:** Node.js, Express.js (Microservices architecture)
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Real-time:** Socket.IO
- **Deployment:** Docker, Docker Compose

---

## Getting Started

1. Clone the repository
2. Run `cp .env.example .env` and configure environment variables
3. Start services: `docker-compose up --build`
4. Access the application: `http://localhost:3000`

For detailed instructions, see [QUICK_START.md](QUICK_START.md)

---

## Additional Resources

- [README.md](README.md) - Main documentation
- [QUICK_START.md](QUICK_START.md) - Quick setup guide
- [FEATURES.md](FEATURES.md) - Detailed feature list
- [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - Visual feature guide
- [API Documentation](docs/API.md) - API reference

---

*Last updated: February 8, 2026*
