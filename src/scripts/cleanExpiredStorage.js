#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bfhpxremrpbgouvwufmd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaHB4cmVtcnBiZ291dnd1Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzIyNzQsImV4cCI6MjA4Mjc0ODI3NH0.kBEyauWHighJfDDlKlhZmjw1ZqzXNJ45ixhoPyWZsGo'
const BUCKET_NAME = 'chat-images'
const EXPIRATION_MS = 24 * 60 * 60 * 1000 // 24 hours

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function cleanExpiredFiles() {
  try {
    console.log('\n🧹 Cleaning Supabase Storage (>24h)\n')
    console.log('='.repeat(60))

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('public/', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'asc' },
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('📭 No files found in storage')
      return
    }

    const now = Date.now()
    const filesToDelete = []

    files.forEach(file => {
      if (file.name.startsWith('.')) return
      if (!file.created_at) return

      const createdAt = new Date(file.created_at).getTime()
      const ageMs = now - createdAt

      if (ageMs > EXPIRATION_MS) {
        filesToDelete.push({
          name: file.name,
          path: `public/${file.name}`,
          ageHours: Math.floor(ageMs / (1000 * 60 * 60))
        })
      }
    })

    if (filesToDelete.length === 0) {
      console.log('✅ No expired files found (all files are <24h)')
      console.log('\n📊 Current files:')
      files.filter(f => !f.name.startsWith('.')).forEach(f => {
        const age = Math.floor((now - new Date(f.created_at).getTime()) / (1000 * 60 * 60))
        console.log(`   • ${f.name} (${age}h old)`)
      })
      return
    }

    console.log(`🗑️  Found ${filesToDelete.length} expired files:\n`)
    filesToDelete.forEach(f => {
      console.log(`   • ${f.name} (${f.ageHours}h old)`)
    })

    console.log('\n⏳ Deleting...')

    const pathsToDelete = filesToDelete.map(f => f.path)
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete)

    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError)
      return
    }

    console.log(`\n✅ Successfully deleted ${filesToDelete.length} expired files`)

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

cleanExpiredFiles()
