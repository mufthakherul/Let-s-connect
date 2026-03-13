# API Lifecycle Standards

Defines how APIs are designed, versioned, released, deprecated, and retired in Let-s-connect.

## Principles

1. **Backward compatibility first** for non-breaking enhancements.
2. **Explicit versioning** for breaking changes.
3. **Observability required** for all production API surfaces.
4. **Consumer communication** before deprecation/removal.
5. **Contract tests** for gateway-to-service compatibility.

## API versions

- Current production baseline: **v2**.
- Clients should send `X-API-Version: v2` where applicable.
- New endpoints default to v2 behavior unless approved otherwise.

## Change categories

### Non-breaking

- Additive response fields
- New optional request fields
- New endpoints/resources
- Performance or observability improvements

### Breaking

- Removing or renaming fields
- Changing field semantics/types
- Tightening validation in incompatible ways
- Behavior changes that alter client assumptions

Breaking changes require:

- design review,
- ADR entry,
- migration plan,
- deprecation notice,
- timeline and rollback criteria.

## API change workflow

1. Propose change and classify (breaking/non-breaking).
2. Update OpenAPI/route docs and examples.
3. Add/adjust unit, integration, and contract tests.
4. Validate through critical-path and CI gates.
5. Publish release notes + changelog entry.
6. Monitor production metrics and errors post-release.

## Deprecation policy

For deprecated endpoints/fields:

- Add deprecation note to docs.
- Emit deprecation headers where possible.
- Provide migration instructions and replacement APIs.
- Maintain deprecation window appropriate to impact.

Recommended deprecation metadata (HTTP response headers):

- `Deprecation: true`
- `Sunset: <RFC-1123-date>`
- `Link: <migration-doc-url>; rel="deprecation"`

## API quality gates

Minimum quality requirements before merge:

- [ ] Docs updated (`API_REFERENCE.md` + relevant service docs)
- [ ] Tests updated (unit/integration/contract)
- [ ] Error shape unchanged or explicitly versioned
- [ ] Monitoring and logs validated
- [ ] Changelog/release notes updated

## Error contract

All APIs should preserve a predictable envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation"
  }
}
```

## Ownership

API changes must identify:

- owning service team,
- approval reviewers,
- on-call impact,
- rollback owner.

See `docs/deployment/SERVICE_OWNERSHIP_ONCALL.md`.
