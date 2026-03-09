import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Grid,
} from '@mui/material';

// Generic content skeleton with different variants
export const ContentSkeleton = ({ variant = 'default', count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="rectangular" height={200} />
              </Box>
            </CardContent>
          </Card>
        );

      case 'list':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="80%" />
            </Box>
          </Box>
        );

      case 'avatar':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="30%" height={28} />
              <Skeleton variant="text" width="50%" />
            </Box>
          </Box>
        );

      case 'table':
        return (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="text" width={`${100 / 4}%`} height={40} />
              ))}
            </Box>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} variant="text" width={`${100 / 4}%`} />
                ))}
              </Box>
            ))}
          </Box>
        );

      case 'profile':
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" width="40%" height={36} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="60%" height={24} sx={{ mx: 'auto' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" width={100} height={40} />
              ))}
            </Box>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
          </Box>
        );

      case 'grid':
        return (
          <Grid container spacing={3}>
            {Array.from({ length: count > 0 ? count : 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={180} />
                  <CardContent>
                    <Skeleton variant="text" width="80%" height={28} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 'feed':
        return (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="30%" height={24} />
                  <Skeleton variant="text" width="20%" />
                </Box>
              </Box>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Box>
            <Skeleton variant="text" width="60%" height={36} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </Box>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ mb: count > 1 ? 3 : 0 }}>
          {renderSkeleton()}
        </Box>
      ))}
    </>
  );
};

// Specialized skeleton components
export const CardSkeleton = ({ count = 1 }) => (
  <ContentSkeleton variant="card" count={count} />
);

export const ListSkeleton = ({ count = 5 }) => (
  <ContentSkeleton variant="list" count={count} />
);

export const ProfileSkeleton = () => (
  <ContentSkeleton variant="profile" count={1} />
);

export const TableSkeleton = () => (
  <ContentSkeleton variant="table" count={1} />
);

export const GridSkeleton = ({ count = 6 }) => (
  <ContentSkeleton variant="grid" count={count} />
);

export const FeedSkeleton = ({ count = 3 }) => (
  <ContentSkeleton variant="feed" count={count} />
);

export const AvatarSkeleton = ({ count = 1 }) => (
  <ContentSkeleton variant="avatar" count={count} />
);

export default ContentSkeleton;
