# Firebase Database Structure - Visual Guide

## Overview Diagram

```
Firebase Project: chitchut-2b9e2
│
├── 🔥 Firestore Database
│   │
│   ├── 📁 Collection: users
│   │   ├── 📄 Document: ABC123 (auto-generated ID)
│   │   │   ├── id: "550e8400-e29b-41d4-a716-446655440000"
│   │   │   ├── username: "alice"
│   │   │   └── createdAt: 1710604800000
│   │   │
│   │   └── 📄 Document: DEF456 (auto-generated ID)
│   │       ├── id: "550e8400-e29b-41d4-a716-446655440001"
│   │       ├── username: "bob"
│   │       └── createdAt: 1710604850000
│   │
│   └── 📁 Collection: messages
│       ├── 📄 Document: XYZ789 (auto-generated ID)
│       │   ├── id: "msg-uuid-001"
│       │   ├── userId: "550e8400-e29b-41d4-a716-446655440000" (→ alice)
│       │   ├── username: "alice"
│       │   ├── content: "Hello everyone!"
│       │   └── timestamp: 1710604900000
│       │
│       ├── 📄 Document: XYZ790 (auto-generated ID)
│       │   ├── id: "msg-uuid-002"
│       │   ├── userId: "550e8400-e29b-41d4-a716-446655440001" (→ bob)
│       │   ├── username: "bob"
│       │   ├── content: "Hi alice!"
│       │   └── timestamp: 1710604950000
│       │
│       └── 📄 Document: XYZ791 (auto-generated ID)
│           ├── id: "msg-uuid-003"
│           ├── userId: "550e8400-e29b-41d4-a716-446655440000" (→ alice)
│           ├── username: "alice"
│           ├── content: "How are you?"
│           └── timestamp: 1710605000000
│
└── 🌐 Firestore Rules
    └── Allow read/write for all (test mode) or authenticated users (prod)
```

---

## Example Data (Full)

### Users Collection

#### Document 1: ABC123
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "createdAt": 1710604800000
}
```

**Field Details:**
- `id`: UUID unik untuk Alice (bukan doc ID)
- `username`: "alice" 
- `createdAt`: Timestamp saat Alice pertama kali login
  - Value: 1710604800000
  - Human readable: Sun Mar 16 2025 04:00:00 GMT

---

#### Document 2: DEF456
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "username": "bob",
  "createdAt": 1710604850000
}
```

**Field Details:**
- `id`: UUID unik untuk Bob (bukan doc ID)
- `username`: "bob"
- `createdAt`: Timestamp saat Bob pertama kali login

---

### Messages Collection

#### Document 1: XYZ789
```json
{
  "id": "msg-uuid-001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "content": "Hello everyone!",
  "timestamp": 1710604900000
}
```

**Field Details:**
- `id`: UUID unique untuk pesan ini
- `userId`: Reference ke alice's `id` di users collection
- `username`: "alice" (store username untuk quick display)
- `content`: "Hello everyone!"
- `timestamp`: Waktu pesan dikirim

---

#### Document 2: XYZ790
```json
{
  "id": "msg-uuid-002",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "username": "bob",
  "content": "Hi alice!",
  "timestamp": 1710604950000
}
```

---

#### Document 3: XYZ791
```json
{
  "id": "msg-uuid-003",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "content": "How are you?",
  "timestamp": 1710605000000
}
```

---

## User Flow → Database

### Step 1: Alice First Login

**User Action:**
```
Browser: Enter "alice" → Click "Enter Chat"
```

**Code Execution:**
```typescript
// CreateAccount.vue → handleLogin()
const user = await getUserByUsername('alice')
// Result: null (not found)

const newUser = await createUser('alice')
// Creates:
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   username: "alice",
//   createdAt: 1710604800000
// }
```

**Database Change:**
```
users collection
└── [NEW] Document ABC123
    ├── id: "550e8400-e29b-41d4-a716-446655440000"
    ├── username: "alice"
    └── createdAt: 1710604800000
```

**localStorage:**
```json
{
  "chitchat_session": {
    "username": "alice",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Step 2: Alice Sends Message

**User Action:**
```
Browser: Type "Hello everyone!" → Click Send
```

**Code Execution:**
```typescript
// Chat.vue → handleSendMessage()
const message = await sendMessage(
  "550e8400-e29b-41d4-a716-446655440000", // alice's userId
  "alice",                                  // alice's username
  "Hello everyone!"                         // message content
)
// Creates:
// {
//   id: "msg-uuid-001",
//   userId: "550e8400-e29b-41d4-a716-446655440000",
//   username: "alice",
//   content: "Hello everyone!",
//   timestamp: 1710604900000
// }
```

**Database Change:**
```
messages collection
└── [NEW] Document XYZ789
    ├── id: "msg-uuid-001"
    ├── userId: "550e8400-e29b-41d4-a716-446655440000"
    ├── username: "alice"
    ├── content: "Hello everyone!"
    └── timestamp: 1710604900000
```

**Real-Time Update:**
```
subscribeToMessages() listener triggered
→ Chat.vue updates with new message
→ UI shows:
   [04:01:40] alice: Hello everyone!
```

---

### Step 3: Bob Login (New User)

**User Action:**
```
Browser (new tab): Enter "bob" → Click "Enter Chat"
```

**Code Execution:**
```typescript
const user = await getUserByUsername('bob')
// Result: null (not found)

const newUser = await createUser('bob')
// Creates:
// {
//   id: "550e8400-e29b-41d4-a716-446655440001",
//   username: "bob",
//   createdAt: 1710604850000
// }
```

**Database Change:**
```
users collection
├── Document ABC123 (alice) - unchanged
└── [NEW] Document DEF456
    ├── id: "550e8400-e29b-41d4-a716-446655440001"
    ├── username: "bob"
    └── createdAt: 1710604850000

messages collection
├── Document XYZ789 (alice's message) - unchanged
└── [NEW] Document XYZ790 (but this is Bob's first login, no message yet)
```

**Bob's View:**
```
subscribeToMessages() loaded on mount
→ Fetches all messages from DB
→ UI shows:
   [04:01:40] alice: Hello everyone!
```

---

### Step 4: Bob Replies

**User Action:**
```
Browser: Type "Hi alice!" → Click Send
```

**Database Change:**
```
messages collection
├── Document XYZ789 (alice's message)
├── Document XYZ790
└── [NEW] Document XYZ791
    ├── id: "msg-uuid-002"
    ├── userId: "550e8400-e29b-41d4-a716-446655440001"
    ├── username: "bob"
    ├── content: "Hi alice!"
    └── timestamp: 1710604950000
```

**Real-Time Sync:**
```
Alice's browser (tab 1)
  ↓ Real-time listener triggered
  ↓ New message received
  ↓ UI updates instantly
  ↓ Shows:
     [04:01:40] alice: Hello everyone!
     [04:02:30] bob: Hi alice!
```

---

## Data Types Explanation

### String (id, username, content)
```
Type: Text
Examples:
  - "550e8400-e29b-41d4-a716-446655440000" (UUID)
  - "alice" (username)
  - "Hello everyone!" (message content)
```

### Number (timestamp, createdAt)
```
Type: Numeric value (Unix timestamp in milliseconds)
Examples:
  - 1710604800000 (represents specific moment in time)
  - 1710604900000 (100 seconds later)

Convert to readable date:
  new Date(1710604800000)
  → Sun Mar 16 2025 04:00:00 GMT+0700
```

---

## Query Examples

### Get All Users
```typescript
// Not used in app, but example:
const snapshot = await getDocs(collection(db, 'users'))
const users = snapshot.docs.map(doc => doc.data())
// Returns all documents from users collection
```

### Find User by Username
```typescript
// Used in: getUserByUsername()
const q = query(
  collection(db, 'users'),
  where('username', '==', 'alice')
)
const snapshot = await getDocs(q)
// Returns: alice's user document

// Result:
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   username: "alice",
//   createdAt: 1710604800000
// }
```

### Get All Messages (Ordered by Time)
```typescript
// Used in: getMessages()
const q = query(
  collection(db, 'messages'),
  orderBy('timestamp', 'asc'),  // Sort from oldest to newest
  limit(100)                    // Maximum 100 messages
)
const snapshot = await getDocs(q)
// Returns: Array of latest 100 messages ordered by time

// Result:
// [
//   {
//     id: "msg-uuid-001",
//     userId: "550e8400-e29b-41d4-a716-446655440000",
//     username: "alice",
//     content: "Hello everyone!",
//     timestamp: 1710604900000
//   },
//   {
//     id: "msg-uuid-002",
//     userId: "550e8400-e29b-41d4-a716-446655440001",
//     username: "bob",
//     content: "Hi alice!",
//     timestamp: 1710604950000
//   },
//   ...
// ]
```

### Real-Time Message Listener
```typescript
// Used in: subscribeToMessages()
const q = query(
  collection(db, 'messages'),
  orderBy('timestamp', 'asc'),
  limit(100)
)

const unsubscribe = onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => doc.data())
  // Called initially with all messages
  // Called again on every new message added
  // Called again if any message updated/deleted
})

// To stop listening:
// unsubscribe()
```

---

## Firestore vs Relational Database

### Firestore (Used Here)
```
Document-based (JSON-like)
No strict schema
Flexible data structure
Real-time listeners native
```

### Example in Firestore
```
users/
├── /ABC123
│   ├── id: "uuid"
│   ├── username: "alice"
│   └── createdAt: 12345

messages/
├── /XYZ789
│   ├── userId: "uuid"
│   ├── username: "alice"
│   ├── content: "Hello"
│   └── timestamp: 12350
```

### Equivalent SQL
```sql
-- Relational/SQL style would be:

USERS TABLE:
  id (PK): uuid
  username: alice
  created_at: TIMESTAMP

MESSAGES TABLE:
  id (PK): uuid
  user_id (FK): users.id
  username: alice (denormalized)
  content: Hello
  timestamp: TIMESTAMP
```

---

## Important Notes

### ✅ Why Store Username in Messages?

In Firestore, we store `username` in messages collection (denormalization):

```json
{
  "userId": "550e8400-...",  // Reference to user
  "username": "alice"         // Denormalized copy
}
```

**Why?**
- Direct access to display name (no join needed)
- Firestore doesn't support JOINs
- Faster reads for UI display
- If user deletes account, we keep the history

---

### ✅ Why Use UUID in `id` Field?

```json
{
  "id": "550e8400-...",     // UUID (our ID)
  // Document ID: "ABC123"   (Firebase auto-generated)
}
```

**Why two IDs?**
- Document ID: Firestore's internal identifier
- `id` field: We control it, UUID stays same across sessions
- Easier to sync between frontend and backend

---

### ✅ Timestamp Format

We use **Unix timestamp in milliseconds** (JavaScript's `Date.now()`):

```javascript
Date.now()           // 1710604800000
new Date()           // 2025-03-16T04:00:00.000Z
```

**Not** ISO string, because:
- Easier to sort/compare numerically
- More efficient storage
- Can format in UI with any timezone

---

## Next Steps

1. ✅ Create both collections in Firebase Console
2. ✅ Update security rules
3. ✅ Run `npm run dev`
4. ✅ Test login/messages
5. ✅ View data in Firebase Console

All ready! 🚀
