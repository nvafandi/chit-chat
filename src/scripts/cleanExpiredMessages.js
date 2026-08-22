#!/usr/bin/env node
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  orderBy,
} from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSEfKpieZ3bKuEbGHcMAnv_uI9nxifR1M",
  authDomain: "chitchut-2b9e2-5000a.firebaseapp.com",
  projectId: "chitchut-2b9e2-5000a",
  storageBucket: "chitchut-2b9e2-5000a.firebasestorage.app",
  messagingSenderId: "88271262769",
  appId: "1:88271262769:web:452d4891827d42071af110",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const MESSAGE_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000 // 1 week

async function cleanExpiredMessages() {
  try {
    console.log('\n🧹 Cleaning Messages (>1 week)\n')
    console.log('='.repeat(60))

    const expirationTime = Date.now() - MESSAGE_EXPIRATION_TIME
    const expirationDate = new Date(expirationTime)
    
    console.log(`📅 Expiration date: ${expirationDate.toLocaleString()}`)
    console.log(`📅 Current date: ${new Date().toLocaleString()}\n`)

    // Query messages older than expiration time
    const q = query(
      collection(db, 'messages'),
      where('timestamp', '<', expirationTime),
      orderBy('timestamp', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log('📭 No expired messages found')
      console.log('\n' + '='.repeat(60))
      return
    }

    const docs = querySnapshot.docs
    let pinnedCount = 0
    let deletableCount = 0

    // Count pinned vs deletable
    docs.forEach(doc => {
      const data = doc.data()
      if (data.pinned === true) {
        pinnedCount++
      } else {
        deletableCount++
      }
    })

    console.log(`🗑️  Found ${docs.length} expired messages (${pinnedCount} pinned, ${deletableCount} deletable)\n`)

    // Show first 10 messages
    const showLimit = Math.min(docs.length, 10)
    
    for (let i = 0; i < showLimit; i++) {
      const data = docs[i].data()
      const msgDate = new Date(data.timestamp)
      const ageDays = Math.floor((Date.now() - data.timestamp) / (1000 * 60 * 60 * 24))
      const pinnedTag = data.pinned ? ' 📌' : ''
      console.log(`   ${i + 1}. [${msgDate.toLocaleDateString()}] ${data.username || 'Unknown'}: ${(data.content || '').substring(0, 40)}... (${ageDays}d old)${pinnedTag}`)
    }

    if (docs.length > 10) {
      console.log(`   ... and ${docs.length - 10} more\n`)
    }

    console.log('\n⏳ Deleting (skipping pinned messages)...')

    // Delete in batches, skip pinned messages
    const batchSize = 20
    let deletedCount = 0
    let skippedCount = 0
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      
      for (const doc of batch) {
        const data = doc.data()
        
        // Skip pinned messages
        if (data.pinned === true) {
          skippedCount++
          continue
        }
        
        await deleteDoc(doc.ref)
        deletedCount++
      }
      
      process.stdout.write(`\r   Progress: ${deletedCount}/${deletableCount}`)
    }

    console.log('\n')
    console.log('='.repeat(60))
    console.log(`✅ Deleted ${deletedCount} expired messages`)
    if (skippedCount > 0) {
      console.log(`📌 Skipped ${skippedCount} pinned messages`)
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

cleanExpiredMessages()
