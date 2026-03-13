# Release Process

Standard process for planning, validating, and shipping production releases.

## Release cadence

- Minor/feature releases: scheduled cadence
- Patch/hotfix releases: as needed

## Release stages

1. Scope and risk assessment
2. Branch readiness and quality gate pass
3. Staging verification
4. Production rollout
5. Post-release verification
6. Release notes + changelog publication

## Pre-release checklist

- [ ] CI quality gates passing
- [ ] Critical-path suite reviewed
- [ ] Security audit reviewed
- [ ] Migration notes prepared (if schema/API changes)
- [ ] Rollback plan confirmed

## Rollout strategy

Use one of:

- rolling update,
- canary rollout,
- blue/green switch.

Choose based on blast radius and rollback complexity.

## Post-release checks

- [ ] Health endpoints all green
- [ ] Error and latency budget stable
- [ ] Core user journeys validated
- [ ] Incident-free observation window completed

## Release notes format

Use this structure:

- Summary
- What changed
- Risk and mitigations
- Required actions (operators/developers)
- Rollback notes

Template:

- `docs/development/RELEASE_NOTES_TEMPLATE.md`

## Related docs

- `docs/development/CHANGELOG_POLICY.md`
- `docs/development/RELEASE_NOTES_TEMPLATE.md`
- `docs/deployment/OPERATIONS_RUNBOOK.md`
- `docs/deployment/DISASTER_RECOVERY.md`
