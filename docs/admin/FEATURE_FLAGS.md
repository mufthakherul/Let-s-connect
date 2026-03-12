# Feature Flags Guide

Feature flags allow enabling and disabling platform features without code deployments, enabling gradual rollouts, A/B testing, and quick rollback.

## Overview

Feature flags stored in Redis with PostgreSQL backup:
- Fast access (Redis)
- Persistence (PostgreSQL)
- Immediate effect across all services
- No code deployment required

### Key Concepts
- **Feature Flag**: Named boolean toggle
- **Rollout Percentage**: % of users who see the feature (0-100%)
- **Target Users**: Specific user IDs who always see feature
- **Target Roles**: Apply feature to specific roles only
- **Enabled**: Feature is available
- **Disabled**: Feature unavailable to everyone (except targets)

## Feature Flag Structure

```javascript
{
  "name": "ai_chat",
  "enabled": true,
  "rolloutPercentage": 100,
  "allowedUserIds": [],
  "allowedRoles": ["user", "moderator", "admin"],
  "description": "AI chat assistant for users",
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-15T15:45:00Z"
}
```

## Managing Feature Flags

### Web Dashboard

**Access**: Settings → Feature Flags

#### List View
Table showing all feature flags:
- Feature name
- Enabled toggle (blue = enabled)
- Rollout percentage
- Target count (users/roles)
- Description
- Last modified
- Edit/Delete buttons

#### Create New Flag
1. Click "Create Flag" button
2. Enter feature name (lowercase, underscores)
3. Description
4. Enable toggle
5. Set rollout percentage (0-100%)
6. Select target roles (optional)
7. Enter target user IDs (optional, comma-separated)
8. Save

#### Edit Flag
1. Click "Edit" button
2. Modify settings
3. Changes take effect immediately
4. No deployment needed

### CLI

#### List flags
```bash
milonexa> features list

Output:
┌─────────────────────┬────────┬──────────────┬─────────────────┐
│ Feature             │ Status │ Rollout %    │ Target Users    │
├─────────────────────┼────────┼──────────────┼─────────────────┤
│ ai_chat             │ ON     │ 100%         │ All users       │
│ new_ui_design       │ ON     │ 50%          │ Beta testers    │
│ semantic_search     │ OFF    │ 0%           │ None            │
│ shop                │ ON     │ 100%         │ All users       │
│ streaming           │ ON     │ 100%         │ All users       │
│ meetings            │ ON     │ 75%          │ None            │
└─────────────────────┴────────┴──────────────┴─────────────────┘
```

#### Enable feature
```bash
milonexa> features enable ai_chat

Output:
✓ Feature enabled
  Feature: ai_chat
  Rollout: 100%
  Enabled for: All users
```

#### Disable feature
```bash
milonexa> features disable semantic_search

Output:
✓ Feature disabled
  Feature: semantic_search
  Rollout: 0%
```

#### Gradual rollout
```bash
milonexa> features rollout new_ui_design --percentage 50

Output:
✓ Rollout updated
  Feature: new_ui_design
  Rollout: 50%
  Approximately 500,000 users affected
  Progress: 10% → 50% (new 400,000 users getting feature)
```

### REST API

#### List flags
```bash
GET /api/admin/features
Authorization: Bearer <admin_token>

Response:
[
  {
    "name": "ai_chat",
    "enabled": true,
    "rolloutPercentage": 100,
    "allowedUserIds": [],
    "allowedRoles": ["user", "moderator", "admin"],
    "description": "AI chat assistant"
  },
  ...
]
```

#### Get single flag
```bash
GET /api/admin/features/ai_chat
```

#### Create/Update flag
```bash
PUT /api/admin/features/ai_chat
{
  "enabled": true,
  "rolloutPercentage": 75,
  "allowedUserIds": [],
  "allowedRoles": ["user"],
  "description": "AI chat for regular users"
}
```

#### Delete flag
```bash
DELETE /api/admin/features/ai_chat
```

## Built-In Feature Flags

### Platform Features

#### ai_chat
**Description**: AI chat assistant for users
**Default**: Enabled 100%
**Impact**: Users can chat with AI, get responses
**Status**: Stable

#### ai_moderation
**Description**: AI-based content moderation
**Default**: Enabled 100%
**Impact**: Auto-flag inappropriate content
**Status**: Stable

#### ai_search
**Description**: Semantic search powered by AI
**Default**: Disabled 0%
**Impact**: Natural language search vs keyword
**Status**: Beta

#### new_ui_design
**Description**: Redesigned user interface
**Default**: Enabled 50%
**Impact**: New visual design and layout
**Status**: Rolling out

#### shop
**Description**: Marketplace and shopping
**Default**: Enabled 100%
**Impact**: Users can browse/purchase products
**Status**: Production

#### streaming
**Description**: TV and radio streaming
**Default**: Enabled 100%
**Impact**: Access to streaming services
**Status**: Production

#### meetings
**Description**: Video meeting capabilities
**Default**: Enabled 100%
**Impact**: Users can create/join meetings
**Status**: Production

#### collaboration
**Description**: Document editing, wikis, tasks
**Default**: Enabled 100%
**Impact**: Collaborative tools available
**Status**: Production

#### push_notifications
**Description**: Web push notifications
**Default**: Enabled 100%
**Impact**: Users receive push alerts
**Status**: Stable

#### social_graph_ranking
**Description**: Rank feed by social graph
**Default**: Enabled 75%
**Impact**: Show posts from close connections first
**Status**: Testing

## Rollout Strategies

### Immediate Rollout
Enable for 100% immediately:
```bash
milonexa> features enable new_feature
```

Use when:
- Feature is well-tested
- Low-risk feature
- Important security fix
- Bug fix

### Canary Rollout (Gradual)
1. Enable for 5% (early adopters, beta testers)
2. Monitor for errors, user reports
3. Wait 24 hours
4. If stable, increase to 25%
5. Monitor another day
6. Increase to 75%
7. Final push to 100%

Timeline: 3-5 days total

```bash
Day 1, 10am: features rollout feature_name --percentage 5
Day 1, 6pm: Check logs, alerts, user feedback - All good ✓

Day 2, 10am: features rollout feature_name --percentage 25
Day 2, 6pm: Monitor metrics - Stable ✓

Day 3, 10am: features rollout feature_name --percentage 75
Day 3, 6pm: Light monitoring - All good ✓

Day 4, 10am: features rollout feature_name --percentage 100
```

### Targeted Rollout
Enable only for specific users:
1. Create flag
2. Set rollout to 0%
3. Add specific user IDs to allowedUserIds
4. Gradually add more users
5. Once tested, increase rollout percentage

```bash
milonexa> features create expensive_feature
# Add beta tester user IDs manually
# Monitor for days/weeks
# Then increase rollout percentage
```

### Role-Based Rollout
Enable only for specific roles:
1. Create flag
2. Set allowedRoles = ["admin", "moderator"]
3. Only admins/moderators see feature
4. Perfect for internal tools, admin features

## A/B Testing

### Running Experiment
1. Create two versions of feature
2. Assign feature_v1 to 50% via hash
3. Assign feature_v2 to other 50% via hash
4. Track metrics for each group
5. Compare results

```javascript
// In application code
if (featureFlags.isEnabled('new_checkout_v1', userId)) {
  // Show checkout v1 to 50% of users
  checkout_v1();
} else if (featureFlags.isEnabled('new_checkout_v2', userId)) {
  // Show checkout v2 to other 50%
  checkout_v2();
}
```

### Determining Winner
- Measure conversion rate per version
- Measure user satisfaction
- Statistical significance (minimum sample size)
- Business impact (revenue, retention)

## Code Integration

### Checking Feature Flags

#### JavaScript/Node.js
```javascript
const FeatureFlags = require('./shared/feature-flags');

if (await FeatureFlags.isEnabled('ai_chat', userId)) {
  // Feature enabled for this user
  enableAIChat();
} else {
  // Feature disabled
  disableAIChat();
}
```

#### Python (via API)
```python
import requests

response = requests.get(
  'http://localhost:8000/api/features/ai_chat',
  params={'userId': user_id}
)
enabled = response.json()['enabled']
```

#### Frontend (React)
```javascript
import useFeatureFlag from './hooks/useFeatureFlag';

function MyComponent() {
  const aiChatEnabled = useFeatureFlag('ai_chat');
  
  return (
    <div>
      {aiChatEnabled && <AIChat />}
      {!aiChatEnabled && <ErrorMessage>Feature not available</ErrorMessage>}
    </div>
  );
}
```

### Performance Consideration
Feature flag checks are fast (Redis lookup):
- Typical response time: <5ms
- Cached in application memory
- Updates distributed via pub/sub

## Removing Feature Flags

Once feature is stable and rolled out 100%:
1. Consider removing flag from code
2. Keep flag in admin system (toggle off = disable feature)
3. Or delete flag entirely if feature is core

To disable feature without code change:
```bash
milonexa> features disable feature_name
```

## Safety and Rollback

### Quick Rollback
If issues detected:
```bash
milonexa> features disable problem_feature
# Feature immediately unavailable for new requests
# In-flight requests may still use old feature flag value
# Max impact: 30 seconds before all request see flag disabled
```

### Gradual Rollback
If you want to reduce exposure:
```bash
milonexa> features rollout problem_feature --percentage 10
# Reduce from 100% to 10% immediately
# Users randomly assigned may see feature toggle off
```

## Monitoring Feature Flags

### Check Feature Status
```bash
milonexa> features list --format json | jq '.[] | select(.name == "ai_chat")'

Output:
{
  "name": "ai_chat",
  "enabled": true,
  "rolloutPercentage": 100,
  "allowedUserIds": [],
  "allowedRoles": ["user", "moderator", "admin"],
  "description": "AI chat assistant for users"
}
```

### Audit Log
All feature flag changes logged:
```bash
milonexa> system audit --search "feature flag"

Output:
2024-12-15 15:42:00 | administrator | feature_flag_updated | ai_chat
  Previous: enabled=true, rollout=50%
  Current: enabled=true, rollout=75%
```

## Best Practices

1. **Use Meaningful Names**: `ai_chat` (good) vs `feature_x` (bad)
2. **Add Descriptions**: Document what the feature does
3. **Test in Staging**: Enable flag in test environment first
4. **Monitor Metrics**: Watch error rates and latency
5. **Set Alerts**: Alert if feature causes issues
6. **Document in Code**: Comment flag dependency
7. **Remove Old Flags**: Delete flags after fully rolled out/deprecated
8. **Version API Changes**: If API changes with feature, handle both versions
9. **Plan Rollback**: Always have rollback plan before enabling
10. **Communicate**: Notify team of ongoing rollouts

---

Last Updated: 2024 | Milonexa Platform Documentation
