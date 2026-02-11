import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import UnregisterLanding from './UnregisterLanding';
import AlreadyMemberDialog from './common/AlreadyMemberDialog';

/**
 * Home component - handles routing based on authentication status
 * - Unregistered users: show landing page  
 * - Registered users at /: redirect to Homepage (all recent/suggested posts)
 * - Registered users at /unregister: show "Already a Member" dialog with option to go back to Homepage
 */
function Home({ user }) {
  // If user is logged in, redirect to homepage
  if (user) {
    // Show dialog if they somehow landed on /unregister while logged in
    if (window.location.pathname === '/unregister') {
      return (
        <>
          <AlreadyMemberDialog
            open={true}
            onClose={() => { }}
            onContinue={() => window.location.href = '/'}
          />
        </>
      );
    }
    // Redirect root to homepage
    return <Navigate to="/" replace />;
  }

  // If not logged in, show unregister landing page
  return <UnregisterLanding />;
}

export default Home;
