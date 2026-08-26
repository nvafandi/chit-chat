/**
 * Application Constants
 * Centralized configuration for the entire application
 */

// ============================================================================
// APPLICATION VERSION CONFIGURATION
// ============================================================================
/** Application version - update this for each major/minor release */
export const APP_VERSION = '20.07.26'
/** LocalStorage key for application version */
export const APP_VERSION_KEY = 'app_version'

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// export const SUPABASE_URL = 'https://tdvkcvorrznrhiffxgip.supabase.co'
// export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdmtjdm9ycnpucmhpZmZ4Z2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDQzODAsImV4cCI6MjA5MDU4MDM4MH0.cp0Iz8-hdvqGQLf0Psbrvln-3O8or4SkDlCT4prhJtE'
// export const SUPABASE_BUCKET_NAME = 'chat-images'

export const SUPABASE_URL = 'https://bfhpxremrpbgouvwufmd.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaHB4cmVtcnBiZ291dnd1Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzIyNzQsImV4cCI6MjA4Mjc0ODI3NH0.kBEyauWHighJfDDlKlhZmjw1ZqzXNJ45ixhoPyWZsGo'
export const SUPABASE_BUCKET_NAME = 'chat-images'

// ============================================================================
// FILE MANAGEMENT CONFIGURATION
// ============================================================================
/** Image file expiration time in milliseconds (1 day = 24 hours) */
export const IMAGE_EXPIRATION_TIME = 24 * 60 * 60 * 1000 // 1 day

/** Non-image file expiration time in milliseconds (1 day = 24 hours) */
export const FILE_EXPIRATION_TIME = 24 * 60 * 60 * 1000 // 1 day

/** Message expiration time in milliseconds (1 week) */
export const MESSAGE_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000 // 1 week

/** Periodic cleanup interval in milliseconds (30 minutes) */
export const PERIODIC_CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutes

/** Check for file expiration on new messages - auto-hide message and delete file */
export const CHECK_FILE_ON_NEW_MESSAGE = true

/** Auto-cleanup on component mount - auto-hide message and delete file */
export const AUTO_CLEANUP_ON_MOUNT = true

/** Enable aggressive file deletion from Supabase Storage */
export const ENABLE_AGGRESSIVE_FILE_DELETION = true

// ============================================================================
// IMAGE COMPRESSION CONFIGURATION
// ============================================================================
/** Maximum image width in pixels */
export const MAX_IMAGE_WIDTH = 1920

/** Maximum image height in pixels */
export const MAX_IMAGE_HEIGHT = 1080

/** JPEG compression quality (0-1) */
export const JPEG_QUALITY = 0.8

/** Maximum file size after compression in bytes (5MB) */
export const MAX_COMPRESSED_FILE_SIZE = 5 * 1024 * 1024

/** Maximum file size before upload in bytes (50MB) */
export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024

/** Hard maximum file size allowed for upload. Files above 50MB are auto-split into chunks. */
export const MAX_SPLIT_UPLOAD_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

/** Chunk size used when splitting large files (keeps each object safely under the 50MB limit) */
export const FILE_CHUNK_SIZE = 45 * 1024 * 1024

/** Signature embedded in chunked-file manifests to identify them during download */
export const FILE_MANIFEST_SIGNATURE = 'chit-chat-file-manifest'

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
// export const FIREBASE_CONFIG = {
//   apiKey: 'AIzaSyCl7pE5FI-z_3sc4Lxpl4VhJjAlhoiSJlo',
//   authDomain: 'chitchut-2b9e2.firebaseapp.com',
//   projectId: 'chitchut-2b9e2',
//   storageBucket: 'chitchut-2b9e2.firebasestorage.app',
//   messagingSenderId: '497752442910',
//   appId: '1:497752442910:web:5de089fbcc4cc77bde460f',
// }

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBSEfKpieZ3bKuEbGHcMAnv_uI9nxifR1M",
  authDomain: "chitchut-2b9e2-5000a.firebaseapp.com",
  projectId: "chitchut-2b9e2-5000a",
  storageBucket: "chitchut-2b9e2-5000a.firebasestorage.app",
  messagingSenderId: "88271262769",
  appId: "1:88271262769:web:452d4891827d42071af110",
};

// ============================================================================
// CALL CONFIGURATION
// ============================================================================
/** Jitsi Meet server domain used for channel calls */
export const JITSI_DOMAIN = 'meet.jit.si'

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================
/** Firebase collection names */
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  ROOMS: 'rooms',
  LIVE_LOCATIONS: 'liveLocations',
}

/** Default (public) room that all users land on */
export const DEFAULT_ROOM_ID = 'general'
export const DEFAULT_ROOM_NAME = 'General'

/** Maximum room/group name length */
export const MAX_ROOM_NAME_LENGTH = 30

/** Maximum number of messages to load initially */
export const MAX_INITIAL_MESSAGES = 1000

/** Messages per page for pagination (first load and subsequent loads) */
export const MESSAGES_PER_PAGE = 20

/** Scroll threshold to trigger "load more" (pixels from top) */
export const SCROLL_LOAD_THRESHOLD = 300

/** Debounce delay for scroll detection (milliseconds) */
export const SCROLL_DEBOUNCE_MS = 200

/** Cache control duration in seconds */
export const CACHE_CONTROL_DURATION = '3600'

// ============================================================================
// UI/ANIMATION CONFIGURATION
// ============================================================================
/** Default theme mode on app startup */
export const DEFAULT_THEME = 'dark' // dark || light

/** Copy toast notification timeout in milliseconds */
export const TOAST_TIMEOUT = 2000

/** Message highlight animation duration in milliseconds */
export const MESSAGE_HIGHLIGHT_DURATION = 2000

/** Scroll delay after new message in milliseconds */
export const SCROLL_DELAY = 50

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================
/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 3

/** Minimum username length */
export const MIN_USERNAME_LENGTH = 1

/** Maximum username length */
export const MAX_USERNAME_LENGTH = 50

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

/** Compressible image types (will be compressed) */
export const COMPRESSIBLE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

// ============================================================================
// API ENDPOINTS & PATHS
// ============================================================================
/** Default file storage path in Supabase */
export const FILE_STORAGE_PATH = 'public'

/** LocalStorage prefix for file metadata */
export const FILE_METADATA_PREFIX = 'file_meta_'

/** Session storage key */
export const SESSION_STORAGE_KEY = 'session_data'

// ============================================================================
// COOKIE-BASED SESSION CONFIGURATION
// ============================================================================
/** Cookie name for session storage */
export const SESSION_COOKIE_NAME = 'ygpw_session'

/** Cookie expiration time in milliseconds (30 mins for testing, 7 days for production) */
export const COOKIE_EXPIRATION_TIME = 2 * 24 * 60 * 60 * 1000 // 7 days (production)
// export const COOKIE_EXPIRATION_TIME = 30 * 60 * 1000 // 30 minutes (testing)

/** Cookie expiration check interval in milliseconds (1 min for testing, 5 mins for production) */
export const COOKIE_CHECK_INTERVAL = 2 * 60 * 1000 // 5 minutes (production)
// export const COOKIE_CHECK_INTERVAL = 1 * 60 * 1000 // 1 minute (testing)

// ============================================================================
// ERROR MESSAGES
// ============================================================================
export const ERROR_MESSAGES = {
  INVALID_FILE: 'Invalid file',
  FILE_TOO_LARGE: 'File is too large',
  INVALID_IMAGE_TYPE: 'Invalid image type',
  UPLOAD_FAILED: 'Upload failed',
  COMPRESSION_ERROR: 'Compression error',
  LOGIN_FAILED: 'Login failed',
  SEND_MESSAGE_FAILED: 'Failed to send message',
  LOAD_MESSAGES_FAILED: 'Failed to load messages',
  DELETE_MESSAGE_FAILED: 'Failed to delete message',
  USERNAME_EXISTS: 'Username already exists',
  INVALID_CREDENTIALS: 'Invalid username or password',
}

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================
export const SUCCESS_MESSAGES = {
  COPIED_TO_CLIPBOARD: '✅ Copied to clipboard!',
  MESSAGE_DELETED: '✅ Message has been deleted',
  FILE_UPLOADED: '✅ File uploaded successfully',
  LOGIN_SUCCESS: 'Login successful',
}

// ============================================================================
// COUNTDOWN CONFIGURATION
// ============================================================================
export const ENABLE_OPENING_COUNTDOWN = false
export const ENABLE_CLOSING_COUNTDOWN = false

// App Opening (Pembukaan) Configuration
export const TIME_OPEN = '2026-03-01T00:00:00'
export const OPENING_TEXT_MAIN = 'CHIT-CHuT'
export const OPENING_TEXT_SUB = 'Opening Celebration Countdown'

// App Closing (Penutupan) Configuration
export const TIME_CLOSE = '2026-07-24T10:30:00'
export const CLOSING_TEXT_MAIN = 'HAPPY RESIGN'
export const CLOSING_TEXT_SUB = ' & GEBYAR LEO'
export const CLOSING_TEXT_DESC = 'This application has been closed and migrated to the latest version. Please click the button below to open Chit-Chut V2.'

