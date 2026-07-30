# Firebase Setup - Quick Reference

## Yang Diperlukan (2 Collections)

### Collection 1: `users`
| Field | Type | Example |
|-------|------|---------|
| `id` | String (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `username` | String | `alice` |
| `createdAt` | Number (timestamp) | `1710604800000` |

### Collection 2: `messages`
| Field | Type | Example |
|-------|------|---------|
| `id` | String (UUID) | `550e8400-e29b-41d4-a716-446655440001` |
| `userId` | String (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `username` | String | `alice` |
| `content` | String | `Hello everyone!` |
| `timestamp` | Number | `1710604900000` |

---

## Setup Steps (5 Menit)

### 1️⃣ Open Firebase Console
```
Go to: https://console.firebase.google.com/
Select: chitchut-2b9e2 project
```

### 2️⃣ Open Firestore Database
```
Left menu → Firestore Database
If not exists → Click "Create database"
Mode: "Start in test mode"
Region: asia-southeast1 (or nearest)
```

### 3️⃣ Create Collection `users`
```
Click "+ Start collection"
Collection ID: users
Click "Next"
Click "Auto ID"
Add these fields:
  - id (String)
  - username (String)  
  - createdAt (Number)
Click "Save"
```

### 4️⃣ Create Collection `messages`
```
Click "+ Add collection"
Collection ID: messages
Click "Next"
Click "Auto ID"
Add these fields:
  - id (String)
  - userId (String)
  - username (String)
  - content (String)
  - timestamp (Number)
Click "Save"
```

### 5️⃣ Update Security Rules
```
Click "Rules" tab
Copy-paste this:

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

Click "Publish"
```

---

## Test It!

```bash
npm run dev
```

1. Open http://localhost:5173
2. Enter username → Click "Enter Chat"
3. Check Firebase Console
   - Go to `users` collection → should see new document
4. Send a message
5. Check `messages` collection → should see new document
6. Open another browser tab/window
7. Login different user → send message
8. Both tabs should see messages in real-time ✅

---

## Firebase vs Code Mapping

```
Code                          →  Firebase
─────────────────────────────────────────────
createUser(username)
  ├─ id: uuidv4()            →  users.id
  ├─ username                 →  users.username
  └─ createdAt: Date.now()    →  users.createdAt

sendMessage(userId, username, content)
  ├─ id: uuidv4()            →  messages.id
  ├─ userId                   →  messages.userId
  ├─ username                 →  messages.username
  ├─ content                  →  messages.content
  └─ timestamp: Date.now()    →  messages.timestamp

getUserByUsername(username)
  └─ WHERE username == 'alice'

getMessages()
  └─ ORDER BY timestamp ASC
     LIMIT 100

subscribeToMessages()
  └─ Real-time listener on messages collection
```

---

## Checklist

- [ ] Project chitchut-2b9e2 selected
- [ ] Firestore database created
- [ ] Collection `users` created
  - [ ] Field `id` (String)
  - [ ] Field `username` (String)
  - [ ] Field `createdAt` (Number)
- [ ] Collection `messages` created
  - [ ] Field `id` (String)
  - [ ] Field `userId` (String)
  - [ ] Field `username` (String)
  - [ ] Field `content` (String)
  - [ ] Field `timestamp` (Number)
- [ ] Security rules updated & published
- [ ] Test: Create user → see in `users` collection
- [ ] Test: Send message → see in `messages` collection
- [ ] Test: Real-time sync (2 tabs)

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Missing or insufficient permissions" | Update rules to allow read/write |
| "Collection not found" | Create collections first |
| Messages not real-time | Check fields have `timestamp` |
| Can't login | Check user exists in `users` collection |

---

## Details Guide

For complete step-by-step with screenshots:
👉 See: **FIREBASE_SETUP_GUIDE.md** in project root

---

**Total Setup Time**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to use! 🚀
