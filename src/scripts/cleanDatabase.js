#!/usr/bin/env node
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCl7pE5FI-z_3sc4Lxpl4VhJjAlhoiSJlo",
  authDomain: "chitchut-2b9e2.firebaseapp.com",
  projectId: "chitchut-2b9e2",
  storageBucket: "chitchut-2b9e2.firebasestorage.app",
  messagingSenderId: "497752442910",
  appId: "1:497752442910:web:5de089fbcc4cc77bde460f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanUsers() {
  try {
    console.log('🗑️  Deleting all users...')
    const querySnapshot = await getDocs(collection(db, 'users'))
    let count = 0

    for (const docRef of querySnapshot.docs) {
      await deleteDoc(doc(db, 'users', docRef.id))
      count++
    }

    console.log(`✅ Deleted ${count} users`)
  } catch (error) {
    console.error('❌ Error deleting users:', error)
    throw error
  }
}

async function cleanMessages() {
  try {
    console.log('🗑️  Deleting all messages...')
    const querySnapshot = await getDocs(collection(db, 'messages'))
    let count = 0

    for (const docRef of querySnapshot.docs) {
      await deleteDoc(doc(db, 'messages', docRef.id))
      count++
    }

    console.log(`✅ Deleted ${count} messages`)
  } catch (error) {
    console.error('❌ Error deleting messages:', error)
    throw error
  }
}

async function cleanAll() {
  try {
    console.log('🧹 Cleaning entire database...\n')
    await cleanUsers()
    await cleanMessages()
    console.log('\n✨ Database cleaned successfully!')
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    throw error
  }
}

// Determine which action to run
const action = process.argv[2]

try {
  switch (action) {
    case 'all':
      await cleanAll()
      break
    case 'users':
      await cleanUsers()
      console.log('\n✨ Users cleaned successfully!')
      break
    case 'messages':
      await cleanMessages()
      console.log('\n✨ Messages cleaned successfully!')
      break
    default:
      console.log(`
Usage: npm run clean -- [action]

Actions:
  all       - Delete all users and messages
  users     - Delete only users
  messages  - Delete only messages

Examples:
  npm run clean:all
  npm run clean:users
  npm run clean:messages
      `)
  }
} catch (error) {
  console.error('Fatal error:', error)
  process.exit(1)
}
