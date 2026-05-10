# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** None detected.
**E2E:** None detected.
**Coverage:** None detected.

The project currently has no `test`, `typecheck`, or `coverage` script in `package.json`, and no test files were found during initial mapping.

## Test Organization

**Location:** No test directory or test file pattern is currently established.
**Naming:** No observed convention.
**Structure:** No observed convention.

## Testing Patterns

### Unit Tests

**Approach:** Not established.
**Location:** Not established.

Recommended first candidates once a test stack is chosen:

- Zod schema validation in `src/app/lib/schemas.ts`.
- Role-specific payload builders, if extracted from the registration page.
- Reusable UI components with predictable interactions.

### Integration Tests

**Approach:** Not established.
**Location:** Not established.

Recommended candidates:

- API route handlers for login, registration, and materials with mocked backend fetch calls.
- NextAuth credential behavior if authentication bugs appear.

### E2E Tests

**Approach:** Not established.
**Location:** Not established.

Recommended candidates:

- Login redirect flow.
- Registration flow for generator and collector.
- Collection request creation once submit integration exists.

## Test Execution

**Commands:**

- Lint: `npm run lint`
- Build: `npm run build`

**Configuration:**

- ESLint config: `eslint.config.mjs`
- TypeScript config: `tsconfig.json`

## Coverage Targets

**Current:** No measurable automated coverage.
**Goals:** Not documented.
**Enforcement:** Not automated.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| --- | --- | --- | --- |
| Zod schemas | Unit | Not established | Not established |
| API route handlers | Integration/unit with fetch mocks | Not established | Not established |
| Auth pages | Component or E2E | Not established | Not established |
| Dashboard cards | Component | Not established | Not established |
| Collection request flow | E2E after backend contract is known | Not established | Not established |

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| Lint | Yes | Static analysis only | `npm run lint` runs `eslint` |
| Build | Usually yes in CI, not parallel with itself | Next.js build output writes to `.next` | `npm run build` runs `next build` |
| Automated tests | Unknown | No framework configured | No test files or test script detected |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After documentation or small UI changes | `npm run lint` |
| Build | After behavior changes or before handoff | `npm run build` |
| Full | After test infrastructure exists | Not established |
