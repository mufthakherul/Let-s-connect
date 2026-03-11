import React from 'react';
import { Card, CardContent, CardHeader, Avatar, Typography, Box, Chip, Stack, Button, Divider, CardActions } from '@mui/material';
import { ThumbUpOutlined, Comment, Share } from '@mui/icons-material';

/**
 * PostCard — core social feed item showing post content and actions.
 */
const PostCard = ({ author, avatar, timestamp, content, tags, likes, comments }) => (
  <Card sx={{ maxWidth: 600, mx: 'auto' }}>
    <CardHeader
      avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>{avatar || author?.[0]?.toUpperCase()}</Avatar>}
      title={<Typography fontWeight="bold">{author}</Typography>}
      subheader={timestamp}
    />
    <CardContent>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
        {content}
      </Typography>
      {tags && tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} size="small" color="primary" variant="outlined" />
          ))}
        </Stack>
      )}
    </CardContent>
    <Divider />
    <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
      <Button size="small" startIcon={<ThumbUpOutlined />}>{likes ?? 0}</Button>
      <Button size="small" startIcon={<Comment />}>{comments ?? 0}</Button>
      <Button size="small" startIcon={<Share />}>Share</Button>
    </CardActions>
  </Card>
);

export default {
  title: 'Milonexa/PostCard',
  component: PostCard,
  tags: ['autodocs'],
  argTypes: {
    author: { control: 'text' },
    content: { control: 'text' },
    likes: { control: 'number' },
    comments: { control: 'number' },
  },
};

export const Default = {
  args: {
    author: 'Jane Doe',
    timestamp: 'March 11, 2026 at 10:30am',
    content: 'Just deployed a new feature! The AI auto-tagging is working great. 🚀',
    tags: ['ai', 'devops', 'milonexa'],
    likes: 42,
    comments: 7,
  },
};

export const WithLongContent = {
  args: {
    author: 'Alex Smith',
    timestamp: '2 hours ago',
    content: `Here is a longer post to test how the card handles wrapping content.

We recently finished implementing Phase 18 of the Milonexa roadmap — AI & Intelligence.
This includes auto-tagging, sentiment analysis, smart digest, and real-time AI suggestions in chat.

Very exciting times! 🎉`,
    tags: ['announcement', 'product'],
    likes: 128,
    comments: 23,
  },
};

export const NoTags = {
  args: {
    author: 'Bob Johnson',
    timestamp: '5 minutes ago',
    content: 'Quick update: servers are all healthy! ✅',
    tags: [],
    likes: 5,
    comments: 0,
  },
};

export const HighEngagement = {
  args: {
    author: 'Viral Post',
    timestamp: 'Yesterday',
    content: 'This post has tons of likes and comments!',
    tags: ['viral', 'popular'],
    likes: 10432,
    comments: 892,
  },
};
