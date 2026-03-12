# Content Moderation Guide

> **Comprehensive guide for moderating content and maintaining a healthy platform community**

## Table of Contents

1. [Overview](#overview)
2. [Moderation Philosophy](#moderation-philosophy)
3. [Content Policies](#content-policies)
4. [Flag Review System](#flag-review-system)
5. [Moderation Actions](#moderation-actions)
6. [Automated Moderation](#automated-moderation)
7. [Appeal Process](#appeal-process)
8. [Best Practices](#best-practices)
9. [Common Scenarios](#common-scenarios)

---

## Overview

Content moderation ensures the platform remains safe, respectful, and valuable for all users.

### Moderation Goals

1. **Safety:** Protect users from harmful content
2. **Quality:** Maintain high-quality discussions
3. **Compliance:** Follow legal requirements
4. **Growth:** Foster healthy community
5. **Balance:** Allow free expression within rules

### Who Can Moderate

| Role | Capabilities |
|------|-------------|
| **Admin** | Full moderation powers, policy changes, appeals |
| **Moderator** | Review flags, remove content, issue warnings |
| **User** | Report content (flag system) |

---

## Moderation Philosophy

### Core Principles

1. **Context Matters**
   - Consider full conversation
   - Review user history
   - Understand cultural differences
   - Intent vs impact

2. **Transparency**
   - Clear communication
   - Explain decisions
   - Consistent application
   - Public guidelines

3. **Proportional Response**
   - Warning → Removal → Suspension → Ban
   - Match action to severity
   - Allow for improvement
   - Document escalation

4. **Fairness**
   - Apply rules equally
   - No favoritism
   - Review appeals fairly
   - Admit mistakes

### Moderation Spectrum

```
Allow Freely ←―――――――――――――――――――――――――→ Remove Immediately
    
    ↑              ↑           ↑               ↑
  Healthy      Gray Zone    Violates      Illegal/
  Content                   Policy        Harmful
```

---

## Content Policies

### Prohibited Content

#### 1. ❌ Illegal Content
**Remove immediately, report to authorities**

- Child exploitation material
- Terrorism promotion
- Illegal drugs sales
- Stolen goods sales
- Fraud and scams
- Copyright infringement (with valid DMCA)

**Action:** Immediate removal + ban + legal report

#### 2. ❌ Violence & Threats
**Remove and review for ban**

- Direct threats to individuals
- Incitement to violence
- Graphic violence (no educational context)
- Self-harm promotion
- Detailed harm instructions

**Action:** Remove + warning/ban based on severity

#### 3. ❌ Harassment & Bullying
**Remove, warn, or ban based on severity**

- Targeted harassment
- Doxxing (sharing private info)
- Hate speech
- Sustained bullying campaigns
- Brigading coordination

**Action:** Remove + warning or ban

#### 4. ❌ Spam & Manipulation
**Remove and monitor for patterns**

- Repetitive commercial posts
- Bot-like behavior
- Vote manipulation
- Fake engagement
- Misleading links

**Action:** Remove + warning/ban

#### 5. ❌ Sexual Content
**Remove if explicit or non-consensual**

- Pornographic content
- Sexual solicitation
- Non-consensual intimate images
- Sexual content involving minors

**Action:** Immediate removal + ban

#### 6. ⚠️ Misinformation
**Context-dependent**

- Dangerous false health claims
- Election misinformation
- Deepfakes without disclosure
- Conspiracy theories (case by case)

**Action:** Label, remove if dangerous, or allow with context

### Allowed Content (Even If Controversial)

✅ **Generally Allowed:**
- Political opinions and debate
- Religious discussions
- Satire and parody
- News and current events
- Scientific discussions
- Artistic expression
- Criticism of public figures
- Unpopular opinions

**Guidelines:**
- Must follow community standards
- No personal attacks
- No calls for violence
- No harassment
- Factual accuracy appreciated

---

## Flag Review System

### Understanding Flags

**Flag (Report):** User-submitted report of problematic content

**Flag Structure:**
```javascript
{
  id: 12345,
  contentType: "post",      // post, comment, message
  contentId: 67890,
  reporterId: 111,
  reason: "harassment",
  description: "User is repeatedly attacking me",
  status: "pending",        // pending, reviewed, resolved
  createdAt: "2026-03-09T10:00:00Z"
}
```

### Flag Categories

1. **Spam or Scam**
   - Commercial spam
   - Phishing attemptss
   - Repetitive content
   
2. **Harassment or Hate**
   - Personal attacks
   - Hate speech
   - Bullying

3. **Violence or Threats**
   - Threats to harm
   - Graphic violence
   - Incitement

4. **Illegal Content**
   - Child exploitation
   - Drug sales
   - Stolen goods

5. **Misinformation**
   - False health claims
   - Election misinformation
   - Deepfakes

6. **Sexual Content**
   - Pornography
   - Sexual solicitation
   - NCII (non-consensual intimate images)

7. **Other**
   - Copyright
   - Privacy violation
   - Off-topic

### Flag Review Process

**Step-by-Step:**

1. **Navigate to Moderation Tab**
   ```
   Admin Dashboard → Moderation → Pending Flags
   ```

2. **Select Flag to Review**
   - View flagged content
   - Read reporter's reason
   - Check context (surrounding comments, post history)

3. **Gather Context**
   ```
   - View user's post history
   - Check for previous violations
   - Review full conversation thread
   - Consider cultural context
   ```

4. **Make Decision**
   - **Approve:** Content is fine, dismiss flag
   - **Remove:** Content violates policy
   - **Remove + Warn:** Remove and warn user
   - **Remove + Ban:** Remove and ban user

5. **Take Action**
   - Execute decision
   - Add moderation note
   - Notify user (optional)
   - Update flag status to "resolved"

6. **Document**
   ```javascript
   {
     action: "removed",
     reason: "Violated harassment policy",
     moderator: "mod_jane",
     notes: "Repeated personal attacks after warning"
   }
   ```

### Flag Priority Levels

**Critical (Review Immediately):**
- Illegal content
- Direct threats
- Child safety
- Ongoing harassment

**High (Review within 2 hours):**
- Hate speech
- Graphic violence
- Sexual content
- Doxxing

**Medium (Review within 24 hours):**
- Spam
- Misinformation
- General harassment
- Off-topic content

**Low (Review within 72 hours):**
- Minor rule violations
- Duplicate flags
- Unclear violations

---

## Moderation Actions

### Available Actions

#### 1. Dismiss Flag
**When:** Content doesn't violate policies

**Process:**
```
Flag → Review → Approve → Dismiss
```

**Notify:** (Optional) Reporter that content doesn't violate rules

#### 2. Remove Content
**When:** Content violates policies but user may not know

**Process:**
```
Flag → Review → Remove Content → Notify User
```

**Template:**
```
Your [post/comment] was removed because it violated our policy on [reason].
Please review our Community Guidelines.
You can edit and repost if you remove the violating content.
```

#### 3. Remove Content + Warning
**When:** Clear violation, first offense

**Process:**
```
Flag → Review → Remove + Warning → Log
```

**Template:**
```
Your content was removed for [reason].
This is a formal warning. Future violations may result in suspension or ban.
Please review Community Guidelines: [link]
```

**Consequences:**
- Content removed
- User notified
- Warning logged
- Affects future moderation decisions

#### 4. Remove Content + Temporary Ban
**When:** Serious violation or repeated offenses

**Process:**
```
Flag → Review → Remove + Ban (7 days) → Notify
```

**Template:**
```
Your account has been temporarily suspended for 7 days.
Reason: [detailed explanation]
Your content was removed for violating [policy].
You can access your account again on [date].
If you believe this was in error, you may appeal.
```

**Consequences:**
- Content removed
- Cannot log in for duration
- All sessions terminated
- Can appeal

#### 5. Remove Content + Permanent Ban
**When:** Severe violation, illegal content, or repeated serious offenses

**Process:**
```
Flag → Review → Remove + Permanent Ban → Notify → Log → (Report to Authorities if needed)
```

**Template:**
```
Your account has been permanently banned.
Reason: [detailed explanation]
This decision is final but you may appeal within 30 days.
All your content has been [retained/removed].
```

**Consequences:**
- Account permanently disabled
- Content removed (or retained for evidence)
- Cannot create new account (IP/device ban possible)
- May be reported to authorities

#### 6. Label Content  
**When:** Misinformation or sensitive content

**Process:**
```
Flag → Review → Add Warning Label → Allow to Remain
```

**Label Examples:**
```
⚠️ This content contains unverified health claims
⚠️ This content is disputed by fact-checkers
⚠️ Graphic content - viewer discretion advised
⚠️ Satirical content
```

### Moderation Decision Tree

```
Flagged Content
    ↓
Is it illegal?
    Yes → Remove + Ban + Report to authorities
    No → Continue
    ↓
Does it violate policy?
    No → Dismiss flag
    Yes → Continue
    ↓
Is it first offense?
    Yes → Remove + Warning
    No → Continue
    ↓
Is it severe violation?
    Yes → Remove + Ban (temp or permanent)
    No → Remove + Warning
    ↓
Document and notify user
```

---

## Automated Moderation

### AI-Assisted Moderation

The platform uses AI to assist (not replace) human moderators:

**AI Capabilities:**
1. **Auto-Flag:** Automatically flag potentially violating content
2. **Priority:** Prioritize flags by severity
3. **Suggest:** Suggest moderation actions
4. **Detect:** Detect spam, bots, coordinated campaigns

**AI Features:**

```javascript
// Spam Detection
- URL spam patterns
- Repetitive text
- Bot-like posting patterns
- Fake engagement

// Hate Speech Detection
- Slurs and offensive language
- Targeted harassment patterns
- Hate symbols and dog whistles

// NSFW Detection
- Explicit images
- Suggestive content
- Age-inappropriate material
```

**Human Review Required:**
- AI suggestions are not final
- Moderator must review and make decision
- AI helps scale, humans ensure accuracy
- Context requires human judgment

### Auto-Actions

**Automatic Removal:**
- Known spam URLs (blacklist)
- Previously banned content hashes
- Illegal content (CSAM hash matching)

**Automatic Flag:**
- Detected slurs or offensive language
- High similarity to removed content
- Bot-like behavior patterns
- Mass reporting from multiple users

**Automatic Shadow-Ban:**
- Obvious bot accounts
- Spam accounts (temporary, pending review)

### Rate Limiting

**Prevents Spam:**
```javascript
// Posting Limits
- Max 10 posts per hour
- Max 50 comments per hour
- Max 100 messages per hour

// Flagging Limits
- Max 20 flags per day (prevents abuse)

// Account Creation
- Max 5 accounts per IP per day
```

---

## Appeal Process

### When Users Can Appeal

- Content removal
- Account suspension
- Permanent ban
- Warning issued

### Appeal Submission

**User Process:**
1. Receives moderation action
2. Clicks "Appeal" button
3. Fills appeal form:
   - Why they disagree
   - Additional context
   - Evidence if applicable
4. Submits appeal

**Appeal Structure:**
```javascript
{
  id: 789,
  userId: 123,
  moderationActionId: 456,
  reason: "I believe this was taken out of context...",
  evidence: "Screenshot of full conversation",
  status: "pending",
  submittedAt: "2026-03-09T12:00:00Z"
}
```

### Appeal Review

**Admin/Senior Moderator Process:**

1. **Review Appeal:**
   - Read user's explanation
   - Review original content and context
   - Check moderation notes
   - Consider additional evidence

2. **Investigate:**
   - Was policy applied correctly?
   - Was context considered?
   - Is there new information?
   - Was action proportional?

3. **Make Decision:**
   - **Uphold:** Original decision stands
   - **Partially Uphold:** Reduce penalty
   - **Overturn:** Restore content/account

4. **Communicate:**
   ```
   Appeal Decision: [Uphold/Overturn/Partial]
   
   Explanation: [Detailed reasoning]
   
   Next Steps: [What happens now]
   
   Further Appeals: [If available]
   ```

5. **Log Decision:**
   - Update audit log
   - Document reasoning
   - Mark appeal as resolved

### Appeal Timeline

```
Appeal Submitted → Review (2-5 business days) → Decision → Notification
```

**Expedited Review:**
- Account bans (review within 24 hours)
- Business accounts (review within 24 hours)
- Legal concerns (immediate review)

---

## Best Practices

### For Effective Moderation

1. **Read Full Context**
   - Don't judge by snippet alone
   - Review conversation history
   - Check user's track record
   - Consider tone and intent

2. **Document Everything**
   - Add detailed notes
   - Explain reasoning
   - Include evidence
   - Update audit log

3. **Communicate Clearly**
   - Explain specific violation
   - Reference policy
   - Provide way to improve
   - Offer appeal process

4. **Be Consistent**
   - Apply rules equally
   - Use precedent
   - Don't play favorites
   - Document exceptions

5. **Stay Professional**
   - Don't take it personally
   - Remain calm
   - Be respectful
   - Focus on behavior, not person

### For Handling Difficult Cases

**Controversial Content:**
- Consult with other moderators
- Review policy carefully
- Consider community impact
- Document decision thoroughly

**Gray Areas:**
- Err on side of allowing (unless harmful)
- Add context labels
- Monitor for escalation
- Establish clear precedent

**High-Profile Users:**
- No special treatment
- Apply same rules
- Document extra carefully
- Expect more scrutiny

**Coordinated Attacks:**
- Identify patterns
- Act on  most severe first
- Document connections
- Consider mass action

### Common Mistakes to Avoid

❌ **Don't:**
- Act on emotion
- Remove content you simply disagree with
- Ban without warning (except severe cases)
- Ignore context
- Make decisions while angry
- Respond to abusive users
- Engage in arguments

✅ **Do:**
- Take breaks if needed
- Consult other moderators
- Follow established procedures
- Document thoroughly
- Allow appeals
- Learn from mistakes
- Maintain professionalism

---

## Common Scenarios

### Scenario 1: Political Debate Gone Wrong

**Situation:** Two users arguing about politics, insults being thrown

**Assessment:**
- Is it debate or harassment?
- Are attacks personal or ideological?
- Is one user piling on?
- History of interactions?

**Action:**
```
If heated but not personal:
→ Monitor, post warning comment

If personal attacks:
→ Remove violating comments
→ Warn both users
→ Temporary mute if continues

If one-sided harassment:
→ Remove harasser's comments
→ Warn or ban harasser
→ Notify victim
```

### Scenario 2: Satire vs Misinformation

**Situation:** "News" article that's actually satire

**Assessment:**
- Is it clearly labeled as satire?
- Could it mislead readers?
- Is topic sensitive (health, elections)?
- User's intent?

**Action:**
```
If clearly satire and labeled:
→ Allow

If could mislead:
→ Add "Satirical Content" label
→ Ask user to clarify in post

If dangerous misinformation:
→ Remove + message user about clarity
```

### Scenario 3: Product Reviews (Real vs Spam)

**Situation:** Multiple similar negative reviews for product

**Assessment:**
- Are accounts new or established?
- Similar wording across reviews?
- Legitimate criticism or competitor attack?
- Any evidence of coordination?

**Action:**
```
If genuine reviews:
→ Allow all

If unclear:
→ Flag for investigation
→ Require "Verified Purchase" for new accounts

If coordinated spam:
→ Remove spam reviews
→ Ban involved accounts
→ Notify seller
```

### Scenario 4: Art vs Adult Content

**Situation:** Artistic nude photo posted

**Assessment:**
- Is it artistic or pornographic?
- Context of posting?
- Community standards?
- Age-appropriate?

**Action:**
```
If artistic merit and tasteful:
→ Allow with age-gate or warning label
→ "Artistic Nudity - 18+"

If pornographic intent:
→ Remove
→ Warn user about adult content policy

If unclear:
→ Consult with senior mod
→ Consider community standards
```

### Scenario 5: Dox Threat

**Situation:** User threatens to share another user's private info

**Assessment:**
- Is threat credible?
- Has info been shared yet?
- Is victim at risk?
- User's history?

**Action:**
```
Immediate:
→ Remove threat immediately
→ Ban user making threat
→ Notify victim
→ Document everything

Follow-up:
→ Monitor for circumvention (alt accounts)
→ Offer victim support resources
→ Consider reporting to authorities if credible danger
→ IP ban if necessary
```

---

## Appendix

### Moderation Checklist

Before taking action:

- [ ] Read full context
- [ ] Review user history
- [ ] Check for previous violations
- [ ] Consider intent vs impact
- [ ] Verify policy violation
- [ ] Choose proportional action
- [ ] Document reasoning
- [ ] Notify user (if appropriate)
- [ ] Update flag status
- [ ] Log audit trail

### Resources

- [Community Guidelines](./COMMUNITY_GUIDELINES.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [User Management](./USER_MANAGEMENT.md)
- [API Reference](../development/API.md)

### Quick Reference

```bash
# View pending flags
Admin Dashboard → Moderation Tab → Filter: Pending

# Review flag
Click flag → View content → Review context → Make decision

# Remove content
Flag Actions → Remove Content → Add reason → Confirm

# Ban user
User Actions → Ban User → Duration → Reason → Confirm

# Review appeals
Admin Dashboard → Moderation Tab → Appeals Queue
```

---

**Last Updated:** March 9, 2026
**Version:** 2.5.0
