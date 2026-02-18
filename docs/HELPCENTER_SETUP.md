# Help Center Setup Guide

## Overview

The Help Center is accessible at:
- **Development**: `http://localhost:3000/helpcenter`
- **Production**: `helpcenter.yourdomain.com` (subdomain) or `yourdomain.com/helpcenter` (path-based)

## Pages Included

1. **Help Center Home** (`/helpcenter`) - Hub with links to all sections
2. **User Manuals** (`/helpcenter/manuals`) - Step-by-step guides for all features
3. **FAQ** (`/helpcenter/faq`) - Frequently asked questions with search
4. **Feedback** (`/helpcenter/feedback`) - User feedback submission form
5. **Support Tickets** (`/helpcenter/tickets`) - Create and track support requests

## Production Subdomain Setup

### Option 1: Subdomain (Recommended)

To serve Help Center on `helpcenter.yourdomain.com`:

1. **DNS Configuration**
   - Add a CNAME record for `helpcenter` pointing to your main domain
   - Example: `helpcenter.yourdomain.com` → `yourdomain.com`

2. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name helpcenter.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Frontend Configuration**
   - Update `package.json` or `.env` to handle subdomain routing
   - Optional: Use environment variable `REACT_APP_HELPCENTER_SUBDOMAIN=true`

### Option 2: Path-based (Simpler)

Keep it as `/helpcenter` paths:
- No DNS changes needed
- Already configured and working
- Easier to maintain single deployment

## Backend Integration (Optional)

To connect forms to your backend API:

1. **Feedback Endpoint**
   ```javascript
   // In Feedback.js, replace console.log with:
   await axios.post('/api/feedback', formData);
   ```

2. **Support Ticket Endpoint**
   ```javascript
   // In SupportTicket.js, replace mock ticket with:
   const response = await axios.post('/api/support/tickets', formData);
   const ticketNumber = response.data.ticketNumber;
   ```

3. **Backend Routes** (Add to your API gateway)
   ```javascript
   POST /api/feedback
   POST /api/support/tickets
   GET  /api/support/tickets/:id
   ```

## Navigation

The Help Center is accessible from:
- Main navigation drawer (all users)
- Landing page footer (unregistered users)
- Direct URL: `/helpcenter`

## Customization

### Add New Manual Categories
Edit `UserManuals.js` → update `manuals` array

### Add New FAQs
Edit `FAQ.js` → update `faqs` array

### Change Support Email
Edit `HelpCenter.js` → update contact email

## Testing

1. Navigate to `/helpcenter`
2. Test all sub-pages
3. Submit a test feedback/ticket
4. Verify navigation links work

## Security Notes

- Forms are client-side only until backend is connected
- No sensitive data is stored locally
- Email validation is basic - add server-side validation in production
- File uploads are not yet implemented - add storage service when needed

---

**Questions?** Submit a support ticket at `/helpcenter/tickets` 😉
