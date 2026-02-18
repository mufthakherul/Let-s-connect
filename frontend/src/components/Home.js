import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import UnregisterLanding from './UnregisterLanding';
import AlreadyMemberDialog from './common/AlreadyMemberDialog';
import Homepage from './Homepage';

/**
 * Home component - handles routing based on authentication status
 * - Unregistered users: show landing page  
 * - Registered users at /: redirect to Homepage (all recent/suggested posts)
 * - Registered users at /unregister: show "Already a Member" dialog with option to go back to Homepage
 */
function Home({ user }) {
  // If user is logged in, redirect to homepage
  const navigate = useNavigate();
  const [showAlreadyDialog, setShowAlreadyDialog] = useState(window.location.pathname === '/unregister');

  if (user) {
    // If logged-in user landed on /unregister, show the homepage with a modal overlay
    if (window.location.pathname === '/unregister') {
      return (
        <>
          <Homepage user={user} />
          <AlreadyMemberDialog
            open={showAlreadyDialog}
            onClose={() => setShowAlreadyDialog(false)}
            onContinue={() => { window.location.href = '/'; }}
          />
        </>
      );
    }

    // Redirect root to homepage for logged-out routing
    return <Navigate to="/" replace />;
  }

  // If not logged in, show unregister landing page
  return <UnregisterLanding />;
}

export default Home;
