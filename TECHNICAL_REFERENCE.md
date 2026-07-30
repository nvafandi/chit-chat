# Technical Reference - Chat Feature Implementation

## Complete Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Vue 3 Frontend                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────┐            ┌──────────────────┐    │
│  │ CreateAccount  │            │     Chat.vue     │    │
│  │     .vue       │            │                  │    │
│  └────────┬───────┘            └─────────┬────────┘    │
│           │                              │              │
│           │ (register/login)   (send/view messages)    │
│           │                              │              │
│  ┌────────▼──────────────────────────────▼─────┐       │
│  │         Pinia State Management              │       │
│  ├─────────────────────────────────────────────┤       │
│  │ authStore: { user, loading, error }        │       │
│  │ chatStore: { messages, loading, error }    │       │
│  └────────────────────┬──────────────────────┘        │
│                       │                                │
│  ┌────────┬───────────▼───────────┬─────────┐         │
│  │        │                       │         │         │
│  ▼        ▼                       ▼         ▼         │
│ ┌──────────────────┐    ┌──────────────────┐         │
│ │ Services         │    │ Router / Guards  │         │
│ ├──────────────────┤    ├──────────────────┤         │
│ │ firebase.ts      │    │ Session checking │         │
│ │ session.ts       │    │ Redirect logic   │         │
│ └────────┬─────────┘    └──────────────────┘         │
│          │                                            │
└──────────┼────────────────────────────────────────────┘
           │
        ┌──┴──┐
        │     │
        ▼     ▼
      ┌──────────────┐      ┌────────────────┐
      │ Firebase     │      │ Browser        │
      │ Firestore    │      │ localStorage   │
      │ (Cloud DB)   │      │ (Session)      │
      └──────────────┘      └────────────────┘
```

## Service Layer - Firebase Operations

### `firebase.ts` - User Management

#### `createUser(username: string): Promise<User>`
Creates a new user account.

**Flow:**
```
Input: username
  ↓
Generate UUID
  ↓
Create User object: { id, username, createdAt }
  ↓
Add to Firestore 'users' collection
  ↓
Return: User object
```

**Example:**
```typescript
const newUser = await createUser('alice');
// Returns: { id: '550e8400...', username: 'alice', createdAt: 1710604800000 }
```

**Firebase Operation:**
```typescript
await addDoc(collection(db, 'users'), {
  id: uuidv4(),
  username: 'alice',
  createdAt: Date.now()
});
```

---

#### `getUserByUsername(username: string): Promise<User | null>`
Finds an existing user by username.

**Flow:**
```
Input: username
  ↓
Query Firestore where username == input
  ↓
If found: Return User object
If not found: Return null
```

**Example:**
```typescript
const user = await getUserByUsername('alice');
// Returns User object if exists, null otherwise
```

**Firebase Query:**
```typescript
const q = query(
  collection(db, 'users'),
  where('username', '==', 'alice')
);
const docs = await getDocs(q);
```

---

### `firebase.ts` - Message Operations

#### `sendMessage(userId: string, username: string, content: string): Promise<Message>`
Sends a new message to the chat.

**Flow:**
```
Input: userId, username, content
  ↓
Create Message object: { id, userId, username, content, timestamp }
  ↓
Add to Firestore 'messages' collection
  ↓
Return: Message object
```

**Example:**
```typescript
const msg = await sendMessage(
  '550e8400...',
  'alice',
  'Hello everyone!'
);
```

---

#### `getMessages(): Promise<Message[]>`
Fetches all chat messages ordered by timestamp, limited to 100.

**Firebase Query:**
```typescript
const q = query(
  collection(db, 'messages'),
  orderBy('timestamp', 'asc'),
  limit(100)
);
const docs = await getDocs(q);
return docs.map(doc => doc.data() as Message);
```

---

#### `subscribeToMessages(callback): () => void`
Real-time listener for messages. Automatically updates when new messages arrive.

**Flow:**
```
Setup listener on 'messages' collection
  ↓
On any change: Call callback with updated messages array
  ↓
Return unsubscribe function
```

**Usage:**
```typescript
const unsubscribe = subscribeToMessages((messages) => {
  console.log('Messages updated:', messages);
});

// Later, to stop listening:
unsubscribe();
```

---

## Service Layer - Session Management

### `session.ts` - localStorage Operations

#### `saveSession(session: SessionData): void`
```typescript
interface SessionData {
  username: string;
  userId: string;
}

// Saves to: localStorage['ygpw_session'] = '{"username":"alice","userId":"..."}'
```

---

#### `getSession(): SessionData | null`
Retrieves session from localStorage. Returns null if invalid.

**Usage:**
```typescript
const session = getSession();
if (session) {
  console.log('User:', session.username);
  console.log('ID:', session.userId);
}
```

---

#### `clearSession(): void`
Removes session from localStorage.

---

#### `hasSession(): boolean`
Quick check if valid session exists.

---

## State Management - Pinia Stores

### `authStore.ts` - User Authentication

**State:**
```typescript
{
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**

#### `initializeAuth()`
- Called on app startup
- Checks localStorage for existing session
- Restores user if valid session found

**Usage in router:**
```typescript
router.beforeEach((to, from, next) => {
  authStore.initializeAuth();
  // Now authStore.user is populated if session exists
});
```

---

#### `setUser(userData: User)`
- Sets current user
- Saves session to localStorage
- Called after successful login/register

**Example:**
```typescript
authStore.setUser(userObject);
// User is now authenticated and session is saved
```

---

#### `logout()`
- Clears user data
- Removes session from storage
- Resets error state

**Usage:**
```typescript
authStore.logout();
// Session cleared, user logged out
```

---

#### `isAuthenticated(): boolean`
- Simple boolean check
- Used in route guards

---

### `chatStore.ts` - Chat Messages

**State:**
```typescript
{
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
```

**Key Actions:**

#### `setMessages(newMessages: Message[])`
Replaces entire messages array (used for sync from Firebase).

---

#### `addMessage(message: Message)`
Adds single message to array.

---

#### `setUnsubscribe(fn: () => void)`
Stores Firebase unsubscribe function for cleanup.

---

#### `unsubscribeFromUpdates()`
Calls stored unsubscribe function to stop listening to Firebase updates.

---

## Routing Logic

### Route Guard Implementation

**File:** `src/router/index.ts`

```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // 1. Initialize auth from localStorage
  authStore.initializeAuth();
  
  // 2. Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth;
  const isAuthenticated = authStore.isAuthenticated();
  
  // 3. Execute appropriate redirect
  if (requiresAuth && !isAuthenticated) {
    // Can't access /chat without login
    next('/create-account');
  } else if (to.path === '/create-account' && isAuthenticated) {
    // Already logged in, go to chat
    next('/chat');
  } else {
    // Normal navigation
    next();
  }
});
```

---

### Route Configuration

```typescript
const routes = [
  {
    path: '/',
    redirect: '/chat'  // Root redirects to chat (or login if not auth)
  },
  {
    path: '/create-account',
    name: 'CreateAccount',
    component: CreateAccount  // Register/login page
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }  // Requires authentication
  }
];
```

---

## User Flow - Complete Journey

### Registration Flow

```
1. User visits app
   ↓
2. Router checks session → none found
   ↓
3. Redirect to /create-account
   ↓
4. User enters username "alice"
   ↓
5. CreateAccount.vue calls:
   - getUserByUsername('alice') → returns null
   - createUser('alice') → generates UUID, saves to Firebase
   - Returns: {id: '550e8400...', username: 'alice', createdAt: 1710...}
   ↓
6. authStore.setUser(userObject)
   - Saves to localStorage: {username: 'alice', userId: '550e8400...'}
   ↓
7. Router.push('/chat')
   ↓
8. Chat.vue mounts
   - Loads initial messages from Firebase
   - Subscribes to real-time updates
   ↓
9. User can now send/receive messages
```

---

### Login Flow

```
1. Existing user visits app
   ↓
2. Router.beforeEach() checks localStorage
   - Finds: {username: 'alice', userId: '550e8400...'}
   ↓
3. authStore.initializeAuth()
   - Sets user state from localStorage
   ↓
4. User is authenticated → redirect to /chat
   ↓
5. Chat.vue loads with previous messages
```

---

### Message Send Flow

```
1. User types message "Hello"
   ↓
2. Click send button
   ↓
3. Chat.vue calls sendMessage():
   sendMessage(
     authStore.user.id,      // '550e8400...'
     authStore.user.username,  // 'alice'
     'Hello'                  // message content
   )
   ↓
4. firebase.ts creates Message object with:
   - id: new UUID
   - userId: from authStore
   - username: from authStore
   - content: 'Hello'
   - timestamp: Date.now()
   ↓
5. Added to Firestore 'messages' collection
   ↓
6. Firebase trigger → subscribeToMessages listener
   ↓
7. Messages array updated in chatStore
   ↓
8. Chat.vue reactively updates UI
   ↓
9. ALL connected users see the new message in real-time
```

---

## TypeScript Interfaces

```typescript
// src/types/index.ts

interface User {
  id: string;           // UUID
  username: string;     // Unique
  createdAt: number;    // Unix timestamp
}

interface Message {
  id: string;           // UUID
  userId: string;       // Foreign key to users
  username: string;     // Denormalized for display
  content: string;      // Message text
  timestamp: number;    // Unix timestamp
}

interface SessionData {
  username: string;
  userId: string;
}
```

---

## Error Handling

### Registration Errors
- **Empty username** → "Username is required"
- **Too short** → "Username must be at least 3 characters"
- **Already taken** → "Username already taken"
- **Firebase error** → "Failed to create account: [error message]"

### Login Errors
- **Empty username** → "Username is required"
- **Not found** → "Username not found"
- **Firebase error** → "Failed to login: [error message]"

### Chat Errors
- **Send failed** → "Failed to send message: {error}"
- **Load failed** → "Failed to load messages: {error}"

---

## Firebase Security Rules

For development/testing (open access):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read, write: if true;
    }
    match /messages/{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production (authentication-based):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /messages/{messageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Performance Considerations

1. **Message Pagination**: Currently limits to 100 messages
   - Can add pagination for older messages
   - Modify: `limit(100)` → `limit(50)` and add offset

2. **Real-time Subscription**: 
   - Cleanup on logout prevents memory leaks
   - Unsubscribe called in onUnmounted()

3. **Local Storage Size**:
   - Session object is small (~100 bytes)
   - No other large data stored locally

4. **Firebase Read/Write Limits**:
   - Optimize queries to reduce reads
   - Consider implementing caching

---

## Development Setup

### Dependencies
- `vue@^3.0` - Framework
- `vuetify@^3.0` - UI Components
- `pinia@^2.0` - State management
- `vue-router@^4.0` - Routing
- `firebase@^9.0` - Backend
- `uuid@^9.0` - ID generation

### Install & Run
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## File Summary

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/views/CreateAccount.vue` | Register/Login UI | handleCreateAccount(), handleLogin() |
| `src/views/Chat.vue` | Main chat | handleSendMessage(), scrollToBottom() |
| `src/services/firebase.ts` | Firebase ops | createUser(), sendMessage(), subscribeToMessages() |
| `src/services/session.ts` | localStorage | saveSession(), getSession(), clearSession() |
| `src/stores/authStore.ts` | Auth state | initializeAuth(), setUser(), logout() |
| `src/stores/chatStore.ts` | Chat state | setMessages(), addMessage(), setUnsubscribe() |
| `src/router/index.ts` | Routing | beforeEach guard, route config |

This completes the technical documentation for the chat feature implementation.
