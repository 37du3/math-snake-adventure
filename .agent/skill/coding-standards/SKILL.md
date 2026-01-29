---
name: coding-standards
description: Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, and Node.js development.
---

# Coding Standards & Best Practices

Universal coding standards applicable across all projects.

## Code Quality Principles

### 1. Readability First
- Code is read more than written
- Clear variable and function names
- Self-documenting code preferred over comments
- Consistent formatting

### 2. KISS (Keep It Simple, Stupid)
- Simplest solution that works
- Avoid over-engineering
- No premature optimization
- Easy to understand > clever code

### 3. DRY (Don't Repeat Yourself)
- Extract common logic into functions
- Create reusable components
- Share utilities across modules
- Avoid copy-paste programming

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features before they're needed
- Avoid speculative generality
- Add complexity only when required
- Start simple, refactor when needed

## TypeScript/JavaScript Standards

### Variable Naming

```typescript
// ✅ GOOD: Descriptive names
const marketSearchQuery = 'election'
const isUserAuthenticated = true
const totalRevenue = 1000

// ❌ BAD: Unclear names
const q = 'election'
const flag = true
const x = 1000
```

### Function Naming

```typescript
// ✅ GOOD: Verb-noun pattern
async function fetchUserData(userId: string) { }
function calculateTotal(items: Item[]) { }
function isVisible(element: HTMLElement) { }

// ❌ BAD: Nouns or unclear verbs
async function user(id: string) { }
function total(items: Item[]) { }
function check(element: HTMLElement) { }
```

### Boolean Variables

```typescript
// ✅ GOOD: Prefix with is/has/should/can
const isVisible = true
const hasAccess = false
const shouldRetry = true
const canEdit = false

// ❌ BAD: No prefix
const visible = true
const access = false
const retry = true
const edit = false
```

## React Best Practices

### Component Structure

```tsx
// ✅ GOOD: Structured component
export function UserProfile({ userId }: UserProfileProps) {
  // 1. Hooks
  const user = useUser(userId)
  
  // 2. Derived state
  const displayName = user?.name || 'Guest'
  
  // 3. Effects (if any)
  useEffect(() => {
    // ...
  }, [userId])
  
  // 4. Event handlers
  const handleEdit = () => { /* ... */ }
  
  // 5. Early returns
  if (!user) return <Loading />
  
  // 6. JSX
  return (
    <div onClick={handleEdit}>
      {displayName}
    </div>
  )
}
```

### Custom Hooks

Extract complex logic into custom hooks:

```tsx
// ❌ BAD: Complex logic in component
function SearchComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    if (!query) return
    setIsLoading(true)
    api.search(query)
      .then(setResults)
      .finally(() => setIsLoading(false))
  }, [query])
  
  return <div>...</div>
}

// ✅ GOOD: Logic in custom hook
function useSearch(query: string) {
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    if (!query) return
    setIsLoading(true)
    api.search(query)
      .then(setResults)
      .finally(() => setIsLoading(false))
  }, [query])
  
  return { results, isLoading }
}

function SearchComponent() {
  const [query, setQuery] = useState('')
  const { results, isLoading } = useSearch(query)
  return <div>...</div>
}
```

## Node.js/Backend Standards

### Error Handling

Always handle errors explicitly:

```typescript
// ❌ BAD: Swallowing errors
try {
  await db.save(data)
} catch (e) {
  console.log('Error saving')
}

// ✅ GOOD: Logging and rethrowing or handling
try {
  await db.save(data)
} catch (error) {
  logger.error('Failed to save data', { error, data })
  throw new DatabaseError('Failed to save data', { cause: error })
}
```

### Environment Variables

Never hardcode secrets:

```typescript
// ❌ BAD: Hardcoded secrets
const apiKey = 'sk-123456'

// ✅ GOOD: Environment variables
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY is required')
```

## Testing Standards

### AAA Pattern (Arrange, Act, Assert)

```typescript
test('calculates total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }]
  
  // Act
  const total = calculateTotal(items)
  
  // Assert
  expect(total).toBe(30)
})
```

### Mocking External Services

```typescript
// ✅ GOOD: Mock external calls
test('sends email on signup', async () => {
  const sendEmailMock = vi.spyOn(emailService, 'send')
  
  await registerUser(userData)
  
  expect(sendEmailMock).toHaveBeenCalledWith(userData.email)
})
```

### Test Interdependence

Ensure tests are isolated:

```typescript
// ❌ BAD: Tests depend on shared state
let globalCounter = 0
test('increments', () => { globalCounter++ })
test('is 1', () => { expect(globalCounter).toBe(1) })

// ✅ GOOD: Fresh state for each test
beforeEach(() => {
  // reset state
})
```

## Git Workflow Standards

### Commit Messages

Use Conventional Commits:

- `feat: add user profile page`
- `fix: resolve login race condition`
- `docs: update API documentation`
- `refactor: simplify auth logic`
- `style: fix formatting`
- `test: add unit tests for calculation`
- `chore: bump dependencies`

### Branch Naming

- `feature/user-profile`
- `fix/login-bug`
- `refactor/auth-system`
- `docs/api-update`

## Documentation Standards

### Code Comments

Explain **why**, not **what**:

```typescript
// ❌ BAD: Explains what the code does (obvious)
// Increment count by 1
count++

// ✅ GOOD: Explains why
// Increment retry count to trigger exponential backoff next time
retryCount++
```

### TSDoc

Use TSDoc for exported functions:

```typescript
/**
 * Calculates the total price including tax.
 * 
 * @param items - List of items to calculate
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @returns Total price formatted as currency string
 * @throws {ValidationError} If tax rate is negative
 */
function calculateTotal(items: Item[], taxRate: number): string { }
```

## Performance & Security

### Performance

- Use `Promise.all` for independent async operations
- Implement pagination for large lists
- Debounce search inputs
- Memoize expensive calculations

### Security

- Sanitize all user inputs
- Use parameterized queries for SQL
- Validate content types on uploads
- Rate limit API endpoints

## Refactoring Guidelines

### Rule of Three
If you copy-paste code three times, extract it into a function/component.

### Boy Scout Rule
"Always leave the campground cleaner than you found it."
When extracting a function, formatting is free. If you see messy code in the file you're editing, clean it up.

## Code Review Checklist

Before submitting PR:
1. Does it meet requirements?
2. Are tests included?
3. Is code readable?
4. Are edge cases handled?
5. No secrets committed?
6. No console.logs left?
7. Types are strict (no avoid `any`)?

---

> **Note**: These standards are living documents. If a rule doesn't make sense, challenge it and propose a change.
