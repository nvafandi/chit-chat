#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bfhpxremrpbgouvwufmd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaHB4cmVtcnBiZ291dnd1Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzIyNzQsImV4cCI6MjA4Mjc0ODI3NH0.kBEyauWHighJfDDlKlhZmjw1ZqzXNJ45ixhoPyWZsGo'
const BUCKET_NAME = 'chat-images'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function listFiles() {
  try {
    console.log(`\n Checking Supabase Storage: ${BUCKET_NAME}\n`)
    console.log('=' .repeat(60))

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('public/', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('📭 No files found in storage')
      return
    }

    console.log(`📂 Found ${files.length} files:\n`)

    let totalSize = 0
    const now = Date.now()

    files.forEach((file, index) => {
      if (file.name.startsWith('.')) return

      const createdAt = file.created_at ? new Date(file.created_at) : null
      const ageMs = createdAt ? now - createdAt.getTime() : 0
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
      const ageDays = Math.floor(ageHours / 24)

      const isExpired24h = ageMs > 24 * 60 * 60 * 1000

      console.log(`${index + 1}. ${file.name}`)
      console.log(`   Created: ${createdAt ? createdAt.toLocaleString() : 'Unknown'}`)
      console.log(`   Age: ${ageDays}d ${ageHours % 24}h`)
      console.log(`   Status: ${isExpired24h ? '⏰ EXPIRED (>24h)' : '✅ Active'}`)
      console.log('')
    })

    console.log('=' .repeat(60))
    console.log(`📊 Summary: ${files.length} files total`)

    const activeFiles = files.filter(f => {
      if (!f.created_at || f.name.startsWith('.')) return false
      return (now - new Date(f.created_at).getTime()) <= 24 * 60 * 60 * 1000
    })

    const expiredFiles = files.filter(f => {
      if (!f.created_at || f.name.startsWith('.')) return false
      return (now - new Date(f.created_at).getTime()) > 24 * 60 * 60 * 1000
    })

    console.log(`✅ Active: ${activeFiles.length} files`)
    console.log(`⏰ Expired: ${expiredFiles.length} files`)
    console.log('')

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

listFiles()
