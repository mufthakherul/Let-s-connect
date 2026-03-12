# Authentication and Account Management

This comprehensive guide covers all aspects of account security, authentication methods, and account management on the Milonexa platform. Whether you're registering for the first time, logging in, or managing your security settings, this document provides detailed information for every scenario.

## Table of Contents
1. [Registration](#registration)
2. [Login](#login)
3. [OAuth Providers](#oauth-providers)
4. [Email Verification](#email-verification)
5. [Password Reset](#password-reset)
6. [Two-Factor Authentication](#two-factor-authentication)
7. [JWT Tokens and Sessions](#jwt-tokens-and-sessions)
8. [Session Management](#session-management)
9. [Account Deletion](#account-deletion)
10. [Security Best Practices](#security-best-practices)

---

## Registration

The registration process is the first step to joining Milonexa. This section details all requirements and best practices for creating your account.

### Registration Form Fields

Your registration form requires the following information:

#### Username
- **Length:** Between 3-30 characters
- **Allowed characters:** Letters (a-z, A-Z), numbers (0-9), underscores (_)
- **Special cases:**
  - Cannot start with a number
  - Cannot end with an underscore
  - Case-insensitive (john_smith = John_Smith)
  - Spaces are not allowed
- **Uniqueness:** Must be unique across the entire platform
- **Changeability:** Can be changed once every 30 days (in Settings > Profile)
- **Examples:** john_smith, creative_designer, tech_guru_2024
- **Reserved usernames:** Certain usernames like "admin", "support", "milonexa" are reserved

#### Email Address
- **Format:** Must be a valid email address (RFC 5321 compliant)
- **Verification:** Required before account activation
- **Uniqueness:** One email per account; one account per email
- **Primary use:** Account recovery, notifications, and administrative communications
- **Changeability:** Can change email in Settings > Account once verified
- **Security:** Email is encrypted; never shared without your consent

**Important Email Considerations:**
- Use an email you access regularly
- Avoid shared email accounts if possible
- Confirm email is correct before submitting (typos mean you can't verify)
- Keep this email updated (needed for password recovery)

#### Password
- **Minimum length:** 8 characters
- **Character requirements:** Must contain:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*-_=+)
- **Examples of valid passwords:**
  - MyPassword123!
  - Secure@Pass2024
  - StrongP@ssw0rd
- **Examples of invalid passwords:**
  - password123 (no uppercase, no special char)
  - PASSWORD123! (no lowercase)
  - Mypassword! (no number)
  - Abc123 (too short, no special char)

**Password Security Notes:**
- Passwords are hashed using bcrypt before storage
- Never stored in plain text
- Encrypted during transmission (HTTPS only)
- Never shared via email or support ticket
- You should never share your password with anyone

#### Display Name
- **Purpose:** Public-facing name shown on your profile and posts
- **Can differ from username:** Many users have different usernames and display names
- **Length:** 2-100 characters
- **Allowed characters:** Letters, numbers, spaces, hyphens, apostrophes, periods
- **Examples:**
  - John Smith
  - Maria Garcia-López
  - Alex Chen
  - Dr. Robert Johnson
  - Sam O'Brien
- **Changeability:** Can change unlimited times in Settings > Profile
- **Visibility:** Always public (appears on your profile)
- **Professionalism:** Choose a name you're comfortable using professionally

#### Date of Birth
- **Format:** MM/DD/YYYY
- **Examples:** 01/15/1990, 12/25/1985
- **Age requirement:** Minimum age is 13 years old (required by law)
- **Calculation:** Milonexa automatically calculates your age from this date
- **Verification:** Used to ensure legal age compliance
- **Privacy:** Private by default; you can choose to display it on your profile
- **Age-appropriate content:** Content recommendations are adjusted based on your age
- **COPPA Compliance:** For users under 13, special protections apply

### Completing Registration

**Step-by-Step Process:**

1. **Navigate to Registration**
   - Visit the Milonexa homepage
   - Click the "Sign Up" button (top-right corner)
   - Or visit https://milonexa.com/register directly

2. **Fill in the Form**
   - Enter all required fields
   - Verify information is correct before submitting
   - Reenter password to confirm (optional verification feature)

3. **Read Terms and Policies**
   - Review Terms of Service (link provided)
   - Review Privacy Policy (link provided)
   - Check the box: "I agree to the Terms of Service and Privacy Policy"
   - These cannot be skipped

4. **Submit**
   - Click "Create Account" or "Sign Up"
   - You'll see a confirmation message
   - Redirected to email verification page

5. **Verify Email**
   - Check your email for verification code
   - See Email Verification section below
   - Complete verification within 10 minutes

6. **Complete Profile**
   - Add avatar, bio, location
   - See Getting Started guide for details

### Registration Errors

**Common Registration Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| Username already taken | Another user has that username | Choose a different username |
| Invalid email | Email format incorrect or invalid | Check spelling, use proper email format |
| Password doesn't meet requirements | Doesn't have uppercase, number, or special character | Add missing character types |
| Email already registered | That email has an account | Use different email or reset password if it's yours |
| Age requirement not met | User under 13 years old | Must be 13+ to use Milonexa |

---

## Login

Access your Milonexa account with your credentials.

### Login Process

**Standard Email/Password Login:**

1. **Access Login Page**
   - Visit https://milonexa.com/login
   - Or click "Log In" on the homepage
   - From the app, click "Sign In"

2. **Enter Email**
   - Type the email associated with your account
   - Case-insensitive
   - Must match exactly (no leading/trailing spaces)

3. **Enter Password**
   - Type your password
   - Case-sensitive (Capital letters matter)
   - Password appears as dots for security
   - Can click eye icon to show/hide password

4. **Optional: Remember Me**
   - Check "Remember me on this device" to stay logged in
   - **Security note:** Only use on personal devices
   - Don't use on shared computers
   - Session expires after 30 days for security

5. **Submit**
   - Click "Log In" button
   - Or press Enter key
   - Wait for authentication to process

6. **Success**
   - Redirected to homepage or feed
   - Account is now active
   - Notifications and messages available

### Forgotten Password During Login

**If you forget your password:**
1. Click "Forgot Password?" link on login page
2. Enter your email address
3. Click "Send Reset Link"
4. See Password Reset section below
5. Follow reset instructions in your email

### Login Errors

**"Invalid email or password"**
- Email doesn't have an account
- Password is incorrect
- Email was entered with typos
- **Solution:** Check email spelling and verify password is correct

**"This account has been locked"**
- Too many failed login attempts (after 10 attempts)
- Security measure to prevent brute force attacks
- **Solution:** Wait 30 minutes and try again, or use Forgot Password

**"Email not verified"**
- Email verification incomplete
- Account is suspended pending verification
- **Solution:** Click "Resend Verification Code" and complete email verification

**"Account has been suspended"**
- Account violated Milonexa terms
- Automatic suspension for security
- **Solution:** Check email for details; contact support@milonexa.com

**"Two-factor authentication required"**
- 2FA is enabled on your account
- See Two-Factor Authentication section below
- **Solution:** Provide TOTP code or use backup code

### Session Security

**Your login session:**
- Created immediately after successful authentication
- Encrypted session tokens stored in secure cookies
- Session expires automatically after 30 days of inactivity
- Logging out immediately terminates session
- Can have multiple active sessions on different devices

---

## OAuth Providers

Use third-party accounts to sign in quickly and securely via OAuth 2.0 with PKCE flow.

### What is OAuth?

**OAuth (Open Authorization) 2.0:**
- Industry-standard protocol for secure third-party access
- You authorize Milonexa to access your basic profile info
- Your password with third-party provider is never shared with Milonexa
- Faster registration and login process
- Reduces number of passwords you need to remember

**PKCE (Proof Key for Code Exchange):**
- Enhanced security layer for OAuth
- Protects against authorization code interception
- Required for public clients (web apps)
- Automatically handled by Milonexa (no action needed from you)

### Supported OAuth Providers

Milonexa supports the following third-party OAuth providers:

#### Google
- **Why use it:** Most widely used; integrates with Gmail and Android
- **Permissions requested:**
  - Email address
  - Display name
  - Profile picture
  - Basic profile information
- **Two-factor authentication:** Uses your Google account security
- **Account linking:** Can link Google account to existing Milonexa account

**Steps to sign up with Google:**
1. Click "Sign up with Google" button
2. Redirected to Google login page (if not already logged in)
3. Select Google account to use
4. Review permissions: "Milonexa wants to access..."
5. Click "Allow" or "Continue"
6. Redirected back to Milonexa
7. Milonexa creates account with Google info
8. Set your display name and complete profile

#### GitHub
- **Why use it:** Ideal for developers; integrates with GitHub account
- **Permissions requested:**
  - Email address
  - Public profile information
  - GitHub username and profile picture
  - No access to repositories or code
- **Best for:** Software developers, tech professionals
- **Account linking:** Can link GitHub account to existing profile

**Steps to sign up with GitHub:**
1. Click "Sign up with GitHub" button
2. Redirected to GitHub login page
3. Enter GitHub credentials if not already logged in
4. Review permissions on GitHub
5. Click "Authorize milonexa" or "Continue"
6. Redirected back to Milonexa
7. Account created with GitHub profile info
8. Complete profile setup

**Security note:** Milonexa only accesses public GitHub information, never repositories or private data.

#### Discord
- **Why use it:** Great for gamers and community members
- **Permissions requested:**
  - Email address
  - Discord username
  - Discord discriminator (if applicable)
  - Profile picture
  - Server list (visible servers)
- **Best for:** Gamers, streamers, community builders
- **Account linking:** Can link Discord account to profile

**Steps to sign up with Discord:**
1. Click "Sign up with Discord" button
2. Redirected to Discord login page
3. Enter Discord credentials if needed
4. Authorize Milonexa app on permissions screen
5. Click "Authorize"
6. Redirected back to Milonexa
7. Milonexa account created with Discord info
8. Complete your profile

**Connected benefits:**
- Share your gaming status (optional)
- Display Discord username on profile
- Link to Discord server in profile

#### Apple
- **Why use it:** Privacy-focused; unique email relay feature
- **Permissions requested:**
  - Email address
  - Name (optional)
  - Profile picture
- **Email relay:** Option to hide real email and use relay address
- **Best for:** Privacy-conscious users, macOS/iOS users
- **Account linking:** Can link Apple ID to existing account

**Steps to sign up with Apple:**
1. Click "Sign up with Apple" button
2. If on Apple device, Face ID/Touch ID may be requested
3. Review permissions screen
4. Choose to share email or use Apple relay email
   - "Share My Email": Milonexa gets your real Apple email
   - "Hide My Email": Milonexa gets generated relay email
5. Click "Continue"
6. Redirected back to Milonexa
7. Account created
8. Complete profile setup

**Privacy note:** If using Hide My Email, you can still change email later and choose to reveal it.

### Account Linking

**Connect Multiple OAuth Accounts:**

1. Go to Settings > Account > Connected Accounts
2. Click "Connect" next to desired provider
3. Follow OAuth flow for that provider
4. Account is now linked to your Milonexa account
5. Can sign in with any linked account

**Benefits of Linking:**
- Multiple ways to log in
- Doesn't affect account security
- Can unlink anytime
- Each login is logged in session history

**Unlinking an Account:**
1. Go to Settings > Account > Connected Accounts
2. Find the linked account
3. Click "Unlink" or "Disconnect"
4. Confirm action
5. Can still log in with email/password or other linked accounts

### First-Time OAuth Sign-Up

**What Information Milonexa Receives:**
- Email address (always)
- Display name/Full name
- Profile picture
- Public profile information only
- No passwords, private messages, or sensitive data

**What Milonexa Doesn't Get:**
- Your password with the provider
- Two-factor authentication settings
- Financial or banking information
- Private messages or files
- Contacts or friend lists

**Data Sharing:**
- Milonexa doesn't share data with OAuth provider
- OAuth provider doesn't get your Milonexa data
- Both accounts are separate; data doesn't sync
- Exceptions: You authorize specific integrations later

---

## Email Verification

Email verification is a critical security step that confirms you own the email address used for your account.

### Verification Flow

**After Registration:**
1. You complete registration form
2. You see "Check your email" message
3. Milonexa sends verification email to provided address
4. You receive email with subject: "Verify your Milonexa account"
5. Email contains 6-digit code and verification link

**Why Email Verification:**
- Prevents account takeover using typos
- Ensures you can recover your account
- Reduces spam and fake accounts
- Required by law for account security
- Confirms you have access to email

### Verification Code Details

**6-Digit Code Characteristics:**
- Format: Six numbers (000000-999999)
- Expires after 10 minutes
- Case-insensitive entry (you only enter numbers)
- One-time use (becomes invalid after successful verification)
- Can request new code before entering

**Code Location in Email:**
- In the email body as highlighted text
- Usually displayed prominently
- May also be in a button link
- Included multiple times in email for easy reference

### Entering the Verification Code

**Manual Entry Method:**
1. Open email from Milonexa
2. Copy the 6-digit code
3. Return to Milonexa verification page
4. Click in the first verification field
5. Paste or type the 6-digit code
6. Press Enter or click "Verify"
7. Code is validated
8. You're logged in and profile setup begins

**Link Method:**
1. Open email from Milonexa
2. Click the verification link in the email
3. Automatically navigates to Milonexa
4. Code is auto-filled
5. Page confirms verification
6. Account is activated

**Success Messages:**
- "Email verified successfully"
- "Account activated"
- Redirected to profile setup
- Green checkmark appears next to email

### If You Don't Receive the Code

**Troubleshooting Steps:**

1. **Check spam/junk folder**
   - Milonexa emails may be filtered automatically
   - Add noreply@milonexa.com to contacts
   - Check inbox completely

2. **Wait a few minutes**
   - Email can take 1-3 minutes to arrive
   - Check again in 2-3 minutes

3. **Verify email address**
   - Check you entered email correctly during registration
   - Look for typos (gmail.com vs gmial.com)
   - Ensure address is accessible

4. **Resend verification code**
   - Click "Didn't receive a code?" on verification page
   - Click "Resend Code" button
   - New code sent immediately
   - Can resend up to 5 times per hour
   - No penalty for resending

5. **Check email service**
   - Is email service down?
   - Try accessing your email on another browser
   - Restart your email application

6. **Use different email**
   - If that email is unavailable, contact support
   - May need to register with different email

### Expired Verification Code

**Code Expires After:**
- 10 minutes of the email being sent
- One successful verification (code becomes invalid)
- Upon requesting a new code (old code expires)

**What Happens if Code Expires:**
- Page shows "Code expired" error
- Cannot use that code anymore
- Must request a new code

**Getting a New Code:**
1. Click "Didn't receive a code?" or "Code expired?"
2. Click "Resend Code"
3. Check email for new code
4. Use new code within 10 minutes

### Two-Factor Authentication and Email Verification

**If 2FA is enabled:**
- Email verification is still required
- After email verification, 2FA code required
- Complete email verification first
- Then provide TOTP code from authenticator app
- Both are required for account activation

---

## Password Reset

Forgotten your password? Follow this process to regain access to your account.

### Initiating Password Reset

**From Login Page:**
1. Go to https://milonexa.com/login
2. Click "Forgot Password?" or "Forgot your password?"
3. Enter the email address for your account
4. Click "Send Reset Link" or "Next"
5. Confirmation message: "Check your email for reset instructions"
6. Reset email sent to your inbox

**From Account Settings:**
1. Go to Settings > Security
2. Click "Change Password"
3. Enter current password to verify identity
4. Click "Forgot password?" if you don't know current password
5. Proceeds to email reset flow

### Password Reset Email

**Email Contents:**
- Subject: "Reset your Milonexa password"
- Contains reset link (valid for 30 minutes)
- Contains 6-digit confirmation code (as backup)
- Instructions on how to reset password

**Reset Link Details:**
- Unique to your account
- Expires after 30 minutes
- Single-use (becomes invalid after password change)
- Cannot be reused even if password reset fails

### Resetting Your Password

**Via Reset Link:**
1. Open email with subject "Reset your Milonexa password"
2. Click the reset link
3. Taken to password reset form
4. Link confirms your identity automatically
5. Enter new password
   - Same requirements as original password
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number, special character
6. Confirm new password by re-entering
7. Click "Reset Password" or "Update Password"
8. Success message appears
9. Redirected to login page
10. Log in with new password

**Via Confirmation Code:**
1. From password reset page
2. If link doesn't work, click "Use code instead"
3. Enter the 6-digit code from email
4. Submit code
5. Proceeds to password reset form
6. Follow steps 5-10 from above

### Password Reset Security

**One-Time Reset Link:**
- Can't be reused
- Expires after 30 minutes
- Different for each reset request
- Logged in session history

**New Password Validation:**
- Same strong requirements as registration
- Cannot reuse your previous 5 passwords
- Immediately invalidates all old sessions
- EXCEPT: Current active session stays valid for 5 minutes (to prevent lockout)

**Session Impact:**
- Password change logs you out of ALL devices
- Security: Prevents unauthorized use if password was compromised
- You'll need to log in again on all devices
- Old sessions cannot access your account

**Failed Reset Attempts:**
- Too many failed attempts (10+) locks out reset process
- Wait 1 hour before trying again
- Contact support if locked out
- Can request to unlock via email

### Reset Link Issues

**"Link has expired"**
- More than 30 minutes have passed since email
- **Solution:** Request new reset email, reset within 30 minutes

**"This link has been used"**
- You already used this link to reset password
- **Solution:** Request new reset email using "Forgot Password"

**"Invalid reset link"**
- Link is malformed or incorrect
- Copied wrong link from email
- **Solution:** Use the code-based reset method instead

**"Email address not found"**
- Email not associated with Milonexa account
- Typo in email address
- **Solution:** Check spelling or register new account

### If You Can't Access Your Email

**Alternative Verification Methods:**
1. Contact support@milonexa.com
2. Provide:
   - Account username
   - Account creation date (approximate)
   - Email on file
3. Answer security questions (if set up)
4. Support verifies identity
5. Manual password reset via support

**Setting Up Backup Recovery Method:**
1. Go to Settings > Security
2. Add backup email address
3. Add phone number
4. Add security questions
5. Can use these if primary email inaccessible

---

## Two-Factor Authentication

Two-factor authentication (2FA) adds an extra security layer requiring both your password and a second verification method.

### Why Enable 2FA

**Security Benefits:**
- Protects against password theft
- Prevents unauthorized account access
- Required for sensitive actions
- Recommended for all users, essential for high-value accounts

**How It Works:**
1. You log in with email and password
2. System requests second verification
3. You provide TOTP code from authenticator app
4. Account verifies code matches
5. You're granted access

### Setting Up 2FA

**Step 1: Go to Security Settings**
1. Click Profile > Settings
2. Go to Security > Two-Factor Authentication
3. Click "Enable 2FA" or "Set Up 2FA"
4. Password verification required (confirm account password)

**Step 2: Choose Authentication Method**
- **TOTP (Time-based One-Time Password):** Recommended
- **SMS (text message):** Secondary option (if available in your region)
- **Backup Codes:** Emergency access method

**Step 3: Set Up TOTP (Recommended)**

1. **Get Authenticator App**
   - Google Authenticator (iOS, Android)
   - Microsoft Authenticator (iOS, Android, Windows)
   - Authy (iOS, Android, Windows, Mac)
   - 1Password (iOS, Android, Mac, Windows)
   - Any TOTP-compatible app

2. **Display QR Code**
   - Milonexa displays QR code on screen
   - Option to show "setup key" text code instead
   - Copy and save setup key in secure location

3. **Scan QR Code**
   - Open authenticator app
   - Tap "+" or "Add Account"
   - Select "Scan QR code"
   - Point camera at Milonexa QR code
   - Wait for scan confirmation
   - Account appears in authenticator app

4. **Alternative: Manual Entry**
   - If scanning doesn't work, click "Can't scan?"
   - Click "Enter setup key instead"
   - Authenticator app: Select "Enter a code" or "Manual entry"
   - Copy the key from Milonexa
   - Paste into authenticator app
   - Enter account name as "Milonexa"

5. **Generate TOTP Code**
   - Open your authenticator app
   - Find Milonexa entry
   - 6-digit code appears (changes every 30 seconds)
   - Copy this code

6. **Verify TOTP Setup**
   - Return to Milonexa
   - Enter the 6-digit TOTP code from authenticator
   - Click "Verify and Enable"
   - Code is validated (must be correct)

7. **Success**
   - 2FA is now enabled
   - See "2FA is active" confirmation
   - Received backup codes

**Step 4: Save Backup Codes**

1. **What Are Backup Codes:**
   - 10 emergency codes, each used once
   - Allow access if authenticator app unavailable
   - Required only in emergencies (phone lost, app deleted, etc.)

2. **How to Use Backup Codes:**
   - Never share them with anyone
   - Store in secure location (password manager, safe, etc.)
   - Each code can only be used once
   - After using, that code is invalid forever

3. **Save Codes:**
   - Screenshot and save securely
   - Print and store in safe place
   - Save to password manager
   - Save to cloud storage (password protected)
   - Do NOT email them to yourself

4. **Backup Code Format:**
   - Each code is 8 characters
   - Format: XXXX-XXXX
   - Example: A1B2-C3D4
   - Can enter with or without hyphens

### Logging In with 2FA Enabled

**Login Process:**
1. Go to https://milonexa.com/login
2. Enter email address
3. Enter password
4. Click "Log In"
5. System prompts for 2FA code
6. Message appears: "Enter the 6-digit code from your authenticator app"
7. Open your authenticator app
8. Copy the 6-digit TOTP code
9. Return to Milonexa
10. Paste or type code in field
11. Click "Verify" or press Enter
12. Code is validated
13. Logged in successfully

**If Code is Wrong:**
- "Invalid code" error appears
- Check that code is correct (no typos)
- Try again
- Maximum 5 failed attempts before lockout
- Wait 15 minutes before retrying

**If You Forgot Authenticator App:**
- Use one of your saved backup codes
- Enter code in the authentication field (same location as TOTP)
- One backup code is consumed
- Logged in successfully
- Immediately set up new authenticator app

### Troubleshooting 2FA

**"Code is invalid" (but you're sure it's correct)**
- Time sync issue between phone and Milonexa servers
- Solution: Restart authenticator app
- Solution: Sync phone time with NTP server
  - Settings > Date & Time > "Automatic date and time"

**"I lost my authenticator app"**
- Use a backup code to log in
- Go to Settings > Security > 2FA
- Remove old 2FA setup
- Set up new authenticator app
- Generate new backup codes

**"I used all backup codes"**
- Contact support@milonexa.com
- Provide account username and email
- Support will verify identity
- Support will regenerate backup codes

**"I don't have my phone/authenticator app"**
- Cannot bypass 2FA authentication
- Must use saved backup code
- If no backup codes available:
  - Contact support immediately
  - Provide account details for verification
  - Support can disable 2FA temporarily
  - Verify your identity through other means
  - Requires additional security verification

### Disabling 2FA

**Steps to Disable:**
1. Go to Settings > Security
2. Scroll to "Two-Factor Authentication"
3. Click "Disable 2FA" or "Turn Off 2FA"
4. Enter your password to confirm
5. Confirm you want to disable
6. 2FA is immediately disabled
7. No more authentication codes required

**After Disabling:**
- Access account with password only
- More vulnerable to unauthorized access
- Can re-enable anytime in Settings
- Previous backup codes become invalid

---

## JWT Tokens and Sessions

Understanding JWT tokens and session management helps you manage your authentication securely.

### JWT Token Overview

**What is JWT (JSON Web Token):**
- Encrypted token containing account information
- Issued after successful login
- Used to authenticate requests to Milonexa API
- Compact and self-contained format
- Digitally signed to prevent tampering

### Access Token

**Characteristics:**
- **Lifespan:** 15 minutes
- **Purpose:** Authenticate API requests
- **Format:** Encrypted JWT token
- **Storage:** Secure HTTP-only cookies (recommended)
- **Revocation:** Cannot be manually revoked (expires automatically)

**How It Works:**
1. You log in successfully
2. Server generates access token
3. Token sent to your browser/app
4. Stored in secure cookie (can't be accessed via JavaScript)
5. Automatically included with each API request
6. Server validates token with each request
7. Grants access if token valid
8. Expires after 15 minutes of inactivity

**What It Contains:**
- User ID
- Username
- Email address
- Account permissions
- Issue time and expiration
- Digital signature

### Refresh Token

**Characteristics:**
- **Lifespan:** 7 days
- **Purpose:** Obtain new access tokens without re-entering password
- **Format:** Encrypted JWT token
- **Storage:** Secure HTTP-only cookies
- **Single-use:** Becomes invalid after use (new refresh token issued)

**How Refresh Works:**
1. Access token expires (after 15 minutes)
2. App/browser detects expiration
3. Sends refresh token to server
4. Server validates refresh token
5. Server issues new access token
6. Server issues new refresh token
7. User's session continues seamlessly
8. No re-login required

**Benefits:**
- User doesn't need to re-enter password every 15 minutes
- Long-term sessions (7 days) without manual login
- If refresh token compromised, only affects 7-day window
- Access tokens can be short-lived for security

### Auto-Refresh Process

**What Is Auto-Refresh:**
- Automatic token renewal before expiration
- Happens silently in the background
- User doesn't notice any interruption
- Continuous uninterrupted session

**When Auto-Refresh Occurs:**
- When you're actively using Milonexa
- About 1 minute before access token expires
- Can happen multiple times during your session
- Transparent to user

**Session Extension:**
- Each auto-refresh extends your session
- Refresh token resets to 7-day timer
- You can stay logged in indefinitely (as long as active)
- 24 hours of inactivity triggers logout

### Token Expiration and Logout

**Automatic Logout:**
- Access token expires after 15 minutes of inactivity
- Refresh token expires after 7 days regardless
- Browser session cleared upon logout
- Cookies deleted from browser

**Manual Logout:**
- Click "Log Out" in account menu
- Current session terminated immediately
- All tokens invalidated
- Redirected to login page

**Session Timeout:**
- 24 hours of inactivity = automatic logout
- Activity includes: browsing, posting, messaging
- Inactive timeout for security
- Resets when you perform any action

---

## Session Management

View and control all your active login sessions across devices and locations.

### Viewing Active Sessions

**Access Session Management:**
1. Go to Profile > Settings
2. Click "Security" or "Account"
3. Scroll to "Active Sessions"
4. See list of all active logged-in sessions

**Session Information Displayed:**
- Device type: Browser, mobile app, desktop app
- Browser name: Chrome, Firefox, Safari, Edge
- Operating system: Windows, macOS, iOS, Android
- Approximate location: City, Country
- Last activity: When session was last used
- IP address: Network location (partial, masked for privacy)
- Date logged in: When session was created

**Example Session Entry:**
```
Chrome on Windows 10 | New York, USA
Last active: Just now
192.168.*.* | Signed in: Jan 15, 2024
```

### Revoking Individual Sessions

**Why Revoke a Session:**
- Unfamiliar device or location
- Suspected account compromise
- Lost device
- Left device at someone else's place
- Unnecessary active sessions

**Steps to Revoke:**
1. Go to Settings > Security > Active Sessions
2. Find the session to revoke
3. Click "Sign Out" or "Revoke" button next to session
4. Confirm action: "Sign out this session?"
5. Session is immediately terminated
6. That device is logged out
7. All tokens for that session invalidated

**What Happens After Revocation:**
- Device is logged out immediately
- User on that device needs to log in again
- Previous session data cleared
- Device can log back in anytime
- Other sessions remain active

### Revoking All Sessions

**Sign Out Everywhere:**
1. Go to Settings > Security
2. Look for "Sign Out All Sessions" or "Sign Out Everywhere"
3. Click button
4. Confirmation: "This will sign you out on all devices except this one"
5. Confirm action
6. All other sessions terminated
7. Current session remains active

**Use Cases:**
- Compromised password (before changing password)
- Suspected unauthorized access
- Security audit
- Selling or giving away device
- Sharing device with someone (security measure)

### Session Notifications

**Login Notifications (if enabled):**
- Notification when account logged in from new device
- Email sent to account email address
- Shows location, device, time
- Lets you catch unauthorized logins early

**Suspicious Activity Alerts:**
- Multiple failed login attempts trigger alert
- Unusual location access triggers alert
- Email sent to alert you
- Recommend immediate action review

### Managing Session Settings

**Session Security Options:**
1. Go to Settings > Security
2. Toggle "Session notifications on new device login"
3. Toggle "Require 2FA for all logins"
4. Set "Automatic logout after inactivity"
   - Options: 15 min, 1 hour, 8 hours, 24 hours, never
   - Recommended: 1 hour for security

**Remember Me Settings:**
1. On login page, checkbox for "Remember me on this device"
2. Keeps you logged in for 30 days
3. Only use on devices you personally own
4. Checkbox for "Require 2FA even with remember me"
   - Adds security even with remember me enabled

---

## Account Deletion

Permanently delete your Milonexa account and all associated data.

### Important Information About Deletion

**Before Deleting, Understand:**
- Deletion is **permanent and irreversible**
- Cannot recover account after deletion
- All data permanently removed from servers
- Account username becomes available for reuse
- Posted content may remain if referenced elsewhere
- No refunds for purchased items

### Data Export (GDPR Compliance)

**Before deleting, you can export your data:**

**What Data Is Included:**
- All posts and comments
- Messages and conversations
- Friends list and connections
- Profile information
- Settings and preferences
- Photos and videos you uploaded
- Bookmarks and saved posts
- Groups you've joined
- Pages you follow
- Shop orders and purchases

**How to Export:**

1. **Initiate Export**
   - Go to Settings > Account
   - Click "Download My Data" or "Export Data"
   - Button description: "Get a copy of your data"

2. **Confirm Export Request**
   - Click "Start Export"
   - Message: "We'll email you a download link within 24 hours"
   - Email sent to your account email

3. **Wait for Email**
   - Check email for "Your Milonexa data is ready"
   - Subject: "Download your Milonexa data export"
   - Email contains download link
   - Link valid for 7 days

4. **Download and Save**
   - Click download link in email
   - File downloads as JSON archive
   - File name: `milonexa-export-[username]-[date].json`
   - Save to secure location (external drive, cloud storage)
   - File size varies by account size (MB to GB)

5. **Verify Data**
   - Extract JSON file
   - Open in text editor or JSON viewer
   - Verify all your data is present
   - Keep secure copy for records

**Export Format:**
- JSON (JavaScript Object Notation)
- Compatible with any text editor
- Can be imported to other platforms if they support it
- Human-readable format

### Account Deletion Process

**Step 1: Access Deletion Page**
1. Go to Profile > Settings
2. Scroll to bottom: "Delete Account"
3. Click "Delete Account" or "Permanently Delete"
4. Warning message appears with important information

**Step 2: Understand Consequences**
- Read: "This action cannot be undone"
- Understand all data will be deleted
- Know username becomes available
- Understand posted content removal details
- No automatic refunds

**Step 3: Enter Password**
- For security verification
- Type your account password
- Must be correct to proceed
- If 2FA enabled, also enter TOTP code

**Step 4: Confirm Email**
- Email confirmation sent to account email
- Check email for "Confirm Account Deletion"
- Click confirmation link
- Link valid for 24 hours

**Step 5: Final Confirmation**
- Click link in email
- Taken to deletion confirmation page
- Read final warning message
- Click "Yes, delete my account permanently"
- Enter account email to confirm (proof you have access)

**Step 6: Deletion Complete**
- Account is deleted
- All data permanently removed
- Confirmation email sent
- Session logged out
- Cannot log back in

### Deleting Without Password Reset

**If You Forgot Your Password:**
1. Go to account deletion page
2. Click "Forgot password?" or similar option
3. Complete password reset via email
4. Password updated
5. Use new password for account deletion

**Alternative:**
1. Use "Forgot Password" to reset password
2. Log in with new password
3. Complete account deletion

### Data After Deletion

**What Happens to Your Content:**
- Posts deleted from feed and your profile
- Comments deleted from other posts
- Messages deleted from conversations
- Photos deleted from timeline
- Videos deleted from library
- Groups membership removed
- Friend connections severed

**Exceptions:**
- Some content may be cached by third parties
- If content was shared/reposted, it may remain elsewhere
- Archived content (downloads by others) cannot be removed
- Search engine caches may retain copies (will eventually disappear)

**What Doesn't Happen:**
- Messages deleted from recipients' inboxes (they have copy)
- Comments remaining if thread continued without you
- Quoted posts or mentions
- Screenshots taken by others

### Account Recovery

**Once Deleted:**
- Account cannot be recovered
- Same email cannot be used for 30 days (cleanup period)
- After 30 days, same email can register new account
- Previous account data is gone forever

**If You Delete by Mistake:**
1. Contact support@milonexa.com immediately
2. Within 24 hours, may be able to restore
3. After 24 hours, restoration impossible
4. Provide account details and reason

---

## Security Best Practices

Follow these recommendations to keep your Milonexa account secure.

### Password Security

**Strong Passwords:**
- Use 12+ characters (more is better)
- Include uppercase, lowercase, numbers, special characters
- Don't use sequential numbers or keyboard patterns (123456, qwerty)
- Use passphrases: "BlueCat@Sunrise2024" is stronger than "P@ssw0rd"
- Unique per site (don't reuse passwords)
- Use password manager to store securely

**Password Management:**
- Store in password manager (1Password, Bitwarden, LastPass)
- Never write passwords on paper
- Never share via email or messaging
- Never use birthdate or personal information
- Change immediately if suspected compromise
- Never accept password requests from "support"

### Multi-Factor Authentication

**Enable 2FA:**
- Use authenticator app (Google Authenticator, Authy)
- Don't rely on SMS alone (more secure with TOTP)
- Save backup codes in secure location
- Regenerate backup codes every year
- Test backup code access method

**Backup Codes:**
- Store securely in password manager
- Never email to yourself
- Never share with anyone
- Keep multiple copies in safe locations
- Regenerate after use

### Device Security

**Browser Security:**
- Keep browser updated to latest version
- Use HTTPS only (look for lock icon)
- Never ignore SSL certificate warnings
- Enable browser built-in security features
- Clear browser cookies/cache regularly

**Device Updates:**
- Install operating system updates immediately
- Update browser and apps regularly
- Enable automatic updates when possible
- Install security patches as soon as available
- Use antivirus/antimalware software

**Shared Devices:**
- Don't use "Remember Me" on shared computers
- Always log out when finished
- Use private/incognito browsing
- Never save passwords in browser
- Clear browsing history

### Email Security

**Protect Your Email:**
- Strong, unique password for email account
- Enable 2FA on email account
- Recovery phone number and backup email added
- Regularly check email account activity
- Review connected apps and revoke unnecessary access

**Email is Critical:**
- Email is your account recovery method
- If email compromised, account compromised
- Always protect email account first
- Monitor email for suspicious activity

### Social Engineering Protection

**Common Scams:**
- Phishing emails claiming to be from Milonexa
- Fake login pages
- "Verify your account" messages
- Requests for personal information
- Offers for free premium features

**Stay Safe:**
- Milonexa never asks for password via email
- Always navigate to milonexa.com directly (don't click links)
- Verify sender email address (must be @milonexa.com domain)
- Don't click suspicious links
- Don't download files from unknown sources
- Check profile privacy settings
- Be cautious with friend requests from strangers

### Account Monitoring

**Regular Security Checks:**
1. Monthly: Review active sessions
2. Monthly: Check for suspicious activity
3. Monthly: Verify connected apps and integrations
4. Quarterly: Review privacy settings
5. Quarterly: Backup your account data
6. Yearly: Regenerate backup codes
7. Yearly: Change password

**What to Monitor:**
- Active sessions list for unknown devices
- Failed login attempts
- Password change history
- Connected OAuth accounts
- Email forwarding rules
- Recovery contact information

**Suspicious Activity Indicators:**
- Posts or messages you didn't write
- Followers you don't recognize
- Messages from account to unknown contacts
- Password changed without your action
- Email account compromised notice
- 2FA disabled without your action

### Breach Response

**If You Suspect Compromise:**

1. **Immediate Actions (within 1 hour):**
   - Change password immediately
   - Enable 2FA if not already enabled
   - Review active sessions and revoke suspicious ones
   - Check email account recovery methods

2. **Short-term (within 24 hours):**
   - Check for unauthorized posts/messages
   - Review and update privacy settings
   - Scan device with antivirus software
   - Check for malware

3. **Medium-term (within 1 week):**
   - Change passwords on related accounts
   - Monitor email for suspicious activity
   - Check credit monitoring if you have payment methods on file
   - Consider password manager change

4. **Contact Support:**
   - Email support@milonexa.com with details
   - Report unauthorized activity
   - Request support for compromised account
   - Follow up on investigation

### Privacy and Data Protection

**Privacy Settings:**
- Review who can see your profile
- Control who can message you
- Set post visibility defaults
- Review group memberships
- Check linked OAuth accounts

**Data Sharing:**
- Disable unnecessary integrations
- Review app permissions
- Don't share data export outside secure channels
- Use privacy-focused browser when possible
- Consider using VPN for public WiFi

**Third-Party Apps:**
- Review permissions carefully before authorizing
- Use reputable apps only
- Revoke access to unused apps
- Check app privacy policies
- Don't authorize apps you don't recognize

### Resources and Support

**Security Help:**
- Documentation: https://milonexa.com/docs/security
- Support: support@milonexa.com
- Security team: security@milonexa.com
- Report vulnerabilities: security@milonexa.com

**Additional Resources:**
- Enable 2FA: Settings > Security > Two-Factor Authentication
- Manage sessions: Settings > Security > Active Sessions
- Export data: Settings > Account > Download My Data
- Privacy settings: Settings > Privacy
- Security settings: Settings > Security

Remember: Your security is your responsibility. Stay vigilant and follow these best practices to keep your account safe.
