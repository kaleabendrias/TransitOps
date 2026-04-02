# Questions and Clarifications

## Q1. How is the very first Administrator account created in a pure-frontend system?
**Answer:** The prompt defines roles but does not specify bootstrap mechanics for admin identity. We implemented a controlled bootstrap path (`createAdmin`) and enforced admin-only visibility for privileged user-management actions afterward.

## Q2. What are the exact seat-hold ownership rules across tabs/users?
**Answer:** The prompt states a 10-minute hold with auto-release, but not owner semantics. We implemented strict ownership: only the hold owner can release/confirm it, duplicate holds on the same seat are rejected, and stale holds are auto-expired before allowing a new hold.

## Q3. How strict should effective date validation be for Association Configuration?
**Answer:** The prompt specifies `MM/DD/YYYY` format, but not malformed or impossible dates. We implemented strict validation (including impossible dates like Feb 30), and we reject ranges where end date is earlier than start date.

## Q4. What should happen to notifications during quiet hours?
**Answer:** The prompt defines quiet hours and retries but does not define immediate delivery behavior during quiet windows. We implemented a queue-first rule: notifications become `pending` during quiet hours, recipient preferences (not sender context) drive the decision, and rate limits still apply.

## Q5. What is the terminal retry/dead-letter policy?
**Answer:** The prompt says 3 attempts and dead-letter inbox, but not transition detail. We implemented deterministic transitions where failures increment retry count up to 3, then status becomes `dead_letter`; once dead-lettered, the item is no longer retryable.

## Q6. How is final score resolved when second review is required?
**Answer:** The prompt requires second review for score deltas above 10 points, but does not define reconciliation. We implemented score reconciliation as an average of primary and second-review scores, with manual grading rounded to nearest 0.5 as configured.

## Q7. How strict should import integrity checks be, and what about unknown stores?
**Answer:** The prompt requires schema validation and SHA-256 tamper detection, but not handling for extra stores. We implemented hard rejection for fingerprint mismatches (tamper detected) and soft error reporting for unknown stores so valid known data can still be processed safely.
