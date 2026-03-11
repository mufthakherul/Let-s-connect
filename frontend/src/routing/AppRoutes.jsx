import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// Eager load critical components (needed for initial render)
import Home from '../components/Home';
import Login from '../components/Login';
import Register from '../components/Register';

// Error pages
import Error404 from '../components/errors/Error404';
import Error500 from '../components/errors/Error500';
import Error503 from '../components/errors/Error503';
import Error429 from '../components/errors/Error429';
import Error401 from '../components/errors/Error401';
import Error403 from '../components/errors/Error403';

// Lazy load non-critical components
const Homepage = lazy(() => import('../components/Homepage'));
const Feed = lazy(() => import('../components/Feed'));
const Videos = lazy(() => import('../components/Videos'));
const Shop = lazy(() => import('../components/Shop'));
const Docs = lazy(() => import('../components/Docs'));
const Chat = lazy(() => import('../components/Chat'));
const Profile = lazy(() => import('../components/Profile'));
const PublicProfile = lazy(() => import('../components/PublicProfile'));
const Groups = lazy(() => import('../components/Groups'));
const Bookmarks = lazy(() => import('../components/Bookmarks'));
const Cart = lazy(() => import('../components/Cart'));
const Blog = lazy(() => import('../components/Blog'));
const ThemeSettings = lazy(() => import('../components/ThemeSettings'));
const AccessibilitySettings = lazy(() => import('../components/AccessibilitySettings'));
const SecuritySettings = lazy(() => import('../components/SecuritySettings'));
const MediaGallery = lazy(() => import('../components/MediaGallery'));
const Analytics = lazy(() => import('../components/Analytics'));
const Search = lazy(() => import('../components/Search'));
const Discovery = lazy(() => import('../components/Discovery'));
const EmailPreferences = lazy(() => import('../components/EmailPreferences'));
const OAuthLogin = lazy(() => import('../components/OAuthLogin'));
const ResetRequest = lazy(() => import('../components/ResetRequest'));
const ResetPassword = lazy(() => import('../components/ResetPassword'));
const Meetings = lazy(() => import('../components/Meetings'));
const MeetingRoom = lazy(() => import('../components/MeetingRoom'));
const MeetingLobby = lazy(() => import('../components/MeetingLobby'));
const Radio = lazy(() => import('../components/Radio'));
const TV = lazy(() => import('../components/TV'));
const Pages = lazy(() => import('../components/Pages'));
const Friends = lazy(() => import('../components/Friends'));
const AppearanceSettings = lazy(() => import('../components/AppearanceSettings'));
const SettingsHub = lazy(() => import('../components/SettingsHub'));
const PrivacyPolicy = lazy(() => import('../components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../components/TermsOfService'));
const CookiePolicy = lazy(() => import('../components/CookiePolicy'));
const HelpCenter = lazy(() => import('../components/hubs/helpcenter/HelpCenter'));
const UserManuals = lazy(() => import('../components/hubs/helpcenter/UserManuals'));
const FAQ = lazy(() => import('../components/hubs/helpcenter/FAQ'));
const Feedback = lazy(() => import('../components/hubs/helpcenter/Feedback'));
const SupportTicket = lazy(() => import('../components/hubs/helpcenter/SupportTicket'));
const GettingStartedGuide = lazy(() => import('../components/hubs/helpcenter/guides/GettingStartedGuide'));
const SocialFeaturesGuide = lazy(() => import('../components/hubs/helpcenter/guides/SocialFeaturesGuide'));
const MessagingGuide = lazy(() => import('../components/hubs/helpcenter/guides/MessagingGuide'));
const VideosGuide = lazy(() => import('../components/hubs/helpcenter/guides/VideosGuide'));
const MeetingsGuide = lazy(() => import('../components/hubs/helpcenter/guides/MeetingsGuide'));
const ShopGuide = lazy(() => import('../components/hubs/helpcenter/guides/ShopGuide'));
const BlogGuide = lazy(() => import('../components/hubs/helpcenter/guides/BlogGuide'));
const DocsGuide = lazy(() => import('../components/hubs/helpcenter/guides/DocsGuide'));
const GroupsGuide = lazy(() => import('../components/hubs/helpcenter/guides/GroupsGuide'));
const CartGuide = lazy(() => import('../components/hubs/helpcenter/guides/CartGuide'));
const BookmarksGuide = lazy(() => import('../components/hubs/helpcenter/guides/BookmarksGuide'));
const ProfileGuide = lazy(() => import('../components/hubs/helpcenter/guides/ProfileGuide'));
const EmailSettingsGuide = lazy(() => import('../components/hubs/helpcenter/guides/EmailSettingsGuide'));
const SearchGuide = lazy(() => import('../components/hubs/helpcenter/guides/SearchGuide'));
const LiveRadioGuide = lazy(() => import('../components/hubs/helpcenter/guides/LiveRadioGuide'));
const LiveTvGuide = lazy(() => import('../components/hubs/helpcenter/guides/LiveTvGuide'));
const PagesGuide = lazy(() => import('../components/hubs/helpcenter/guides/PagesGuide'));
const HubsDirectory = lazy(() => import('../components/hubs/HubsDirectory'));
const CommunityForum = lazy(() => import('../components/hubs/forum/CommunityForum'));
const TransparencyHub = lazy(() => import('../components/hubs/transparency/TransparencyHub'));
const DeveloperPortal = lazy(() => import('../components/hubs/developer/DeveloperPortal'));
const CreatorHub = lazy(() => import('../components/hubs/creator/CreatorHub'));
const BusinessSupport = lazy(() => import('../components/hubs/business/BusinessSupport'));
const WellbeingCenter = lazy(() => import('../components/hubs/wellbeing/WellbeingCenter'));
const EducationalResourceCenter = lazy(() => import('../components/hubs/education/EducationalResourceCenter'));
const AccessibilityHub = lazy(() => import('../components/hubs/accessibility/AccessibilityHub'));
const DonationHub = lazy(() => import('../components/hubs/donation/DonationHub'));

// Loading fallback component for lazy-loaded routes
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      flexDirection: 'column',
      gap: 2
    }}
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <CircularProgress size={40} />
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Typography variant="body2" color="text.secondary">
        Loading...
      </Typography>
    </motion.div>
  </Box>
);

/**
 * AppRoutes component - Centralized route definitions
 * Extracted from App.js for better maintainability (Phase 1 - Workstream B1)
 */
export default function AppRoutes({ user, setUser }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {/* Root route - Homepage for logged-in users showing all public posts */}
            <Route
              path="/"
              element={user ? <Homepage user={user} /> : <Home user={user} />}
            />
            {/* Unregister landing page - smart router for unregistered users */}
            <Route
              path="/unregister"
              element={<Home user={user} />}
            />

            {/* Public routes */}
            <Route path="/search" element={<Search />} />
            <Route path="/discover" element={<Discovery />} />
            <Route path="/hubs" element={<HubsDirectory />} />
            <Route path="/hubs/forum" element={<CommunityForum />} />
            <Route path="/hubs/transparency" element={<TransparencyHub />} />
            <Route path="/hubs/developer" element={<DeveloperPortal />} />
            <Route path="/hubs/creator" element={<CreatorHub />} />
            <Route path="/hubs/business" element={<BusinessSupport />} />
            <Route path="/hubs/wellbeing" element={<WellbeingCenter />} />
            <Route path="/hubs/education" element={<EducationalResourceCenter />} />
            <Route path="/hubs/accessibility" element={<AccessibilityHub />} />
            <Route path="/hubs/donation" element={<DonationHub />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/reset-password" element={<ResetRequest />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/login/oauth" element={<OAuthLogin />} />

            {/* Public content routes */}
            <Route path="/videos" element={<Videos user={user} />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/docs" element={<Docs user={user} />} />
            <Route path="/meetings" element={<Meetings user={user} />} />
            <Route path="/meetings/guest/:id" element={<MeetingLobby />} />
            <Route path="/media" element={<MediaGallery />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/meetings/:id"
              element={user ? <MeetingRoom user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/feed"
              element={user ? <Feed user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/groups"
              element={user ? <Groups user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/pages"
              element={user ? <Pages user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/friends"
              element={user ? <Friends user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/bookmarks"
              element={user ? <Bookmarks user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/cart"
              element={user ? <Cart /> : <Navigate to="/login" />}
            />
            <Route
              path="/chat"
              element={user ? <Chat user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={user ? <Profile user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile/:id"
              element={user ? <PublicProfile user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile/u/:id"
              element={user ? <PublicProfile user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/:id"
              element={user ? <PublicProfile user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/security"
              element={user ? <SecuritySettings /> : <Navigate to="/login" />}
            />
            <Route
              path="/analytics"
              element={user ? <Analytics user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/notifications/email"
              element={user ? <EmailPreferences /> : <Navigate to="/login" />}
            />
            <Route
              path="/radio"
              element={user ? <Radio /> : <Navigate to="/login" />}
            />
            <Route
              path="/tv"
              element={user ? <TV /> : <Navigate to="/login" />}
            />

            {/* Settings routes */}
            <Route path="/settings" element={<SettingsHub />} />
            <Route path="/settings/theme" element={<ThemeSettings />} />
            <Route path="/settings/accessibility" element={<AccessibilitySettings />} />
            <Route path="/settings/appearance" element={<AppearanceSettings />} />

            {/* Legal & policies */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />

            {/* Help Center */}
            <Route path="/helpcenter" element={<HelpCenter />} />
            <Route path="/helpcenter/manuals" element={<UserManuals />} />
            <Route path="/helpcenter/manuals/getting-started" element={<GettingStartedGuide />} />
            <Route path="/helpcenter/manuals/profile" element={<ProfileGuide />} />
            <Route path="/helpcenter/manuals/search" element={<SearchGuide />} />
            <Route path="/helpcenter/manuals/social" element={<SocialFeaturesGuide />} />
            <Route path="/helpcenter/manuals/groups" element={<GroupsGuide />} />
            <Route path="/helpcenter/manuals/bookmarks" element={<BookmarksGuide />} />
            <Route path="/helpcenter/manuals/messaging" element={<MessagingGuide />} />
            <Route path="/helpcenter/manuals/videos" element={<VideosGuide />} />
            <Route path="/helpcenter/manuals/meetings" element={<MeetingsGuide />} />
            <Route path="/helpcenter/manuals/docs" element={<DocsGuide />} />
            <Route path="/helpcenter/manuals/shop" element={<ShopGuide />} />
            <Route path="/helpcenter/manuals/cart" element={<CartGuide />} />
            <Route path="/helpcenter/manuals/blog" element={<BlogGuide />} />
            <Route path="/helpcenter/manuals/pages" element={<PagesGuide />} />
            <Route path="/helpcenter/manuals/live-radio" element={<LiveRadioGuide />} />
            <Route path="/helpcenter/manuals/live-tv" element={<LiveTvGuide />} />
            <Route path="/helpcenter/manuals/email-settings" element={<EmailSettingsGuide />} />
            <Route path="/helpcenter/faq" element={<FAQ />} />
            <Route path="/helpcenter/feedback" element={<Feedback />} />
            <Route path="/helpcenter/tickets" element={<SupportTicket />} />

            {/* Error pages for testing & catch-all 404 */}
            <Route path="/error/401" element={<Error401 />} />
            <Route path="/error/403" element={<Error403 />} />
            <Route path="/error/429" element={<Error429 />} />
            <Route path="/error/503" element={<Error503 />} />
            <Route path="*" element={<Error404 />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
