import React from 'react';
import { Box, Skeleton, Card, CardContent, Grid } from '@mui/material';

/**
 * Reusable skeleton loaders for different content types
 */

export function PostSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            </Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="rectangular" height={200} sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Skeleton variant="text" width={80} />
              <Skeleton variant="text" width={80} />
              <Skeleton variant="text" width={80} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function UserCardSkeleton({ count = 3 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={60} height={60} sx={{ mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
              </Box>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton variant="rectangular" width="48%" height={36} />
                <Skeleton variant="rectangular" width="48%" height={36} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export function MessageSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'start',
            mb: 2,
            justifyContent: index % 2 === 0 ? 'flex-start' : 'flex-end'
          }}
        >
          {index % 2 === 0 && (
            <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1 }} />
          )}
          <Box sx={{ maxWidth: '70%' }}>
            <Skeleton variant="rectangular" height={60} width={200 + Math.random() * 100} />
            <Skeleton variant="text" width={100} sx={{ mt: 0.5 }} />
          </Box>
          {index % 2 === 1 && (
            <Skeleton variant="circular" width={32} height={32} sx={{ ml: 1 }} />
          )}
        </Box>
      ))}
    </>
  );
}

export function ListItemSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2 }}>
          <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" width={`${100 / columns}%`} />
        ))}
      </Box>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function VideoGridSkeleton({ count = 6 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Box>
            <Skeleton variant="rectangular" height={180} />
            <Box sx={{ mt: 1 }}>
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="60%" />
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="40%" />
              </Box>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export function PageHeaderSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
        <Skeleton variant="circular" width={100} height={100} sx={{ mr: 2, mt: -5 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="30%" />
        </Box>
        <Skeleton variant="rectangular" width={120} height={40} />
      </Box>
    </Box>
  );
}

export function FormSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index} sx={{ mb: 3 }}>
          <Skeleton variant="text" width="20%" sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={56} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Skeleton variant="rectangular" width={120} height={40} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </Box>
    </Box>
  );
}

// Generic skeleton that adapts to content
export function ContentSkeleton({ 
  type = 'post', 
  count = 1,
  ...props 
}) {
  const components = {
    post: PostSkeleton,
    user: UserCardSkeleton,
    message: MessageSkeleton,
    list: ListItemSkeleton,
    table: TableSkeleton,
    video: VideoGridSkeleton,
    header: PageHeaderSkeleton,
    form: FormSkeleton
  };

  const Component = components[type] || PostSkeleton;
  return <Component count={count} {...props} />;
}

export default ContentSkeleton;
