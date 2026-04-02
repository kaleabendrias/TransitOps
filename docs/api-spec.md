# API Specification

## 1. Scope
This project does not expose a public HTTP REST API. Instead, it defines internal TypeScript service interfaces consumed by the Svelte presentation layer. This document specifies the internal application APIs and expected behavior.

## 2. API Style
- Interface-driven service contracts.
- Promise-based asynchronous methods for persistence and orchestration.
- Domain DTOs validated at service boundaries.
- Authorization checks executed before state mutation.

## 3. Core Service Domains

### 3.1 Authentication and Authorization
Responsibilities:
- Register users under allowed role constraints.
- Authenticate sessions.
- Enforce role-based permissions for protected workflows.

Representative operations:
- register(credentials, role)
- login(username, password)
- logout(sessionId)
- assertPermission(user, action)

### 3.2 Seat and Venue Management
Responsibilities:
- Manage venue and seat entities.
- Apply assignment and swap operations with conflict checks.
- Support seat map and trip related workflows.

Representative operations:
- createSeat(payload)
- assignSeat(userId, seatId)
- swapSeats(sourceSeatId, targetSeatId)
- getSeatMap(venueId)

### 3.3 Scoring and Review
Responsibilities:
- Compute and persist scoring outcomes.
- Control second-review queue transitions.
- Track status and grading configuration impacts.

Representative operations:
- calculateScore(input)
- submitReview(reviewPayload)
- enqueueSecondReview(itemId)
- updateGradingConfig(config)

### 3.4 Notifications and Preferences
Responsibilities:
- Manage notification subscriptions.
- Enforce notification authorization and quiet-hours policy.
- Apply user-scoped preferences.

Representative operations:
- subscribe(userId, channel)
- sendNotification(event)
- setPreferences(userId, prefs)
- getPreferences(userId)

### 3.5 Import/Export and Audit
Responsibilities:
- Validate import schema and semantic integrity.
- Export and import encrypted datasets.
- Record auditable activities.

Representative operations:
- exportEncrypted(options)
- importData(file)
- validateSchema(payload)
- appendAuditLog(entry)

## 4. Error Model
Internal APIs should return typed errors (or throw typed exceptions) for:
- Authentication failures
- Authorization denials
- Validation and schema violations
- Concurrency/hold conflicts
- Data integrity or tamper detection concerns

Errors should be deterministic and suitable for test assertions.

## 5. Persistence Contracts
Adapters abstract persistence targets:
- IndexedDB adapter
- LocalStorage adapter

Both adapters must satisfy the same repository contract semantics to ensure portability and predictable behavior under tests.

## 6. Security Requirements
- No insecure cryptographic fallback paths.
- Encrypted-at-rest behavior for protected data.
- Per-user data isolation for sensitive artifacts.
- Auditability of privileged operations.

## 7. Compatibility and Versioning
Internal API contracts should follow semantic change control:
- Backward-compatible updates for additive features.
- Coordinated refactors when contract signatures change.
- Test suite updates required for any behavior-impacting modifications.
