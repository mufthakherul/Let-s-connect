import React from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';

/**
 * PageShell
 * Standardized page container with consistent title/subtitle/actions structure.
 * Workstream A baseline: unified page family layout primitives.
 */
export default function PageShell({
  title,
  subtitle,
  icon,
  actions,
  children,
  elevated = true,
  contentSx = {},
}) {
  return (
    <Box component="section" aria-label={title || 'Page section'} sx={{ mt: 2 }}>
      {(title || subtitle || actions) && (
        <Paper
          elevation={elevated ? 1 : 0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 2,
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              {title && (
                <Typography
                  id="page-shell-title"
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {icon}
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions ? <Box>{actions}</Box> : null}
          </Stack>
        </Paper>
      )}

      <Box sx={contentSx}>{children}</Box>
    </Box>
  );
}
