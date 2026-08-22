#!/usr/bin/env node
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBSEfKpieZ3bKuEbGHcMAnv_uI9nxifR1M",
  authDomain: "chitchut-2b9e2-5000a.firebaseapp.com",
  projectId: "chitchut-2b9e2-5000a",
  storageBucket: "chitchut-2b9e2-5000a.firebasestorage.app",
  messagingSenderId: "88271262769",
  appId: "1:88271262769:web:452d4891827d42071af110",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function checkMessages() {
  try {
    console.log('\n📊 Messages Status\n')
    console.log('='.repeat(60))

    // Get total count
    const allMessages = await getDocs(collection(db, 'messages'))
    console.log(`📨 Total messages: ${allMessages.size}`)

    // Get latest 5 messages
    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(5)
    )
    const latestSnapshot = await getDocs(q)
    
    if (latestSnapshot.size > 0) {
      console.log('\n📥 Latest messages:')
      latestSnapshot.docs.forEach((doc, i) => {
        const data = doc.data()
        const date = new Date(data.timestamp)
        console.log(`   ${i + 1}. [${date.toLocaleDateString()}] ${data.username}: ${(data.content || '').substring(0, 50)}`)
      })
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkMessages()
