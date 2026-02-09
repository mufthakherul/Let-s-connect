import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Paper,
    Button,
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Avatar,
    Chip,
    CircularProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Card,
    CardContent,
    TextField
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import GroupIcon from '@mui/icons-material/Group';
import HistoryIcon from '@mui/icons-material/History';

const WebRTCCallWidget = () => {
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callHistory, setCallHistory] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
    const [loading, setLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [initiateDialog, setInitiateDialog] = useState(false);
    const [recipientId, setRecipientId] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const callTimerRef = useRef(null);

    useEffect(() => {
        fetchCallHistory();
        // Initialize WebRTC connection for receiving calls
        initializeWebRTC();
    }, []);

    useEffect(() => {
        if (activeCall) {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [activeCall]);

    const initializeWebRTC = async () => {
        try {
            const iceServersResponse = await fetch('http://localhost:8000/calls/ice-servers', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });

            if (iceServersResponse.ok) {
                const { iceServers } = await iceServersResponse.json();
                console.log('ICE Servers:', iceServers);
                // Store for later use when initiating/accepting calls
                localStorage.setItem('iceServers', JSON.stringify(iceServers));
            }
        } catch (error) {
            console.error('Failed to fetch ICE servers:', error);
        }
    };

    const fetchCallHistory = async () => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:8000/calls/history?limit=20&offset=0`, {
                headers: { 'x-user-id': userId }
            });

            if (response.ok) {
                const data = await response.json();
                setCallHistory(data.calls || []);
            }
        } catch (error) {
            console.error('Failed to fetch call history:', error);
        }
    };

    const getLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video' ? { width: 640, height: 480 } : false
            });

            if (localVideoRef.current && callType === 'video') {
                localVideoRef.current.srcObject = stream;
            }

            return stream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            alert('Please allow access to microphone and camera');
            return null;
        }
    };

    const initiateCall = async () => {
        if (!recipientId || !recipientId.trim()) {
            alert('Please enter recipient ID');
            return;
        }

        setLoading(true);
        try {
            const localStream = await getLocalStream();
            if (!localStream) {
                setLoading(false);
                return;
            }

            // Create peer connection
            const iceServers = JSON.parse(localStorage.getItem('iceServers') || '[]');
            const peerConnection = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = peerConnection;

            // Add local tracks
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send call initiation
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:8000/calls/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    recipientId,
                    type: callType,
                    offer: offer
                })
            });

            if (response.ok) {
                const { callId } = await response.json();
                setActiveCall({
                    id: callId,
                    recipientId,
                    type: callType,
                    status: 'calling'
                });
                setInitiateDialog(false);
                setRecipientId('');
            }
        } catch (error) {
            console.error('Failed to initiate call:', error);
            alert('Failed to start call');
        } finally {
            setLoading(false);
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;

        try {
            const localStream = await getLocalStream();
            if (!localStream) return;

            // Create peer connection
            const iceServers = JSON.parse(localStorage.getItem('iceServers') || '[]');
            const peerConnection = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = peerConnection;

            // Add local tracks
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Create answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Send acceptance
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:8000/calls/${incomingCall.id}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({ answer })
            });

            if (response.ok) {
                setActiveCall({
                    id: incomingCall.id,
                    callerId: incomingCall.callerId,
                    type: incomingCall.type,
                    status: 'active'
                });
                setIncomingCall(null);
            }
        } catch (error) {
            console.error('Failed to accept call:', error);
            alert('Failed to accept call');
        }
    };

    const rejectCall = async () => {
        if (!incomingCall) return;

        try {
            const userId = localStorage.getItem('userId');
            await fetch(`http://localhost:8000/calls/${incomingCall.id}/reject`, {
                method: 'POST',
                headers: { 'x-user-id': userId }
            });
            setIncomingCall(null);
        } catch (error) {
            console.error('Failed to reject call:', error);
        }
    };

    const endCall = async () => {
        if (!activeCall) return;

        try {
            const userId = localStorage.getItem('userId');
            await fetch(`http://localhost:8000/calls/${activeCall.id}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({ duration: callDuration })
            });

            // Stop all tracks
            if (localVideoRef.current?.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

            // Close peer connection
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            setActiveCall(null);
            setCallDuration(0);
            fetchCallHistory();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    };

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Calls</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        startIcon={<PhoneIcon />}
                        onClick={() => {
                            setCallType('audio');
                            setInitiateDialog(true);
                        }}
                    >
                        Audio Call
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<VideocamIcon />}
                        onClick={() => {
                            setCallType('video');
                            setInitiateDialog(true);
                        }}
                    >
                        Video Call
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        History
                    </Button>
                </Stack>
            </Box>

            {/* Incoming Call */}
            {incomingCall && (
                <Dialog open={true} maxWidth="sm" fullWidth>
                    <DialogContent sx={{ py: 4, textAlign: 'center' }}>
                        <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
                            {incomingCall.callerId.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Typography variant="h6" gutterBottom>
                            Incoming {incomingCall.type} call
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<PhoneIcon />}
                                onClick={acceptCall}
                            >
                                Accept
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<CallEndIcon />}
                                onClick={rejectCall}
                            >
                                Reject
                            </Button>
                        </Stack>
                    </DialogContent>
                </Dialog>
            )}

            {/* Active Call */}
            {activeCall && (
                <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#f5f5f5' }}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">
                            {activeCall.status === 'calling' ? 'Calling...' : 'Call in progress'}
                        </Typography>
                        <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                            {formatDuration(callDuration)}
                        </Typography>
                    </Box>

                    {/* Video Preview */}
                    {activeCall.type === 'video' && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={6}>
                                <Box
                                    sx={{
                                        backgroundColor: '#000',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        aspectRatio: '16/9'
                                    }}
                                >
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </Box>
                                <Typography variant="caption">Your video</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Box
                                    sx={{
                                        backgroundColor: '#000',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        aspectRatio: '16/9'
                                    }}
                                >
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </Box>
                                <Typography variant="caption">Remote video</Typography>
                            </Grid>
                        </Grid>
                    )}

                    {/* Call Controls */}
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                        <IconButton
                            color={isMuted ? 'error' : 'default'}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
                        {activeCall.type === 'video' && (
                            <IconButton
                                color={isVideoOff ? 'error' : 'default'}
                                onClick={() => setIsVideoOff(!isVideoOff)}
                            >
                                {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
                            </IconButton>
                        )}
                        <IconButton
                            color="error"
                            onClick={endCall}
                            sx={{ backgroundColor: '#ffebee' }}
                        >
                            <CallEndIcon />
                        </IconButton>
                    </Stack>
                </Paper>
            )}

            {/* Initiate Call Dialog */}
            <Dialog open={initiateDialog} onClose={() => setInitiateDialog(false)}>
                <DialogTitle>Start {callType} Call</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Recipient User ID"
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        placeholder="Enter user ID to call"
                        autoFocus
                    />
                </DialogContent>
                <Stack direction="row" spacing={1} sx={{ p: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={() => setInitiateDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={initiateCall}
                        disabled={loading || !recipientId.trim()}
                        startIcon={loading ? <CircularProgress size={20} /> : <PhoneIcon />}
                    >
                        Call
                    </Button>
                </Stack>
            </Dialog>

            {/* Call History */}
            {showHistory && (
                <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Call History
                    </Typography>
                    {callHistory.length > 0 ? (
                        <List>
                            {callHistory.map(call => (
                                <ListItem key={call.id}>
                                    <ListItemAvatar>
                                        <Avatar>
                                            {call.type === 'video' ? <VideocamIcon /> : <PhoneIcon />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${call.type} call with ${call.callerId === localStorage.getItem('userId') ? 'to' : 'from'} ${call.callerId === localStorage.getItem('userId') ? call.recipientId : call.callerId
                                            }`}
                                        secondary={`${call.status} - ${formatDuration(call.duration || 0)} - ${new Date(
                                            call.createdAt
                                        ).toLocaleString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="textSecondary">No call history</Typography>
                    )}
                </Paper>
            )}
        </Container>
    );
};

export default WebRTCCallWidget;
