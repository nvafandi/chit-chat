# yang ga punya WA - Real-time Chat Application

A modern real-time chat application built with Vue 3, TypeScript, Pinia, Vuetify, and Firebase.

## Features

- ✨ Real-time messaging with Firebase Firestore
- 🔐 User authentication and session management with localStorage
- 💾 Persistent sessions with UUID generation
- 🎨 Beautiful UI with Vuetify
- 📱 Responsive design
- 🚀 Fast and performant with Vite
- 🔄 Real-time updates without page refresh

## Tech Stack

- **Frontend Framework:** Vue 3 with Composition API
- **State Management:** Pinia
- **UI Framework:** Vuetify 3
- **Build Tool:** Vite
- **Database:** Firebase Firestore
- **Language:** TypeScript
- **Icons:** Material Design Icons (MDI)

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── router/             # Vue Router configuration
├── services/           # Firebase and session services
│   ├── firebase.ts    # Firebase operations
│   └── session.ts     # Session management
├── stores/            # Pinia stores
│   ├── authStore.ts   # User authentication state
│   └── chatStore.ts   # Chat messages state
├── types/             # TypeScript interfaces
│   └── index.ts       # Type definitions
├── views/             # Page components
│   ├── CreateAccount.vue  # User registration
│   └── Chat.vue           # Main chat interface
├── App.vue            # Root component
├── main.ts            # Application entry point
└── style.css          # Global styles
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Configure Firebase:**
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Get your Firebase configuration
   - Update `src/services/firebase.ts` with your Firebase credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

3. **Create Firebase Collections:**
   - Go to Firebase Firestore
   - Create two collections: `users` and `messages`

### Running the Application

**Development mode:**
```bash
npm run dev
```

The application will open at `http://localhost:5173`

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Usage

1. **First Visit:**
   - Users see the Create Account page
   - Enter a username and create an account
   - Session is saved to localStorage with UUID and username

2. **Chat:**
   - After account creation, users are redirected to the chat page
   - Messages appear in real-time
   - Type messages and click send or press Enter
   - Click logout to clear session and return to account creation

3. **Session Persistence:**
   - Session is stored in localStorage
   - Refresh the page and remain logged in
   - Close and reopen the browser - session persists
   - Click logout to clear the session

## Key Features Explained

### Real-time Messaging
- Uses Firebase Firestore `onSnapshot()` for real-time updates
- Messages appear instantly without page refresh
- Messages are automatically scrolled to the latest

### Session Management
- User session stored in localStorage
- Contains username and UUID
- Auto-initializes on app load
- Middleware protects chat route from unauthorized access

### State Management
- `authStore`: Manages user authentication and session
- `chatStore`: Manages messages and real-time subscriptions

### Route Protection
- Router guard checks if user is authenticated
- Redirects to Create Account if not logged in
- Redirects to Chat if already logged in

## Firestore Database Schema

### Users Collection
```json
{
  "id": "uuid-xxxx-xxxx",
  "username": "john_doe",
  "createdAt": 1234567890
}
```

### Messages Collection
```json
{
  "id": "uuid-xxxx-xxxx",
  "userId": "uuid-xxxx-xxxx",
  "username": "john_doe",
  "content": "Hello, everyone!",
  "timestamp": 1234567890
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## Troubleshooting

**Issue:** Messages not loading
- **Solution:** Check Firebase configuration and ensure Firestore rules allow read access

**Issue:** Session not persisting
- **Solution:** Check if localStorage is enabled in browser

**Issue:** "Username already taken" error
- **Solution:** Choose a different username or clear browser data

**Issue:** Real-time updates not working
- **Solution:** Ensure Firebase connection is stable and Firestore is properly configured
