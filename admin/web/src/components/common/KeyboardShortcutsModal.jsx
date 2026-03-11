import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { Keyboard as KeyboardIcon } from '@mui/icons-material';
// KEYBOARD_SHORTCUTS is intentionally not used here — EXTENDED_SHORTCUTS below is the
// canonical display list and supersedes the hook's minimal reference array.

const EXTENDED_SHORTCUTS = [
  // Navigation
  { category: 'Navigation', key: '?', description: 'Show this help' },
  { category: 'Navigation', key: 'Ctrl+K', description: 'Focus search' },
  { category: 'Navigation', key: 'Esc', description: 'Close dialog / Clear selection' },
  { category: 'Navigation', key: '1', description: 'Switch to Dashboard tab' },
  { category: 'Navigation', key: '2', description: 'Switch to Services tab' },
  { category: 'Navigation', key: '3', description: 'Switch to Users tab' },
  { category: 'Navigation', key: '4', description: 'Switch to Audit Log tab' },
  { category: 'Navigation', key: '5', description: 'Switch to SLA Timeline tab' },
  { category: 'Navigation', key: '6', description: 'Switch to Alert Rules tab' },
  { category: 'Navigation', key: '7', description: 'Switch to Cost Breakdown tab' },
  { category: 'Navigation', key: '8', description: 'Switch to AI Permissions tab' },
  { category: 'Navigation', key: '9', description: 'Switch to Settings tab' },
  // Actions
  { category: 'Actions', key: 'Ctrl+R', description: 'Refresh current data' },
  { category: 'Actions', key: 'A', description: 'Approve selected' },
  { category: 'Actions', key: 'R', description: 'Reject selected' },
  { category: 'Actions', key: 'D', description: 'Delete selected' },
  { category: 'Actions', key: 'E', description: 'Export data' },
  // View
  { category: 'View', key: 'Ctrl+Shift+D', description: 'Toggle dark mode' },
  { category: 'View', key: 'Ctrl+Shift+F', description: 'Toggle fullscreen' },
];

const CATEGORIES = ['Navigation', 'Actions', 'View'];

const KeyboardShortcutsModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <KeyboardIcon />
        Keyboard Shortcuts
      </DialogTitle>
      <DialogContent dividers>
        {CATEGORIES.map((category) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {category}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  {EXTENDED_SHORTCUTS.filter((s) => s.category === category).map((shortcut) => (
                    <TableRow key={shortcut.key} hover>
                      <TableCell sx={{ width: '40%' }}>
                        <Chip
                          label={shortcut.key}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{shortcut.description}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {category !== CATEGORIES[CATEGORIES.length - 1] && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
