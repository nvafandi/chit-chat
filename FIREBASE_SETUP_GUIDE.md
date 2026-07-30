# Firebase Firestore Setup Guide

## Overview

Aplikasi chat Anda memerlukan 2 collections di Firebase Firestore:
1. **users** - Menyimpan data pengguna
2. **messages** - Menyimpan pesan chat

## Database Schema

### Collection 1: `users`

```
Collection: users
├─ Document: [auto-generated-id] 
│  ├─ id (string) - UUID untuk mengidentifikasi user secara unik
│  ├─ username (string) - Nama pengguna (bersifat unik)
│  └─ createdAt (number) - Timestamp saat user dibuat
│
└─ Document: [auto-generated-id]
   ├─ id: "550e8400-e29b-41d4-a716-446655440000"
   ├─ username: "alice"
   └─ createdAt: 1710604800000
```

**Field Explanation:**
- `id`: UUID unik untuk setiap user (bukan document ID)
- `username`: Nama pengguna yang diinput (harus unik)
- `createdAt`: Waktu user pertama kali dibuat (Unix timestamp)

---

### Collection 2: `messages`

```
Collection: messages
├─ Document: [auto-generated-id]
│  ├─ id (string) - UUID untuk pesan
│  ├─ userId (string) - Reference ke user.id yang mengirim
│  ├─ username (string) - Nama user pengirim (untuk display)
│  ├─ content (string) - Isi pesan
│  └─ timestamp (number) - Waktu pesan dikirim
│
└─ Document: [auto-generated-id]
   ├─ id: "550e8400-e29b-41d4-a716-446655440001"
   ├─ userId: "550e8400-e29b-41d4-a716-446655440000"
   ├─ username: "alice"
   ├─ content: "Hello everyone!"
   └─ timestamp: 1710604900000
```

**Field Explanation:**
- `id`: UUID untuk pesan (untuk tracking)
- `userId`: Mengacu ke `users.id` (foreign key)
- `username`: Nama user pengirim (denormalized untuk efficiency)
- `content`: Isi pesan
- `timestamp`: Waktu pesan dikirim (Unix timestamp)

---

## Step-by-Step Setup

### Step 1: Buka Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **chitchut-2b9e2** (dari screenshot Anda)

### Step 2: Buka Firestore Database

1. Di sidebar kiri, klik **Firestore Database**
2. Klik **Create database** (jika belum ada)
3. Pilih mode: **Start in test mode** (untuk development)
4. Pilih location: **asia-southeast1** atau terdekat dengan Anda
5. Klik **Create**

### Step 3: Buat Collection `users`

#### Cara 1: Via Firebase Console UI

1. Di Firestore Dashboard, klik **+ Start collection**
2. Input Collection ID: **users**
3. Klik **Next**
4. Klik **Auto ID** untuk generate document ID
5. Add field pertama:
   - Field name: `id`
   - Type: **String**
   - Value: `550e8400-e29b-41d4-a716-446655440000` (example)

6. Klik **Add field** untuk field kedua:
   - Field name: `username`
   - Type: **String**
   - Value: `alice` (example)

7. Klik **Add field** untuk field ketiga:
   - Field name: `createdAt`
   - Type: **Number**
   - Value: `1710604800000` (example)

8. Klik **Save**

#### Template JSON (Copy-Paste Alternatif)

Jika lebih mudah, bisa langsung import dengan struktur:

```json
{
  "users": {
    "document_id_1": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "alice",
      "createdAt": 1710604800000
    }
  }
}
```

### Step 4: Buat Collection `messages`

1. Di Firestore Dashboard, klik **+ Add collection**
2. Input Collection ID: **messages**
3. Klik **Next**
4. Klik **Auto ID**
5. Add fields:

**Field 1:**
- Name: `id`
- Type: **String**
- Value: `550e8400-e29b-41d4-a716-446655440001` (example UUID)

**Field 2:**
- Name: `userId`
- Type: **String**
- Value: `550e8400-e29b-41d4-a716-446655440000` (reference ke users.id)

**Field 3:**
- Name: `username`
- Type: **String**
- Value: `alice` (pengirim pesan)

**Field 4:**
- Name: `content`
- Type: **String**
- Value: `Hello everyone!` (isi pesan)

**Field 5:**
- Name: `timestamp`
- Type: **Number**
- Value: `1710604900000` (Unix timestamp)

6. Klik **Save**

---

## Firebase Security Rules

### Development Mode (Test Mode)

Untuk testing, gunakan rules yang permissive (sudah default jika pilih "Start in test mode"):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Production Mode (Recommended)

Sebelum production, gunakan rules yang lebih aman:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read for all, write hanya jika authenticated
    match /users/{userId} {
      allow read: if true;
      allow create: if true;  // Boleh create user baru
      allow update, delete: if false;  // Jangan bisa edit/hapus
    }
    
    match /messages/{messageId} {
      allow read: if true;
      allow create: if true;  // Boleh kirim pesan baru
      allow update, delete: if false;  // Jangan bisa edit/hapus pesan
    }
  }
}
```

#### Cara Update Rules:

1. Di Firestore, klik tab **Rules**
2. Replace semua code dengan rules di atas
3. Klik **Publish**

---

## Verification Checklist

### ✅ Collections Created
- [ ] Collection `users` ada
- [ ] Collection `messages` ada

### ✅ Fields Structure
**users Collection:**
- [ ] Field `id` (String)
- [ ] Field `username` (String)
- [ ] Field `createdAt` (Number)

**messages Collection:**
- [ ] Field `id` (String)
- [ ] Field `userId` (String)
- [ ] Field `username` (String)
- [ ] Field `content` (String)
- [ ] Field `timestamp` (Number)

### ✅ Security Rules
- [ ] Rules updated (development atau production)
- [ ] Publish berhasil

---

## Testing Connection

Setelah setup, test dengan aplikasi:

1. **Run Development Server:**
   ```bash
   npm run dev
   ```

2. **Test Registration:**
   - Buka http://localhost:5173
   - Enter username "testuser"
   - Click "Enter Chat"
   - Check Firebase Console → tonton collection `users`
   - ✅ Harus ada document baru dengan field id, username, createdAt

3. **Test Message:**
   - Kirim pesan dari chat
   - Check Firebase Console → collection `messages`
   - ✅ Harus ada document baru dengan semua fields

4. **Test Real-Time Sync:**
   - Buka 2 tab browser berbeda
   - Login dengan user berbeda di tab 1 dan tab 2
   - Kirim pesan dari tab 1
   - ✅ Pesan harus muncul instantly di tab 2

---

## Firebase Structure Visual

```
chitchut-2b9e2 (Project)
└── Firestore Database
    ├── Collection: users
    │   ├── Document 1
    │   │   ├── id: "uuid-1"
    │   │   ├── username: "alice"
    │   │   └── createdAt: 1710604800000
    │   │
    │   └── Document 2
    │       ├── id: "uuid-2"
    │       ├── username: "bob"
    │       └── createdAt: 1710604850000
    │
    └── Collection: messages
        ├── Document 1
        │   ├── id: "msg-uuid-1"
        │   ├── userId: "uuid-1"
        │   ├── username: "alice"
        │   ├── content: "Hello!"
        │   └── timestamp: 1710604900000
        │
        ├── Document 2
        │   ├── id: "msg-uuid-2"
        │   ├── userId: "uuid-2"
        │   ├── username: "bob"
        │   ├── content: "Hi alice!"
        │   └── timestamp: 1710604950000
        │
        └── Document 3
            ├── id: "msg-uuid-3"
            ├── userId: "uuid-1"
            ├── username: "alice"
            ├── content: "How are you?"
            └── timestamp: 1710605000000
```

---

## Code Mapping

Berikut mapping antara code TypeScript dan Firestore schema:

### User Creation Flow

```typescript
// src/services/firebase.ts - createUser()

const newUser: User = {
  id: uuidv4(),           // ← Field: "id" (String)
  username,               // ← Field: "username" (String)
  createdAt: Date.now()   // ← Field: "createdAt" (Number)
}

await addDoc(collection(db, 'users'), newUser)
// ↑ Tambah ke collection "users" di database
```

### Message Creation Flow

```typescript
// src/services/firebase.ts - sendMessage()

const newMessage: Message = {
  id: uuidv4(),           // ← Field: "id" (String)
  userId,                 // ← Field: "userId" (String) - Reference ke users.id
  username,               // ← Field: "username" (String) - Denormalized
  content,                // ← Field: "content" (String)
  timestamp: Date.now()   // ← Field: "timestamp" (Number)
}

await addDoc(collection(db, 'messages'), newMessage)
// ↑ Tambah ke collection "messages" di database
```

### Query Flow

```typescript
// src/services/firebase.ts - getUserByUsername()

const q = query(
  collection(db, 'users'),           // ← Query ke collection "users"
  where('username', '==', username)  // ← Cari field "username"
)
```

```typescript
// src/services/firebase.ts - getMessages()

const q = query(
  collection(db, 'messages'),         // ← Query ke collection "messages"
  orderBy('timestamp', 'asc'),        // ← Sort by field "timestamp"
  limit(100)                          // ← Ambil max 100 documents
)
```

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause**: Security rules terlalu restrictive
**Solution**: 
1. Klik tab **Rules** di Firestore
2. Use test mode rules (allow all read/write)
3. Klik **Publish**

### Error: "Collection not found"

**Cause**: Collections belum dibuat
**Solution**: Ikuti Step 3 dan Step 4 di atas untuk create collections

### Messages tidak sync real-time

**Cause**: subscribeToMessages() tidak berhasil
**Solution**:
1. Check browser console untuk error messages
2. Verify field `timestamp` ada di semua documents
3. Check Firebase rules allow read access

### Username tidak unique

**Issue**: Bisa buat 2 user dengan username sama
**Solution (Optional)**: 
Bisa tambah Firestore index rule, atau handle di aplikasi dengan cek:
```typescript
const existingUser = await getUserByUsername(username)
if (existingUser) throw new Error('Username already taken')
```

---

## Next Steps

1. ✅ Create collections `users` dan `messages`
2. ✅ Verify security rules
3. ✅ Test dengan npm run dev
4. ✅ Buka 2 tab browser untuk test real-time sync
5. ✅ Demo dengan beberapa users

Setelah setup selesai, aplikasi siap digunakan! 🚀
