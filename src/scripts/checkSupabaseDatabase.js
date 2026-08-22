#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bfhpxremrpbgouvwufmd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaHB4cmVtcnBiZ291dnd1Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzIyNzQsImV4cCI6MjA4Mjc0ODI3NH0.kBEyauWHighJfDDlKlhZmjw1ZqzXNJ45ixhoPyWZsGo'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkDatabase() {
  try {
    console.log('\n Supabase Database Check\n')
    console.log('='.repeat(60))

    // Check messages table
    console.log('\n messages table:')
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(10)

    if (msgError) {
      console.error('❌ Error:', msgError.message)
    } else {
      console.log(`   Found ${messages?.length || 0} messages`)
      if (messages && messages.length > 0) {
        messages.forEach((msg, i) => {
          console.log(`   ${i + 1}. ${msg.username || 'Unknown'}: ${msg.content?.substring(0, 50) || 'No content'}`)
        })
      }
    }

    // Check users table
    console.log('\n users table:')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(10)

    if (userError) {
      console.error('❌ Error:', userError.message)
    } else {
      console.log(`   Found ${users?.length || 0} users`)
      if (users && users.length > 0) {
        users.forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.username || 'Unknown'} (ID: ${user.id?.substring(0, 8) || 'N/A'}...)`)
        })
      }
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

checkDatabase()
