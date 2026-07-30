# Architecture Diagrams - Chat Application

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        User's Browser                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Vue 3 Application                        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │  CreateAccount.vue  ──┐                                    │ │
│  │        ↕              │  ┌──────────────────────┐          │ │
│  │      Chat.vue ────────┼─→│ Router / Middleware │          │ │
│  │                       │  └──────┬───────────────┘          │ │
│  │                       │         │                           │ │
│  │  ┌──────────────────────────────▼──────────────────────┐   │ │
│  │  │       Pinia Store Management                         │   │ │
│  │  ├──────────────────────────────────────────────────────┤   │ │
│  │  │ authStore                    chatStore             │   │ │
│  │  │ ├─ user                      ├─ messages            │   │ │
│  │  │ ├─ isLoading                 ├─ isLoading           │   │ │
│  │  │ ├─ error                     └─ error               │   │ │
│  │  │ └─ isAuthenticated()                               │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  │                       ↕                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │         Service Layer                                │   │ │
│  │  ├──────────────────────────────────────────────────────┤   │ │
│  │  │ firebase.ts          │      session.ts              │   │ │
│  │  │ ├─ createUser()      │      ├─ saveSession()       │   │ │
│  │  │ ├─ getUserByUsername │      ├─ getSession()        │   │ │
│  │  │ ├─ sendMessage()     │      ├─ clearSession()      │   │ │
│  │  │ ├─ getMessages()     │      └─ hasSession()        │   │ │
│  │  │ └─ subscribe()       │                              │   │ │
│  │  └────────┬─────────────────────────┬──────────────────┘   │ │
│  │           │                         │                       │ │
│  └───────────┼─────────────────────────┼───────────────────────┘ │
│              │                         │                        │
│              │                    ┌────▼──────────────────┐    │
│              │                    │  localStorage        │     │
│              │                    │  Key: 'session'      │     │
│              │                    │  Value: username,ID  │     │
│              │                    └────────────────────┘    │
│              │                                              │
└──────────────┼──────────────────────────────────────────────┘
               │
               │ HTTP/HTTPS
               │ (REST API)
               │
        ┌──────▼──────────────────────────────────────────┐
        │         Firebase Cloud Services                 │
        ├──────────────────────────────────────────────────┤
        │                                                  │
        │  ┌────────────────────────────────────────────┐ │
        │  │     Firestore (NoSQL Database)             │ │
        │  ├────────────────────────────────────────────┤ │
        │  │                                            │ │
        │  │  Collection: users                         │ │
        │  │  ├─ Document: [uuid]                       │ │
        │  │  │  ├─ id: string                          │ │
        │  │  │  ├─ username: string                    │ │
        │  │  │  └─ createdAt: number                   │ │
        │  │  │                                          │ │
        │  │  Collection: messages                       │ │
        │  │  ├─ Document: [uuid]                       │ │
        │  │  │  ├─ id: string                          │ │
        │  │  │  ├─ userId: string (FK to users.id)    │ │
        │  │  │  ├─ username: string                    │ │
        │  │  │  ├─ content: string                     │ │
        │  │  │  └─ timestamp: number                   │ │
        │  │  │                                          │ │
        │  └────────────────────────────────────────────┘ │
        │                                                  │
        └──────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌──────────────────────────────────────────────────────────────────┐
│               First-Time User Registration                       │
└──────────────────────────────────────────────────────────────────┘

CreateAccount.vue
      │
      │ User enters username "alice"
      │ Clicks "Create Account"
      ▼
handleCreateAccount()
      │
      ├─→ Validation
      │   └─ Check: length >= 3?
      │
      ├─→ firebase.ts: getUserByUsername('alice')
      │   │
      │   └─→ Firebase: Query users where username == 'alice'
      │       ├─ NOT FOUND → Continue
      │       └─ FOUND → Return error
      │
      ├─→ firebase.ts: createUser('alice')
      │   │
      │   └─→ Generate UUID: "550e8400-..."
      │   │
      │   └─→ Firebase: Insert into users collection
      │       ├─ id: "550e8400-..."
      │       ├─ username: "alice"
      │       └─ createdAt: 1710604800000
      │   │
      │   └─→ Return User object
      │
      ├─→ authStore.setUser(userObject)
      │   │
      │   └─→ session.ts: saveSession()
      │       └─→ localStorage['ygpw_session'] = 
      │           '{"username":"alice","userId":"550e8400-..."}'
      │
      └─→ router.push('/chat')
          └─→ Chat.vue loads and subscribes to messages
```

## Real-Time Chat Message Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              Sending Message / Real-Time Sync                    │
└──────────────────────────────────────────────────────────────────┘

User 1 (alice) clicks send with "Hello bob!"
      │
      ▼
Chat.vue: handleSendMessage()
      │
      ├─→ firebase.ts: sendMessage(userId, username, content)
      │   │
      │   └─→ Create Message object:
      │       ├─ id: new UUID
      │       ├─ userId: "550e8400-..."
      │       ├─ username: "alice"
      │       ├─ content: "Hello bob!"
      │       └─ timestamp: Date.now()
      │
      ├─→ Firebase: Insert into messages collection
      │   │
      │   └───┐
      │       │ (Cloud Trigger)
      │       │
      │       └─→ Firebase Real-Time Listener
      │
      ▼       (All Subscribed Clients)
subscribeToMessages() Callback Triggered
      │
      ├─→ firebase.ts: onSnapshot fires callback
      │
      ├─→ chatStore.setMessages(newArray)
      │
      ├─→ Chat.vue UI Reactive Update
      │   ├─ Alice sees her message
      │   └─ Bob instantly sees alice's message
      │
      ▼
UI Renders with auto-scroll to latest message
```

## Session Persistence Flow

```
┌──────────────────────────────────────────────────────────────────┐
│           Session Check on App Startup                           │
└──────────────────────────────────────────────────────────────────┘

App Loads (User refreshes page)
      │
      ▼
router.beforeEach() Guard
      │
      ├─→ authStore.initializeAuth()
      │   │
      │   ├─→ session.ts: getSession()
      │   │   │
      │   │   └─→ localStorage['chitchat_session']
      │   │       ├─ FOUND: {username, userId}
      │   │       │
      │   │       └─→ authStore.user = 
      │   │           {id: userId, username, createdAt}
      │   │
      │   └─→ Return user object or null
      │
      ├─→ Check if route requires auth
      │   │
      │   ├─ Route = /chat
      │   │  └─ Requires auth: true
      │   │
      │   └─ isAuthenticated = true (user set)
      │
      └─→ next() → Allow navigation to /chat
          │
          ▼
      Chat.vue loads with user data
      │
      └─→ subscribeToMessages()
          └─→ Display all messages and listen for updates
```

## Login Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                 Existing User Login                              │
└──────────────────────────────────────────────────────────────────┘

CreateAccount.vue: Login Mode
      │
      │ User enters username "alice"
      │ Clicks "Login"
      │
      ▼
handleLogin()
      │
      ├─→ Validation: username not empty
      │
      ├─→ firebase.ts: getUserByUsername('alice')
      │   │
      │   └─→ Firebase: Query users collection
      │       └─→ Returns: {id: "550e8400-...", username, createdAt}
      │
      ├─→ Check if user exists
      │   ├─ FOUND → Continue
      │   └─ NOT FOUND → Show error
      │
      ├─→ authStore.setUser(userObject)
      │   │
      │   ├─→ Set user state
      │   │
      │   └─→ session.ts: saveSession()
      │       └─→ Save to localStorage
      │
      └─→ router.push('/chat')
          │
          │ (router.beforeEach checks session)
          │ (allowsNavigation to /chat)
          │
          ▼
      Chat.vue loads
          │
          ├─→ Load all messages
          │
          └─→ Subscribe to real-time updates
              │
              ▼
          Display chat history and continue chatting
```

## Logout Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      User Logout                                 │
└──────────────────────────────────────────────────────────────────┘

User clicks logout button (Chat.vue)
      │
      ▼
handleLogout()
      │
      ├─→ authStore.logout()
      │   │
      │   ├─→ Clear: user = null
      │   │
      │   └─→ session.ts: clearSession()
      │       └─→ localStorage.removeItem('chitchat_session')
      │
      ├─→ chatStore.unsubscribeFromUpdates()
      │   │
      │   └─→ Unsubscribe from Firebase listener
      │       └─→ Cleanup: Stop real-time updates
      │
      └─→ router.push('/create-account')
          │
          └─→ router.beforeEach() guard
              │
              ├─→ authStore.initializeAuth()
              │   └─→ No session found → user = null
              │
              ├─→ Navigate to /create-account
              │
              └─→ Display login/register form
```

## Data Flow Diagram (Unidirectional)

```
User Input (Forms)
      │
      ▼
Vue Components
      │
      ├─────────────────────┐
      │                     │
      ▼                     ▼
Services              Pinia Stores
(firebase.ts)         (authStore, chatStore)
      │                     │
      │                     ▼
      │            Reactive Component State
      │                     │
      └─────────┬───────────┘
                │
                ▼
        Firebase Firestore
                │
      ┌─────────┴──────────┐
      │                    │
      ▼                    ▼
   users             messages
 collection          collection
      │                    │
      │                    ▼
      │            Real-Time Listener
      │            (onSnapshot)
      │                    │
      └─────────┬──────────┘
                │
                ▼
        Store Update Callback
                │
                ▼
        Component Re-render
                │
                ▼
        UI Update (Reactive)
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  Error Handling Process                          │
└──────────────────────────────────────────────────────────────────┘

Async Operation (e.g., sendMessage)
      │
      ▼
try-catch Block
      │
      ├─ try
      │  │
      │  └─→ Execute operation (Firebase call)
      │      │
      │      ├─ Success → Return data → Update state
      │      │
      │      └─ Error → Throw error
      │
      └─ catch
         │
         ├─→ Capture error
         │
         ├─→ Log to console
         │
         ├─→ Set store.error = error message
         │
         └─→ Display error message in UI
             (v-alert component)
```

## State Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              Pinia State Updates (Reactive)                      │
└──────────────────────────────────────────────────────────────────┘

authStore (User Authentication)
├─ user: User | null
│  └─ Updated by: setUser(), logout()
├─ isAuthenticated(): boolean
│  └─ Computed from: user !== null
├─ isLoading: boolean
│  └─ Updated during: async operations
└─ error: string | null
   └─ Set during: error handling

chatStore (Chat Messages)
├─ messages: Message[]
│  └─ Updated by: setMessages(), subscribeToUpdates()
├─ isLoading: boolean
│  └─ During message fetch
└─ unsubscribe: (() => void) | null
   └─ Stored for cleanup on logout

Component Watchers
└─ Any change to store → Component re-render
   └─ UI automatically reflects new state
```

## Performance Considerations

```
┌──────────────────────────────────────────────────────────────────┐
│             Optimization & Performance                           │
└──────────────────────────────────────────────────────────────────┘

1. Message Query Optimization
   ├─ Only fetch 100 latest messages
   ├─ Real-time listener auto-updates
   └─ No unnecessary re-queries

2. Component Lifecycle Cleanup
   ├─ Unsubscribe from Firebase on unmount
   ├─ Prevent memory leaks
   └─ Clear state on logout

3. localStorage Efficiency
   ├─ Only store essential session data
   ├─ Small payload (~100 bytes)
   └─ No blocking reads

4. TypeScript for Safety
   ├─ Catch errors at compile time
   ├─ Prevent runtime type errors
   └─ Better IDE autocomplete

5. Reactive State Updates
   ├─ Only affected components re-render
   ├─ Vue 3 efficient reactivity
   └─ No unnecessary DOM updates
```

---

These diagrams provide a complete visual representation of the chat application architecture and data flow.
