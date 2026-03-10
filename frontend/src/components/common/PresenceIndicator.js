import React, { useState, useEffect } from 'react';
import { Tooltip, Box } from '@mui/material';
import api from '../../utils/api';

const STATUS_COLORS = {
    online: '#44b700',
    away: '#f59e0b',
    busy: '#ef4444',
    offline: '#9e9e9e'
};

const STATUS_LABELS = {
    online: 'Online',
    away: 'Away',
    busy: 'Do not disturb',
    offline: 'Offline'
};

/**
 * PresenceIndicator — shows a colored dot representing a user's online status.
 *
 * Props:
 *   userId   — ID of the user to check
 *   size     — dot diameter in pixels (default: 10)
 *   style    — additional sx/style overrides
 *   knownStatus — if parent already knows the status (e.g. from socket events), pass it directly
 *                 to skip the REST fetch
 */
const PresenceIndicator = ({ userId, size = 10, style = {}, knownStatus }) => {
    const [status, setStatus] = useState(knownStatus || 'offline');
    const [customStatus, setCustomStatus] = useState('');

    useEffect(() => {
        if (knownStatus !== undefined) {
            setStatus(knownStatus);
            return;
        }
        if (!userId) return;

        let cancelled = false;
        api.get(`/messaging/presence/${userId}`)
            .then((res) => {
                if (!cancelled) {
                    setStatus(res.data?.status || 'offline');
                    setCustomStatus(res.data?.customStatus || '');
                }
            })
            .catch(() => { /* presence is best-effort */ });

        return () => { cancelled = true; };
    }, [userId, knownStatus]);

    const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
    const label = customStatus || STATUS_LABELS[status] || 'Offline';

    return (
        <Tooltip title={label} placement="top">
            <Box
                component="span"
                sx={{
                    display: 'inline-block',
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    bgcolor: color,
                    flexShrink: 0,
                    ...style
                }}
            />
        </Tooltip>
    );
};

export default PresenceIndicator;
