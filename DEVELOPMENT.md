# yang ga punya WA Development Documentation

## Project Overview

**yang ga punya WA** is a real-time chat application built with modern Vue 3 technologies. It demonstrates best practices for frontend development including state management, routing, real-time data synchronization, and session management.

## Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| Vue 3 | UI Framework | ^3.5.30 |
| Vue Router | Routing | ^4.2.0 |
| Pinia | State Management | ^2.1.0 |
| Vuetify | Component Library | ^3.5.0 |
| Firebase | Backend/Database | ^10.7.0 |
| TypeScript | Language | ~5.9.3 |
| Vite | Build Tool | ^8.0.0 |
| Sass | CSS Preprocessor | ^1.69.0 |

## Application Flow

```
User Visits App
         ↓
Check localStorage for session
         ↓
    ┌────────────────┐
    │ Has Session?   │
    └────────────────┘
       ↙          ↖
     YES          NO
       ↓          ↓
   Chat Page     Create Account
       ↓              ↓
       │ Create User  │
       │              ↓
       │         Save to Firebase
       │              ↓
       │         Save to localStorage
       │              ↓
       └──────→ Chat Page
                       ↓
             Real-time Message Updates
```

## Component Architecture

### CreateAccount.vue
**Purpose:** User registration and account creation

**Features:**
- Username validation (min 3 characters)
- Duplicate username checking
- Error handling with user feedback
- Gradient background styling
- Vuetify card layout

**User Flow:**
1. User enters username
2. App checks if username exists in Firebase
3. If unique, creates new user in Firestore
4. Saves session to localStorage
5. Redirects to chat page

### Chat.vue
**Purpose:** Main chat interface with real-time messaging

**Features:**
- Displays all messages in chronological order
- Distinguishes sent vs received messages (different styling)
- Real-time message updates without refresh
- Auto-scrolls to latest message
- Username and timestamp display
- Logout functionality
- Message counter in app bar

**User Flow:**
1. Load and display all existing messages
2. Subscribe to real-time updates
3. User types and sends message
4. Message appears instantly for all users
5. On logout, clear session and redirect

## State Management (Pinia)

### authStore - User Authentication
```typescript
// State
user: User | null              // Currently logged in user
isLoading: boolean             // Loading indicator
error: string | null           // Error messages

// Actions
initializeAuth()               // Initialize from localStorage
setUser(userData)              // Set user and save to localStorage
logout()                       // Clear user and localStorage
isAuthenticated()              // Check if user is logged in
```

**Usage:**
```typescript
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
authStore.initializeAuth()  // On app load
authStore.setUser(newUser)  // After creating account
authStore.logout()          // On logout
```

### chatStore - Messages
```typescript
// State
messages: Message[]            // All chat messages
isLoading: boolean             // Loading indicator
error: string | null           // Error messages

// Actions
setMessages(newMessages)       // Replace all messages
addMessage(message)            // Add single message
setUnsubscribe(fn)            // Store unsubscribe function
unsubscribeFromUpdates()      // Call Firestore unsubscribe
```

**Usage:**
```typescript
import { useChatStore } from '@/stores/chatStore'

const chatStore = useChatStore()
chatStore.setMessages(messages)   // Load messages
chatStore.setUnsubscribe(fn)      // Store listener cleanup
```

## Services

### firebase.ts - Firebase Operations
**Functions:**

1. **createUser(username: string): Promise<User>**
   - Creates new user in Firestore
   - Generates UUID
   - Returns user object

2. **getUserByUsername(username: string): Promise<User | null>**
   - Queries Firestore for existing user
   - Returns null if not found

3. **sendMessage(userId, username, content): Promise<Message>**
   - Creates message in Firestore
   - Includes timestamp
   - Returns message object

4. **getMessages(): Promise<Message[]>**
   - Fetches all messages from Firestore
   - Orders by timestamp (ascending)
   - Limits to 100 messages

5. **subscribeToMessages(callback): () => void**
   - Real-time listener for message updates
   - Calls callback with updated messages
   - Returns unsubscribe function

### session.ts - Session Management
**Functions:**

1. **saveSession(session: SessionData): void**
   - Saves session to localStorage
   - Stores username and userId

2. **getSession(): SessionData | null**
   - Retrieves session from localStorage
   - Returns null if not found

3. **clearSession(): void**
   - Removes session from localStorage

4. **hasSession(): boolean**
   - Checks if valid session exists

## Router Configuration

### Routes
- `/` - Redirect to `/chat`
- `/create-account` - User registration
- `/chat` - Main chat (requires auth)

### Route Guards
```typescript
router.beforeEach((to, from, next) => {
  // Check authentication
  // If accessing protected route without auth → redirect to create-account
  // If accessing create-account while auth → redirect to chat
})
```

## Data Models (TypeScript)

### User
```typescript
interface User {
  id: string                    // UUID
  username: string              // Unique username
  createdAt: number             // Timestamp
}
```

### Message
```typescript
interface Message {
  id: string                    // UUID
  userId: string                // User ID who sent it
  username: string              // Display name
  content: string               // Message text
  timestamp: number             // Sent time
}
```

### SessionData
```typescript
interface SessionData {
  username: string              // User's username
  userId: string                // User's UUID
}
```

## Real-Time Features

### Message Subscription
```typescript
// In Chat.vue
onMounted(() => {
  // Subscribe to changes
  const unsubscribe = subscribeToMessages((messages) => {
    chatStore.setMessages(messages)  // Update state
    scrollToBottom()                 // Auto-scroll
  })
  
  chatStore.setUnsubscribe(unsubscribe)  // Store for cleanup
})

onUnmounted(() => {
  chatStore.unsubscribeFromUpdates()  // Cleanup on unmount
})
```

This ensures:
- Messages update in real-time
- No polling needed
- Automatic cleanup prevents memory leaks
- Efficient Firebase usage

## Firebase Firestore Structure

### Collections
```
your-project/
├── users/
│   └── <doc-id>
│       ├── id: "uuid-xxx"
│       ├── username: "john_doe"
│       └── createdAt: 1234567890
│
└── messages/
    └── <doc-id>
        ├── id: "uuid-xxx"
        ├── userId: "uuid-xxx"
        ├── username: "john_doe"
        ├── content: "Hello!"
        └── timestamp: 1234567890
```

### Security Rules (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Allow all (dev only!)
    }
  }
}
```

⚠️ **Production Rules Should:**
- Restrict read to authenticated users
- Allow write only for own documents
- Validate data structure
- Rate limit writes

## Performance Optimizations

1. **Message Limit:** Query limits to 100 recent messages
2. **Real-time Subscription:** Only in Chat component
3. **Unsubscribe on Unmount:** Prevents memory leaks
4. **Vue's Reactivity:** Efficient state updates
5. **Lazy Loading:** Routes loaded on demand

## Common Development Workflows

### Adding a Feature

1. **Define Types** (src/types/index.ts)
2. **Create Service** (src/services/firebase.ts)
3. **Add to Store** (src/stores/chatStore.ts)
4. **Update Component** (src/views/Chat.vue)
5. **Test Flow**

### Debugging

**Check Firebase Connection:**
```typescript
// In firebase.ts
console.log('Config:', firebaseConfig)
console.log('App initialized:', app)
console.log('Firestore:', db)
```

**Monitor State Changes:**
- Use Vue DevTools → Pinia
- Watch store mutations
- Check localStorage in DevTools

**Test Real-time:**
1. Open 2 browser windows
2. Send message in one
3. Verify appears in other instantly

## File Dependencies

```
main.ts
├── App.vue
├── router/index.ts
│   ├── views/CreateAccount.vue
│   │   └── services/firebase.ts
│   │       └── services/session.ts
│   └── views/Chat.vue
│       ├── stores/authStore.ts
│       ├── stores/chatStore.ts
│       └── services/firebase.ts
├── stores/authStore.ts
│   └── services/session.ts
├── stores/chatStore.ts
└── types/index.ts
```

## Next Development Steps

1. ✅ **Core Features** - Completed
2. 📋 **User Profiles** - Add user info page
3. 🔐 **Authentication** - Add Firebase Auth
4. 💬 **Typing Indicator** - Show when user typing
5. 👥 **Online Status** - Show online/offline users
6. 🔍 **Search** - Search messages
7. 📎 **File Upload** - Share images/files
8. 🎨 **Themes** - Dark mode support
9. 📱 **PWA** - Progressive web app
10. ♿ **Accessibility** - WCAG compliance

## Testing Checklist

- [ ] User registration works
- [ ] Duplicate username prevention
- [ ] Session persists on refresh
- [ ] Messages load on chat page
- [ ] Real-time message updates
- [ ] Message sends successfully
- [ ] Logout clears session
- [ ] Redirect to auth page works
- [ ] Responsive design on mobile
- [ ] Error messages display

## Deployment Checklist

- [ ] Firebase config updated
- [ ] npm run build succeeds
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All images/assets present
- [ ] Environment variables set
- [ ] Firestore rules secured
- [ ] HTTPS enabled
- [ ] SEO meta tags added
- [ ] Performance optimized

## Troubleshooting Guide

### App Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Firebase Not Connected
- Check firebaseConfig in firebase.ts
- Verify project exists in Firebase Console
- Check internet connection
- Check console for specific errors

### Messages Not Syncing
- Verify Firestore collections exist
- Check Firestore rules allow reads
- Clear cache and reload
- Check browser console for errors

## Resources

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia Documentation](https://pinia.vuejs.org/core-concepts/)
- [Vuetify Components](https://vuetifyjs.com/en/components/all/)
- [Firebase Firestore Guide](https://firebase.google.com/docs/firestore)
- [Vue Router Guide](https://router.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
