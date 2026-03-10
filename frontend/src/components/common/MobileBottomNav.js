import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
    Home as HomeIcon,
    DynamicFeed as FeedIcon,
    Chat as ChatIcon,
    VideoLibrary as VideosIcon,
    Person as ProfileIcon,
    Search as SearchIcon,
    Login as LoginIcon
} from '@mui/icons-material';
import { triggerHapticFeedback } from '../../utils/mobile';

function MobileBottomNav({ user }) {
    const location = useLocation();
    const navigate = useNavigate();

    const items = useMemo(() => {
        if (user) {
            return [
                { label: 'Home', path: '/', icon: <HomeIcon /> },
                { label: 'Feed', path: '/feed', icon: <FeedIcon /> },
                { label: 'Chat', path: '/chat', icon: <ChatIcon /> },
                { label: 'Videos', path: '/videos', icon: <VideosIcon /> },
                { label: 'Profile', path: '/profile', icon: <ProfileIcon /> }
            ];
        }

        return [
            { label: 'Home', path: '/', icon: <HomeIcon /> },
            { label: 'Search', path: '/search', icon: <SearchIcon /> },
            { label: 'Videos', path: '/videos', icon: <VideosIcon /> },
            { label: 'Login', path: '/login', icon: <LoginIcon /> }
        ];
    }, [user]);

    const activePath = useMemo(() => {
        const exact = items.find((item) => item.path === location.pathname);
        if (exact) {
            return exact.path;
        }

        const nested = items.find((item) => item.path !== '/' && location.pathname.startsWith(item.path));
        return nested?.path || '/';
    }, [items, location.pathname]);

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1200,
                borderTop: 1,
                borderColor: 'divider',
                pb: 'env(safe-area-inset-bottom)'
            }}
        >
            <BottomNavigation
                value={activePath}
                onChange={(_, value) => {
                    if (!value || value === location.pathname) {
                        return;
                    }

                    triggerHapticFeedback('selection');
                    navigate(value);
                }}
                showLabels
            >
                {items.map((item) => (
                    <BottomNavigationAction
                        key={item.path}
                        label={item.label}
                        value={item.path}
                        icon={item.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}

export default MobileBottomNav;
