import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Inbox,
  SearchOff,
  CloudOff,
  ErrorOutline,
  FolderOpen,
  Person,
  ShoppingCart,
  Article,
  VideoLibrary,
  Chat,
  Group,
} from '@mui/icons-material';

const EMPTY_STATE_ICONS = {
  inbox: Inbox,
  search: SearchOff,
  offline: CloudOff,
  error: ErrorOutline,
  folder: FolderOpen,
  person: Person,
  cart: ShoppingCart,
  article: Article,
  video: VideoLibrary,
  chat: Chat,
  group: Group,
  default: Inbox,
};

const EmptyState = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
  illustration,
  variant = 'default',
  size = 'medium',
}) => {
  const IconComponent = icon ? EMPTY_STATE_ICONS[icon] || EMPTY_STATE_ICONS.default : null;
  
  const iconSize = {
    small: 60,
    medium: 100,
    large: 140,
  }[size];

  const titleVariant = {
    small: 'h6',
    medium: 'h5',
    large: 'h4',
  }[size];

  const descriptionVariant = {
    small: 'body2',
    medium: 'body1',
    large: 'h6',
  }[size];

  const padding = {
    small: 3,
    medium: 4,
    large: 6,
  }[size];

  const content = (
    <Box
      sx={{
        textAlign: 'center',
        py: padding,
        px: 2,
      }}
    >
      {illustration ? (
        <Box sx={{ mb: 3 }}>{illustration}</Box>
      ) : IconComponent ? (
        <IconComponent
          sx={{
            fontSize: iconSize,
            color: 'text.disabled',
            mb: 3,
          }}
        />
      ) : null}

      {title && (
        <Typography variant={titleVariant} gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      )}

      {description && (
        <Typography
          variant={descriptionVariant}
          color="text.secondary"
          sx={{ mb: action || secondaryAction ? 3 : 0, maxWidth: 500, mx: 'auto' }}
        >
          {description}
        </Typography>
      )}

      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {action && (
            <Button variant="contained" onClick={action}>
              {actionLabel || 'Get Started'}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" onClick={secondaryAction}>
              {secondaryActionLabel || 'Learn More'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
};

// Specialized empty state components
export const EmptyInbox = ({ action, actionLabel }) => (
  <EmptyState
    icon="inbox"
    title="No items yet"
    description="When you have items, they'll appear here."
    action={action}
    actionLabel={actionLabel}
  />
);

export const EmptySearch = ({ searchTerm, onReset }) => (
  <EmptyState
    icon="search"
    title="No results found"
    description={
      searchTerm
        ? `We couldn't find anything matching "${searchTerm}". Try different keywords or filters.`
        : "We couldn't find any results. Try adjusting your search."
    }
    action={onReset}
    actionLabel="Clear Search"
  />
);

export const EmptyCart = ({ onShop }) => (
  <EmptyState
    icon="cart"
    title="Your cart is empty"
    description="Add items to your cart to get started with your purchase."
    action={onShop}
    actionLabel="Start Shopping"
  />
);

export const EmptyFolder = ({ onUpload }) => (
  <EmptyState
    icon="folder"
    title="This folder is empty"
    description="Upload files or create new folders to organize your content."
    action={onUpload}
    actionLabel="Upload Files"
  />
);

export const EmptyChat = ({ onNewChat }) => (
  <EmptyState
    icon="chat"
    title="No conversations yet"
    description="Start a new conversation to connect with others."
    action={onNewChat}
    actionLabel="New Conversation"
  />
);

export const EmptyGroup = ({ onCreate }) => (
  <EmptyState
    icon="group"
    title="No groups yet"
    description="Create or join groups to collaborate with others."
    action={onCreate}
    actionLabel="Create Group"
  />
);

export const EmptyContent = ({ type = 'content', onCreate }) => {
  const configs = {
    video: {
      icon: 'video',
      title: 'No videos yet',
      description: 'Upload your first video to start building your library.',
      actionLabel: 'Upload Video',
    },
    article: {
      icon: 'article',
      title: 'No articles yet',
      description: 'Write your first article to share your knowledge.',
      actionLabel: 'Write Article',
    },
    content: {
      icon: 'inbox',
      title: 'No content yet',
      description: 'Create your first piece of content to get started.',
      actionLabel: 'Create Content',
    },
  };

  const config = configs[type] || configs.content;

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={onCreate}
      actionLabel={config.actionLabel}
    />
  );
};

export const ErrorState = ({ title, description, onRetry, onHome }) => (
  <EmptyState
    icon="error"
    title={title || 'Something went wrong'}
    description={description || 'An error occurred while loading this content. Please try again.'}
    action={onRetry}
    actionLabel="Try Again"
    secondaryAction={onHome}
    secondaryActionLabel="Go Home"
    size="medium"
  />
);

export const OfflineState = ({ onRetry }) => (
  <EmptyState
    icon="offline"
    title="You're offline"
    description="Please check your internet connection and try again."
    action={onRetry}
    actionLabel="Retry"
    size="medium"
  />
);

export default EmptyState;
