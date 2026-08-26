<template>
  <!-- Global Drop Zone Overlay -->
  <transition name="fade">
    <div v-if="isGlobalDragover" class="global-drop-zone-overlay">
      <div class="drop-zone-content">
        <v-icon size="120" color="white" opacity="0.9">mdi-cloud-upload-outline</v-icon>
        <h2 class="drop-zone-title">Drop Your File Here</h2>
        <p class="drop-zone-subtitle">Images, documents, photos - drop anything to upload</p>
      </div>
    </div>
  </transition>

  <div class="chat-container" :class="{ 'light-mode': !isDark }">
    <!-- Channel Sidebar (Discord style) -->
    <aside class="channel-sidebar" :class="{ open: isSidebarOpen, hidden: !isSidebarVisible }">
      <div class="sidebar-server-header">
        <span class="server-name">CHIT CHuT</span>
        <v-icon size="16" class="server-chevron">mdi-chevron-down</v-icon>
      </div>

      <div class="channel-list">
        <div class="channel-category">Channels</div>
        <button
          v-for="room in channels"
          :key="room.id"
          class="channel-item"
          :class="{ active: room.id === chatStore.currentRoomId }"
          @click="handleRoomClick(room); isSidebarOpen = false"
        >
          <span class="channel-hash">#</span>
          <span class="channel-name">{{ room.name }}</span>
          <v-icon
            v-if="room.type === 'group'"
            size="12"
            color="#949ba4"
            title="Private channel"
          >mdi-lock-outline</v-icon>
          <span
            v-if="room.id !== DEFAULT_ROOM_ID"
            class="channel-gear"
            @click.stop="openMembersDialog(room)"
            :title="room.type === 'group' ? 'Manage members' : 'Channel info'"
          >
            <v-icon size="14">mdi-cog-outline</v-icon>
          </span>
        </button>
      </div>

      <button class="add-channel-btn" @click="openCreateDialog()">
        <v-icon size="16">mdi-plus</v-icon>
        <span>Add Channel</span>
      </button>

      <div class="sidebar-footer">
        <div class="footer-user">
          <div class="footer-avatar">{{ authStore.user?.animal }}</div>
          <span class="footer-username">{{ authStore.user?.username }}</span>
        </div>
        <div class="footer-actions">
          <v-btn icon size="x-small" variant="text" @click="handleLogout" class="footer-btn" title="Logout">
            <v-icon size="18">mdi-logout</v-icon>
          </v-btn>
        </div>
      </div>
    </aside>

    <!-- Mobile backdrop -->
    <transition name="fade">
      <div v-if="isSidebarOpen" class="sidebar-backdrop" @click="isSidebarOpen = false"></div>
    </transition>

    <!-- Main chat area -->
    <main class="chat-main">
      <header class="channel-header">
        <v-btn
          class="sidebar-hamburger"
          icon
          size="small"
          variant="text"
          @click="toggleSidebar"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
        <v-icon size="20" color="#949ba4">mdi-pound</v-icon>
        <h2 class="channel-title">{{ currentRoomName }}</h2>

        <div class="header-stats-mini">
          <span class="stat-pill" title="Messages">
            <v-icon size="12">mdi-message</v-icon>{{ chatStore.totalMessageCount }}
          </span>
          <span class="stat-pill" title="Users">
            <v-icon size="12">mdi-account-multiple</v-icon>{{ chatStore.users.length }}
          </span>
        </div>

        <div class="flex-spacer"></div>

        <!-- Search Bar -->
        <div class="search-container">          <v-text-field
            v-model="searchQuery"
            placeholder="Search (min 3 chars)"
            variant="solo"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            flat
            class="search-field"
            :disabled="isLoadingAllMessages"
            @update:model-value="handleSearch"
            @click:clear="handleSearchClear"
          />
          <div v-if="isLoadingAllMessages" class="search-loading-spinner">
            <v-progress-circular indeterminate size="20" color="primary" />
          </div>
          <div v-else-if="searchQuery.length >= 3" class="search-results-badge">
            {{ searchResults.length }}
          </div>
        </div>

        <!-- Start Call -->
        <v-btn
          icon
          size="small"
          variant="text"
          @click="startCall"
          class="header-icon-btn call-btn"
          title="Start channel call (voice + screen share)"
        >
          <v-icon size="18">mdi-phone-outline</v-icon>
        </v-btn>

        <!-- Theme Toggle -->
        <v-btn
          icon
          size="small"
          variant="text"
          @click="toggleTheme"
          class="header-icon-btn"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <v-icon size="18">{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
        </v-btn>
      </header>

      <!-- Messages Display -->
      <!-- Active call banner (Jitsi opens in a popup window) -->
      <transition name="fade">
        <div v-if="callActive" class="call-banner">
          <v-icon size="16" color="#23a55a">mdi-phone-in-talk-outline</v-icon>
          <span class="call-banner-text">Channel call is active</span>
          <a :href="callUrl" target="_blank" class="call-banner-rejoin">Rejoin</a>
          <div class="flex-spacer"></div>
          <v-btn icon size="x-small" variant="text" @click="endCall" title="Dismiss">
            <v-icon size="16">mdi-close</v-icon>
          </v-btn>
        </div>
      </transition>

      <!-- Messages Display -->
      <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
        <div v-if="chatStore.messages.length === 0" class="empty-state">
          <v-icon size="80" color="primary" opacity="0.3">mdi-chat-outline</v-icon>
          <p class="text-subtitle2 text-grey mt-4">No messages yet</p>
          <p class="text-caption text-grey">Start the conversation! 👋</p>
        </div>

        <transition-group name="message" tag="div" class="messages-list">
          <!-- Loading indicator when fetching older messages -->
          <div v-if="isLoadingMore" key="loading-indicator" class="loading-more-indicator m">
            <v-progress-circular indeterminate size="24" color="primary" />
            <span class="loading-text">Loading older messages...</span>
          </div>

          <!-- Search active info -->
          <div v-if="searchQuery.length >= 3" key="search-info" class="search-info-banner">
            <div v-if="isLoadingAllMessages" class="search-info-loading">
              <v-progress-circular indeterminate size="16" color="primary" />
              <span>Loading all messages...</span>
            </div>
            <div v-else class="search-info-results">
              <v-icon size="small">mdi-magnify</v-icon>
              <span>{{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }} found</span>
            </div>
          </div>

          <div v-for="(message, index) in displayMessages" :key="message.id">
            <!-- Date Separator -->
            <div v-if="shouldShowDateSeparator(index, displayMessages)" class="date-separator">
              <span class="date-text">{{ formatDateSeparator(message.timestamp) }}</span>
            </div>

            <div class="message-wrapper" :data-message-id="message.id">
              <div
                :class="['message-row', { 'own-message': isCurrentUser(message.userId) }]"
                @mouseenter="hoveredMessageId = message.id"
                @mouseleave="hoveredMessageId = null"
              >
                <div class="row-avatar" :style="{ background: getAvatarColor(message.userId) }">
                  {{ message.animal }}
                </div>
                <div class="row-body">
                  <div class="row-head">
                    <span class="row-author" :style="{ color: getAvatarColor(message.userId) }">{{ message.username }}</span>
                    <v-icon v-if="message.pinned" size="x-small" color="red" title="Pinned message">mdi-pin</v-icon>
                    <span class="row-ts">{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.replyCount && message.replyCount > 0" class="reply-badge">
                      {{ message.replyCount }} {{ message.replyCount === 1 ? 'Reply' : 'Replies' }}
                    </span>
                  </div>
                    <!-- Quoted Message (Reply To) -->
                    <div v-if="message.replyTo" class="quoted-message" @click="scrollToMessage(message.replyTo.id)">
                      <div class="quoted-content">
                        <span class="quoted-emoji">{{ message.replyTo.animal }}</span>
                        <div class="quoted-text">
                          <strong class="quoted-username">{{ message.replyTo.username }}</strong>
                          <p class="quoted-msg">{{ message.replyTo.content }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Image Display -->
                    <div v-if="message.imageUrl && !message.hidden" class="image-display mb-2" @click="openImageModal(message.imageUrl)">
                      <ResolvedImage :src="message.imageUrl" :alt="message.imageName || 'Image'" class="chat-image" />
                      <v-overlay 
                        contained 
                        class="align-center justify-center"
                        scrim="rgba(0, 0, 0, 0.46)"
                      >
                        <v-icon size="large" color="white">mdi-magnify-plus</v-icon>
                      </v-overlay>
                      <div v-if="message.imageSize" class="image-size-badge">
                        <v-icon size="x-small">mdi-image</v-icon>
                        {{ formatFileSize(message.imageSize) }}
                      </div>
                    </div>

                    <!-- File Download Section (for non-image files) -->
                    <div v-if="message.fileUrl && !message.hidden" class="file-download-section mb-2">
                      <v-card 
                        class="file-card"
                        @click.stop="downloadFile(message.fileUrl, message.fileName)"
                      >
                        <v-card-text class="d-flex align-center justify-space-between pa-3">
                          <div class="d-flex align-center">
                            <v-icon size="large" color="primary" class="mr-3">mdi-file-download</v-icon>
                            <div>
                              <p class="file-name">{{ message.fileName }}</p>
                              <p class="file-size">{{ formatFileSize(message.fileSize || 0) }}</p>
                            </div>
                          </div>
                          <v-icon size="x-large" color="primary" opacity="0.5">mdi-chevron-down</v-icon>
                        </v-card-text>
                        <div v-if="downloadingFile === message.fileUrl" class="download-progress-overlay">
                          <div class="download-progress-content">
                            <div class="download-progress-info">
                              <v-icon size="small" color="white">mdi-download</v-icon>
                              <span>Downloading… {{ downloadProgress }}%</span>
                            </div>
                            <v-progress-linear
                              :model-value="downloadProgress"
                              :max="100"
                              height="6"
                              rounded
                              color="primary"
                              bg-color="rgba(255, 255, 255, 0.25)"
                              class="mt-1"
                            />
                          </div>
                        </div>
                      </v-card>
                    </div>

                    <!-- New Attachments Section (Multiple Files) -->
                    <div v-if="message.attachments && message.attachments.length > 0 && !message.hidden" class="attachments-section mb-2">
                      <div class="attachments-container">
                        <!-- Images Grid -->
                        <div v-if="message.attachments.some(a => a.type === 'image')" class="images-grid">
                          <div 
                            v-for="attachment in message.attachments.filter(a => a.type === 'image')" 
                            :key="attachment.id"
                            class="attachment-image"
                            @click="openImageModal(attachment.url)"
                            :title="attachment.name"
                          >
                            <ResolvedImage :src="attachment.url" :alt="attachment.name" class="chat-image" />
                            <div class="image-overlay">
                              <v-icon size="large" color="white">mdi-magnify-plus</v-icon>
                            </div>
                            <div class="image-size-badge">
                              <v-icon size="x-small">mdi-image</v-icon>
                              {{ formatFileSize(attachment.compressedSize || attachment.size) }}
                            </div>
                          </div>
                        </div>

                        <!-- Files List -->
                        <div v-if="message.attachments.some(a => a.type === 'file')" class="files-list">
                          <v-card 
                            v-for="attachment in message.attachments.filter(a => a.type === 'file')" 
                            :key="attachment.id"
                            class="file-card"
                            @click.stop="downloadAttachment(attachment)"
                            elevation="0"
                          >
                            <v-card-text class="d-flex align-center justify-space-between pa-3">
                              <div class="d-flex align-center flex-grow-1">
                                <v-icon size="large" color="primary" class="mr-3">mdi-file-download</v-icon>
                                <div class="file-info" style="min-width: 0;">
                                  <p class="file-name" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ attachment.name }}</p>
                                  <p class="file-size">{{ formatFileSize(attachment.size) }}</p>
                                </div>
                              </div>
                              <v-icon size="x-large" color="primary" opacity="0.5" class="file-download-icon">mdi-chevron-down</v-icon>
                            </v-card-text>
                            <div v-if="downloadingFile === attachment.url" class="download-progress-overlay">
                              <div class="download-progress-content">
                                <div class="download-progress-info">
                                  <v-icon size="small" color="white">mdi-download</v-icon>
                                  <span>Downloading… {{ downloadProgress }}%</span>
                                </div>
                                <v-progress-linear
                                  :model-value="downloadProgress"
                                  :max="100"
                                  height="6"
                                  rounded
                                  color="primary"
                                  bg-color="rgba(255, 255, 255, 0.25)"
                                  class="mt-1"
                                />
                              </div>
                            </div>
                          </v-card>
                        </div>
                      </div>
                    </div>

                    <!-- Message Content -->

                    <div v-if="!message.hidden" class="message-content-wrapper">
                      <!-- Sticker Display -->
                      <StickerMessage
                        v-if="isStickerMessage(message.content)"
                        :content="message.content"
                        :sticker-data="message.stickerData"
                      />
                      <!-- Live Location Display -->
                      <LiveLocationMessage
                        v-else-if="message.isLiveLocation && message.location"
                        :location="message.location"
                        :message-id="message.id"
                        :is-own-message="message.userId === authStore.user?.id"
                      />
                      <!-- Shared Location Display -->
                      <LocationMessage
                        v-else-if="message.location"
                        :location="message.location"
                      />
                      <!-- SQL Query Display -->
                      <QueryMessage
                        v-else-if="detectContentType(message.content).type === 'sql'"
                        :content="detectContentType(message.content).content"
                      />
                      <!-- JSON/Code Block Display -->
                      <JsonMessage
                        v-else-if="hasFormattedContent(message.content)"
                        :content="detectContentType(message.content).content"
                        :type="detectContentType(message.content).type"
                        :language="detectContentType(message.content).language"
                      />
                      <!-- Curl Request Display -->
                      <CurlMessage
                        v-else-if="isCurlRequest(message.content)"
                        :curl="message.content"
                      />
                      <!-- Mention Message Display (Mentions + URLs) -->
                      <MentionMessage
                        v-else-if="containsMentions(message.content) || containsUrls(message.content)"
                        :content="message.content"
                        :users="chatStore.users && chatStore.users.length > 0 ? chatStore.users : extractUsersFromMessages(chatStore.messages)"
                        :is-sent="isCurrentUser(message.userId)"
                      />
                      <!-- Regular Message -->
                      <p v-else class="message-content mb-0">{{ message.content }}</p>
                    </div>
                    <p v-else class="message-content mb-0 message-deleted-text">message has been deleted</p>

                    <!-- Actions -->
                    <div class="d-flex justify-end gap-2 action-buttons">
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        class="action-btn"
                        @click="setReply(message)"
                        title="Reply"
                      >
                        <v-icon size="small">mdi-reply</v-icon>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        class="action-btn"
                        @click="handleMessageCopy(message)"
                        title="Copy message"
                      >
                        <v-icon size="small">mdi-content-copy</v-icon>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        class="action-btn"
                        :class="{ 'pinned-btn-active': message.pinned }"
                        @click="togglePinMessage(message)"
                        :title="message.pinned ? 'Unpin message' : 'Pin message'"
                      >
                        <v-icon size="small" :color="message.pinned ? 'red' : undefined">{{ message.pinned ? 'mdi-pin-off' : 'mdi-pin' }}</v-icon>
                      </v-btn>
                      <v-btn
                        v-if="message.fileUrl"
                        icon
                        size="x-small"
                        variant="text"
                        class="action-btn"
                        @click="handleFileDownload(message)"
                        title="Download file"
                      >
                        <v-icon size="small">mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-if="!message.hidden && isCurrentUser(message.userId)"
                        icon
                        size="x-small"
                        variant="text"
                        class="action-btn"
                        @click="confirmDeleteMessage(message.id)"
                        title="Delete message (hidden from view)"
                      >
                        <v-icon size="small">mdi-delete</v-icon>
                      </v-btn>
                    </div>

                </div>
              </div>
            </div>
          </div>
        </transition-group>
      </div>

      <!-- Message Input -->
      <div class="input-section">
        <!-- File Preview Section -->
        <v-expand-transition>
          <div v-if="selectedFiles.length > 0" class="file-preview-section">
            <v-card class="file-preview-card">
              <div class="preview-header">
                <h4>📎 {{ selectedFiles.length }} File(s) Selected</h4>
                <v-btn icon size="small" @click="cancelFileSelect" variant="plain">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
              <div class="preview-content">
                <!-- Files List -->
                <div class="files-list">
                  <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                    <!-- Image Preview -->
                    <div v-if="isFileImage(file) && filePreviews[index]" class="image-preview">
                      <img :src="filePreviews[index]" :alt="file.name" class="preview-image" />
                    </div>
                    <!-- File Info -->
                    <div class="preview-info">
                      <p class="info-item">
                        <strong>Nama File:</strong> {{ file.name }}
                      </p>
                      <p class="info-item">
                        <strong>Ukuran Asli:</strong> {{ formatFileSize(file.size) }}
                      </p>
                      <!-- Compression Info (only for images) -->
                      <div v-if="isFileImage(file) && compressionInfos[index]" class="info-item compression-info">
                        <strong>Setelah Compress:</strong>
                        <p>{{ formatFileSize(compressionInfos[index].compressedSize) }}</p>
                        <p class="compression-ratio">
                          📉 Terhemat: {{ compressionInfos[index].compressionRatio.toFixed(1) }}%
                        </p>
                      </div>
                      <!-- Loading indicator -->
                      <v-progress-linear
                        v-if="isCompressing && isFileImage(file)"
                        indeterminate
                        class="mt-2"
                      />
                      <!-- Upload Progress Bar -->
                      <div v-if="isUploading && uploadProgress[index] !== undefined" class="upload-progress-section mt-2">
                        <div class="progress-info">
                          <span class="progress-label">📤 Uploading...</span>
                          <span class="progress-percentage">{{ uploadProgress[index] }}%</span>
                        </div>
                        <v-progress-linear
                          :model-value="uploadProgress[index]"
                          :max="100"
                          color="success"
                          class="mt-1"
                        />
                      </div>
                      <!-- Remove button -->
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeFile(index)"
                        class="mt-2"
                        :disabled="isUploading"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </v-card>
          </div>
        </v-expand-transition>

        <!-- Quoted Message Display -->
        <v-slide-y-reverse-transition>
          <div v-if="replyingTo" class="quoted-reply-box">
            <div class="quoted-reply-content">
              <div class="quoted-reply-info">
                <span class="quoted-reply-emoji">{{ replyingTo.animal }}</span>
                <div class="quoted-reply-text">
                  <strong>{{ replyingTo.username }}</strong>
                  <p>{{ replyingTo.content }}</p>
                </div>
              </div>
              <v-btn
                icon
                size="small"
                variant="plain"
                @click="cancelReply"
                class="quoted-reply-close"
              >
                <v-icon size="small">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
        </v-slide-y-reverse-transition>

        <v-form @submit.prevent="handleSendMessage" class="w-100">
          <div class="input-wrapper">
            <div class="message-input-group">
              <input 
                ref="fileInput"
                type="file" 
                accept="*/*"
                multiple
                style="display: none" 
                @change="handleFileSelect"
              />
              <v-tooltip text="Upload File">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    size="default"
                    variant="tonal"
                    color="primary"
                    class="upload-btn"
                    @click="fileInput?.click()"
                    :disabled="isLoading || isCompressing"
                    v-bind="props"
                  >
                    <v-icon>mdi-paperclip</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="Share Location">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    size="default"
                    variant="tonal"
                    color="primary"
                    class="location-btn"
                    @click="handleShareLocation"
                    :disabled="isLoading || isCompressing || isSharingLocation || isLiveTracking"
                    :loading="isSharingLocation"
                    v-bind="props"
                  >
                    <v-icon>mdi-map-marker</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip :text="isLiveTracking ? 'Stop Live Location' : 'Live Location'">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    size="default"
                    :variant="isLiveTracking ? 'flat' : 'tonal'"
                    :color="isLiveTracking ? 'success' : 'primary'"
                    class="location-btn live-toggle"
                    :class="{ 'is-live': isLiveTracking }"
                    @click="toggleLiveLocation"
                    :disabled="isLoading || isCompressing || isSharingLocation"
                    v-bind="props"
                  >
                    <v-icon>{{ isLiveTracking ? 'mdi-crosshairs-gps' : 'mdi-crosshairs' }}</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <div 
                class="message-input-wrapper"
                :class="{ 'drag-over': isDragover }"
                @dragover.prevent="isDragover = true"
                @dragleave.prevent="isDragover = false"
                @drop.prevent="handleDropFile"
              >
                <v-textarea
                  ref="messageInputRef"
                  v-model="messageInput"
                  :placeholder="replyingTo ? 'Reply to message... (Shift+Enter for new line)' : selectedFiles.length > 0 ? 'Add caption... (Shift+Enter for new line)' : 'Type a message... (Shift+Enter for new line)'"
                  variant="plain"
                  density="compact"
                  :disabled="isLoading"
                  hide-details
                  class="message-input"
                  rows="1"
                  auto-grow
                  max-rows="5"
                  @keydown="handleMessageKeydown"
                  @keyup="updateCursorPosition"
                  @input="updateCursorPosition"
                  @paste="handlePasteFile"
                />
                <button
                  class="emoji-inline-btn"
                  type="button"
                  @click.prevent="showStickerPicker = true"
                  :disabled="isLoading || isCompressing"
                  title="Send Sticker"
                >
                  <v-icon size="20">mdi-emoticon-happy-outline</v-icon>
                </button>
              </div>
            </div>
            <v-btn
              type="submit"
              icon
              color="primary"
              :loading="isLoading || isCompressing"
              :disabled="(!messageInput.trim() && selectedFiles.length === 0) || isLoading || isCompressing"
              size="default"
              class="send-btn"
              title="Send message (Press Enter or click button)"
              variant="elevated"
            >
              <v-icon size="default" color="white">mdi-send-circle</v-icon>
            </v-btn>
          </div>
        </v-form>

        <!-- Mention Dropdown Autocomplete -->
        <MentionDropdown
          :text="messageInput"
          :cursor-position="inputCursorPosition"
          :users="chatStore.users"
          :current-user-id="authStore.user?.id"
          @select="handleMentionSelect"
        />

        <v-expand-transition>
          <v-alert
            v-if="error"
            type="error"
            closable
            class="mt-3 alert-error"
            @click:close="error = ''"
            icon="mdi-alert-circle"
          >
            {{ error }}
          </v-alert>
        </v-expand-transition>
      </div>
    </main>

    <!-- Sticker Picker Dialog -->
    <StickerPicker
      v-model="showStickerPicker"
      @select="handleSelectSticker"
    />

    <!-- Create Channel Dialog -->
    <v-dialog
      v-model="showCreateRoomDialog"
      max-width="420"
      persistent
    >
      <v-card>
        <v-card-title class="text-h6">Create Channel</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newRoomName"
            label="Channel name"
            variant="outlined"
            density="compact"
            counter="30"
            maxlength="30"
            hide-details="auto"
            autofocus
            @keyup.enter="handleCreateRoom"
          />

          <div class="text-subtitle2 mt-4 mb-2">Visibility</div>
          <v-btn-toggle
            v-model="createRoomVisibility"
            mandatory
            color="primary"
            density="compact"
            class="visibility-toggle"
          >
            <v-btn value="public" prepend-icon="mdi-hash">
              Public
            </v-btn>
            <v-btn value="private" prepend-icon="mdi-lock-outline">
              Private
            </v-btn>
          </v-btn-toggle>
          <p class="text-caption text-grey mt-2">
            {{
              createRoomVisibility === 'private'
                ? 'Only invited members can see and join this channel. You can add members anytime.'
                : 'Visible to everyone — users join automatically when they open it.'
            }}
          </p>

          <!-- Private: pick initial members -->
          <template v-if="createRoomVisibility === 'private'">
            <div class="text-subtitle2 mt-4 mb-1">Invite members (optional)</div>
            <div v-if="otherUsers.length === 0" class="text-caption text-grey">
              No other users registered yet.
            </div>
            <div v-else class="member-select-list">
              <v-checkbox
                v-for="user in otherUsers"
                :key="user.id"
                v-model="selectedMemberIds"
                :value="user.id"
                :label="`${user.animal} ${user.username}`"
                hide-details
                density="compact"
              />
            </div>
          </template>
        </v-card-text>
        <v-card-actions class="justify-end gap-2">
          <v-btn variant="tonal" @click="showCreateRoomDialog = false" :disabled="creatingRoom">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="creatingRoom"
            :disabled="!newRoomName.trim()"
            @click="handleCreateRoom"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Channel Info / Members Dialog -->
    <v-dialog
      v-model="showMembersDialog"
      max-width="420"
    >
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon size="small" class="mr-2">
            {{ isSelectedRoomPrivate ? 'mdi-lock-outline' : 'mdi-pound' }}
          </v-icon>
          {{ selectedRoom?.name || 'Channel' }}
        </v-card-title>
        <v-card-text v-if="selectedRoom">
          <p class="text-caption text-grey mb-2">
            {{ isSelectedRoomPrivate ? 'Private channel' : 'Public channel' }}
            · Created by {{ selectedRoom.createdByName }}
            · {{ selectedRoomMembers.length }} member(s)
          </p>

          <v-list density="compact" class="py-0 member-list">
            <v-list-item
              v-for="member in selectedRoomMembers"
              :key="member.id"
              :title="`${member.animal ?? ''} ${member.username}`"
              :subtitle="member.id === selectedRoom.createdBy ? 'Owner' : undefined"
            >
              <template v-slot:append>
                <v-btn
                  v-if="isSelectedRoomOwner && member.id !== selectedRoom.createdBy"
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  :disabled="isManagingMembers"
                  @click="handleRemoveMember(member.id)"
                  title="Remove from channel"
                >
                  <v-icon size="small">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <!-- Owner: add members anytime -->
          <template v-if="isSelectedRoomOwner">
            <div class="text-subtitle2 mt-4 mb-1">Add members</div>
            <v-autocomplete
              v-model="membersToAdd"
              :items="usersNotInSelectedRoom"
              item-title="label"
              item-value="id"
              label="Select users"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="compact"
              hide-details
              no-data-text="No more users to add"
            />
            <v-btn
              block
              color="primary"
              variant="tonal"
              class="mt-2"
              :loading="isManagingMembers"
              :disabled="membersToAdd.length === 0"
              @click="confirmAddMembers"
            >
              Add to channel
            </v-btn>
          </template>
        </v-card-text>
        <v-card-actions class="justify-end gap-2">
          <v-btn
            v-if="selectedRoom && !isSelectedRoomOwner && authStore.user && selectedRoom.members.includes(authStore.user.id)"
            color="warning"
            variant="tonal"
            prepend-icon="mdi-exit-run"
            :loading="isManagingMembers"
            @click="handleLeaveRoom"
          >
            Leave channel
          </v-btn>
          <v-btn
            v-if="isSelectedRoomOwner"
            color="error"
            variant="tonal"
            prepend-icon="mdi-delete-outline"
            :loading="isManagingMembers"
            @click="handleDeleteRoom"
          >
            Delete
          </v-btn>
          <v-btn variant="text" @click="showMembersDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="400"
      persistent
    >
      <v-card>
        <v-card-title class="text-h6">Delete Message</v-card-title>
        <v-card-text class="py-4">
          Are you sure you want to delete this message? This action cannot be undone.
        </v-card-text>
        <v-card-actions class="justify-end gap-2">
          <v-btn
            variant="tonal"
            @click="showDeleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="performDeleteMessage"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image Fullscreen Dialog -->
    <v-dialog 
      v-model="showImageModal" 
      fullscreen
      class="image-modal"
    >
      <v-card>
        <v-app-bar elevation="0" class="image-modal-header">
          <v-btn icon @click="showImageModal = false" variant="plain">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-spacer />
          <v-btn icon @click="downloadImage" variant="plain" title="Download">
            <v-icon>mdi-download</v-icon>
          </v-btn>
        </v-app-bar>
        <div class="image-modal-content">
          <ResolvedImage :src="selectedImageUrl" :alt="selectedImageAlt" class="modal-image" />
        </div>
      </v-card>
    </v-dialog>

    <!-- Copy Toast Notification -->
    <v-snackbar
      v-model="showCopyToast"
      :timeout="TOAST_TIMEOUT"
      location="bottom"
      variant="tonal"
    >
      {{ copyToastMessage }}
    </v-snackbar>

    <!-- Session Expired Toast Notification -->
    <v-snackbar
      v-model="showSessionExpiredToast"
      timeout="3000"
      location="top"
      color="warning"
      variant="elevated"
    >
      {{ sessionExpiredMessage }}
    </v-snackbar>

    <!-- New Message Toast Notification (WhatsApp style) -->
    <v-snackbar
      v-model="showNewMessageToast"
      :timeout="4000"
      location="top"
      color="primary"
      variant="elevated"
      class="new-message-toast"
    >
      <div class="toast-content-wrapper">
        <div class="toast-avatar">
          {{ toastAnimal }}
        </div>
        <div class="toast-message-content">
          <div class="toast-sender-name">{{ toastUsername }}</div>
          <div class="toast-message-text">{{ toastMessage }}</div>
        </div>
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import {
  sendMessage,
  getMessages,
  subscribeToMessages,
  subscribeToUsers,
  subscribeToMessageCount,
  getUserById,
  hideMessage,
  getMessagesBefore,
  pinMessage,
  unpinMessage,
  createRoom as fbCreateRoom,
  subscribeToRooms,
  joinRoom,
  leaveRoom,
  deleteRoom,
  addGroupMembers,
  removeGroupMember,
  backfillLegacyMessageRooms,
  startLiveLocation,
  updateLiveLocation,
  stopLiveLocation as fbStopLiveLocation,
} from '@/services/firebase'
import { uploadImage, uploadFile, resolveChunkedFile } from '@/services/supabase'
import { performFileCleanup, schedulePeriodicCleanup } from '@/services/fileCleanup'
import { validateSession } from '@/services/session'
import { clearAllStorage } from '@/services/storageCleanup'
import { 
  requestNotificationPermission,
  notifyNewMessage,
  notifyMentioned,
  isNotificationSupported,
  playNotificationSoundDouble,
  initAudioContext,
} from '@/services/notificationService'
import {
  PERIODIC_CLEANUP_INTERVAL,
  AUTO_CLEANUP_ON_MOUNT,
  CHECK_FILE_ON_NEW_MESSAGE,
  TOAST_TIMEOUT,
  MESSAGE_HIGHLIGHT_DURATION,
  SCROLL_DELAY,
  SCROLL_LOAD_THRESHOLD,
  SCROLL_DEBOUNCE_MS,
  DEFAULT_ROOM_ID,
  DEFAULT_ROOM_NAME,
  MAX_ROOM_NAME_LENGTH,
  JITSI_DOMAIN,
} from '@/utils/const'
import { compressImageMaximum, formatFileSize, isCompressibleImage, validateFileForUpload } from '@/utils/imageCompression'
import { isCurlRequest, getCurlCopyableText } from '@/utils/curlFormatter'
import { detectContentType, hasFormattedContent } from '@/utils/jsonFormatter'
import { containsUrls } from '@/utils/urlFormatter'
import { containsMentions, insertMention, extractMentions } from '@/utils/mentionFormatter'
import { isStickerMessage } from '@/utils/stickers'
import CurlMessage from '@/components/CurlMessage.vue'
import JsonMessage from '@/components/JsonMessage.vue'
import QueryMessage from '@/components/QueryMessage.vue'
import MentionMessage from '@/components/MentionMessage.vue'
import MentionDropdown from '@/components/MentionDropdown.vue'
import StickerMessage from '@/components/StickerMessage.vue'
import StickerPicker from '@/components/StickerPicker.vue'
import ResolvedImage from '@/components/ResolvedImage.vue'
import LocationMessage from '@/components/LocationMessage.vue'
import LiveLocationMessage from '@/components/LiveLocationMessage.vue'
import type { Message, ReplyTo, User, ChatRoom, MemberInfo, RoomType } from '@/types'
import type { CompressionResult } from '@/utils/imageCompression'
import type { Sticker } from '@/utils/stickers'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const theme = useTheme()

const isDark = ref<boolean>(false)
const isSidebarOpen = ref(false)
const isSidebarVisible = ref(true)

function toggleSidebar() {
  if (window.innerWidth <= 900) {
    isSidebarOpen.value = !isSidebarOpen.value
  } else {
    isSidebarVisible.value = !isSidebarVisible.value
  }
}
const callActive = ref(false)
const callUrl = ref('')

const messageInput = ref('')
const messageInputRef = ref<any>(null)
const inputCursorPosition = ref(0)
const isLoading = ref(false)
const error = ref<string | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const showCopyToast = ref(false)
const copyToastMessage = ref('Copied to clipboard!')
const showSessionExpiredToast = ref(false)
const sessionExpiredMessage = ref('⏰ Session has expired. Please login again.')
const showNewMessageToast = ref(false)
const toastMessage = ref('')
const toastAnimal = ref('')
const toastUsername = ref('')
const isPageVisible = ref<boolean>(true)
const replyingTo = ref<ReplyTo | null>(null)
const hoveredMessageId = ref<string | null>(null)

const isLoadingMore = ref(false)
const hasMoreMessages = ref(true)
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null

let isPrepending = false  
let shouldForceScroll = false  
let lastAction: 'idle' | 'prepend' | 'send' | 'receive' | 'init' = 'idle'

function setAction(action: typeof lastAction) {
  if (lastAction !== action) {
    console.log(`[Chat] State: ${lastAction} → ${action}`)
    lastAction = action
  }
}

let prependLockUntil = 0

let isMomentumScrolling = false
let momentumTimer: NodeJS.Timeout | null = null
const MOMENTUM_SETTLE_MS = 100  

let isLayoutSettling = false
let lastKnownHeight = 0
let stableHeightCount = 0
const LAYOUT_STABLE_THRESHOLD = 2  

let pendingPrependRequest = false

let lastKnownScrollTop = 0
const USER_SCROLL_THRESHOLD = 10  

let lastUserScrollTime = 0
const USER_SCROLL_TIME_WINDOW = 150  

let isFetching = false

let imageHeightTracker = new WeakMap<HTMLImageElement, number>()

const searchQuery = ref('')
const searchResults = ref<Message[]>([])
const isSearching = ref(false)
const isLoadingAllMessages = ref(false)

let lastSentMessageId: string | null = null
let lastSubscriptionUpdateTime: number = 0
const SUBSCRIPTION_DEBOUNCE_MS = 500
let lastProcessedMessageIds: Set<string> = new Set()
let notifiedMessageIds: Set<string> = new Set()
const showDeleteDialog = ref(false)
const messageToDelete = ref<string | null>(null)

let stopPeriodicCleanup: (() => void) | null = null

let contentResizeObserver: ResizeObserver | null = null

let visualViewportHandler: (() => void) | null = null

let audioInitHandler: (() => void) | null = null

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const filePreviews = ref<string[]>([])
const compressionInfos = ref<CompressionResult[]>([])
const isCompressing = ref(false)
const isUploading = ref(false)
const uploadProgress = ref<number[]>([])  // Track progress for each file (0-100)
const downloadingFile = ref<string | null>(null)
const downloadProgress = ref<number>(0)
const isDragover = ref(false)
const isGlobalDragover = ref(false)
const showImageModal = ref(false)
const selectedImageUrl = ref<string>('')
const selectedImageAlt = ref<string>('')
const showStickerPicker = ref(false)

const pendingStickerData = ref<{
  id: string
  type: 'emoji' | 'image'
  content: string
  name: string
} | null>(null)

const isSharingLocation = ref(false)

const pendingLocation = ref<{
  latitude: number
  longitude: number
  label?: string
} | null>(null)

// ============================================================================
// LIVE LOCATION STATE
// ============================================================================
const isLiveTracking = ref(false)
const liveLocationMessageId = ref<string | null>(null)
let watchPositionId: number | null = null
let lastLiveLocationUpdate = 0
const LIVE_LOCATION_THROTTLE_MS = 10_000 // 10 seconds

// ============================================================================
// CHANNELS STATE
// ============================================================================
const CURRENT_ROOM_STORAGE_KEY = 'current_room_id'
let unsubscribeRooms: (() => void) | null = null

const showCreateRoomDialog = ref(false)
const newRoomName = ref('')
const creatingRoom = ref(false)
const createRoomVisibility = ref<'public' | 'private'>('public')
const selectedMemberIds = ref<string[]>([])

const showMembersDialog = ref(false)
const selectedRoomId = ref<string | null>(null)
const membersToAdd = ref<string[]>([])
const isManagingMembers = ref(false)

/** Fallback entry so General is always available even before channels load */
const generalRoom: ChatRoom = {
  id: DEFAULT_ROOM_ID,
  name: DEFAULT_ROOM_NAME,
  type: 'room',
  createdBy: '',
  createdByName: '',
  members: [],
  memberDetails: [],
  createdAt: 0,
}

const channels = computed<ChatRoom[]>(() => {
  const list = [...chatStore.rooms]
  if (!list.some(r => r.id === DEFAULT_ROOM_ID)) {
    list.unshift(generalRoom)
  }
  return list.sort((a, b) => a.createdAt - b.createdAt)
})

const currentRoomName = computed<string>(() => {
  if (chatStore.currentRoomId === DEFAULT_ROOM_ID) return DEFAULT_ROOM_NAME
  return chatStore.rooms.find(r => r.id === chatStore.currentRoomId)?.name || chatStore.currentRoomId
})

const selectedRoom = computed<ChatRoom | null>(() => {
  if (!selectedRoomId.value) return null
  return chatStore.rooms.find(r => r.id === selectedRoomId.value) ?? null
})

const selectedRoomMembers = computed<MemberInfo[]>(() => selectedRoom.value?.memberDetails ?? [])

const isSelectedRoomOwner = computed<boolean>(() => {
  return !!selectedRoom.value && selectedRoom.value.createdBy === authStore.user?.id
})

const isSelectedRoomPrivate = computed<boolean>(() => {
  return selectedRoom.value?.type === 'group'
})

const otherUsers = computed<User[]>(() => {
  return chatStore.users.filter(u => u.id !== authStore.user?.id)
})

const usersNotInSelectedRoom = computed<Array<{ id: string; label: string }>>(() => {
  if (!selectedRoom.value) return []
  const memberIds = new Set(selectedRoom.value.members || [])
  return chatStore.users
    .filter(u => !memberIds.has(u.id))
    .map(u => ({ id: u.id, label: `${u.animal} ${u.username}` }))
})

const displayMessages = computed(() => {
  return searchQuery.value.length >= 3 ? searchResults.value : chatStore.messages
})

/**
 * Update page visibility state
 */
function updatePageVisibility(): void {
  isPageVisible.value = !document.hidden
  console.log('[Chat] Page visibility changed:', isPageVisible.value ? 'visible' : 'hidden')
}

function isCurrentUser(userId: string): boolean {
  return userId === authStore.user?.id
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

function shouldShowDateSeparator(currentIndex: number, messages: typeof chatStore.messages): boolean {
  if (currentIndex === 0) return true
  
  const currentDate = new Date(messages[currentIndex].timestamp)
  const previousDate = new Date(messages[currentIndex - 1].timestamp)
  
  return currentDate.toDateString() !== previousDate.toDateString()
}

function getAvatarColor(userId: string): string {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
    'linear-gradient(135deg, #2e2e78 0%, #662d8c 100%)',
    'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
  ]
  
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

function toggleTheme() {
  isDark.value = !isDark.value
  theme.change(isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function setReply(message: Message) {
  replyingTo.value = {
    id: message.id,
    username: message.username,
    animal: message.animal || '',
    content: message.hidden ? 'message has been deleted' : message.content
  }
}

function cancelReply() {
  replyingTo.value = null
}

function handleSessionExpiredWithToast() {
  console.warn('[Chat] Session expired detected in message update. Showing toast and redirecting...')
  showSessionExpiredToast.value = true
  
  setTimeout(() => {
    clearAllStorage()
    router.push('/create-account')
  }, 2000)
}

async function validateUserDataConsistency(): Promise<boolean> {
  if (!authStore.user) {
    console.warn('[Chat] User not found in auth store')
    handleSessionExpiredWithToast()
    return false
  }

  try {
    const dbUser = await getUserById(authStore.user.id)

    if (!dbUser) {
      console.warn('[Chat] User not found in database. User may have been deleted.')
      sessionExpiredMessage.value = '❌ Your account has been deleted. Please login with another account.'
      handleSessionExpiredWithToast()
      return false
    }

    const passwordMismatch = authStore.user.password && authStore.user.password !== dbUser.password
    
    if (
      dbUser.id !== authStore.user.id ||
      dbUser.username !== authStore.user.username ||
      dbUser.animal !== authStore.user.animal ||
      passwordMismatch
    ) {
      console.warn('[Chat] User data mismatch detected!', {
        cookieData: {
          id: authStore.user.id,
          username: authStore.user.username,
          animal: authStore.user.animal,
          password: authStore.user.password ? '***' : 'not-set',
        },
        dbData: {
          id: dbUser.id,
          username: dbUser.username,
          animal: dbUser.animal,
          password: dbUser.password ? '***' : 'not-set',
        },
      })
      
      if (passwordMismatch) {
        sessionExpiredMessage.value = '🔐 Your password has changed. Please login again.'
      } else {
        sessionExpiredMessage.value = '⚠️ Your account information has changed. Please login again.'
      }
      
      handleSessionExpiredWithToast()
      return false
    }

    return true
  } catch (err) {
    console.error('[Chat] Error validating user data:', err)
    handleSessionExpiredWithToast()
    return false
  }
}

function isFileImage(file: File): boolean {
  return file.type.startsWith('image/')
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    return
  }

  error.value = null
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    const validation = validateFileForUpload(file)
    if (!validation.valid) {
      error.value = validation.error || 'Invalid file'
      continue
    }

    selectedFiles.value.push(file)
    uploadProgress.value.push(0)  // Initialize upload progress

    if (validation.isImage) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      if (isCompressibleImage(file)) {
        isCompressing.value = true
        try {
          const compressionResult = await compressImageMaximum(file)
          compressionInfos.value.push(compressionResult)
        } catch (err) {
          error.value = `Compression error for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          const index = selectedFiles.value.indexOf(file)
          if (index > -1) {
            selectedFiles.value.splice(index, 1)
            filePreviews.value.splice(index, 1)
            uploadProgress.value.splice(index, 1)  // Remove corresponding progress
          }
        } finally {
          isCompressing.value = false
        }
      } else {
        compressionInfos.value.push(null as any)
      }
    } else {
      filePreviews.value.push('')
      compressionInfos.value.push(null as any)
    }
  }

  target.value = ''
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
  filePreviews.value.splice(index, 1)
  compressionInfos.value.splice(index, 1)
  uploadProgress.value.splice(index, 1)
}

function handleGlobalDragEnter(event: DragEvent) {
  const items = event.dataTransfer?.types
  if (items && items.includes('Files')) {
    isGlobalDragover.value = true
    event.preventDefault()
  }
}

function handleGlobalDragOver(event: DragEvent) {
  const items = event.dataTransfer?.types
  if (items && items.includes('Files')) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleGlobalDragLeave(event: DragEvent) {
  if ((event.target as Element).tagName === 'HTML' || (event.target as Element).tagName === 'BODY' || event.clientX === 0 && event.clientY === 0) {
    isGlobalDragover.value = false
  }
}

async function handleGlobalDrop(event: DragEvent) {
  event.preventDefault()
  isGlobalDragover.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  error.value = null
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    const validation = validateFileForUpload(file)
    if (!validation.valid) {
      error.value = validation.error || 'Invalid file'
      continue
    }

    selectedFiles.value.push(file)
    uploadProgress.value.push(0)  // Initialize upload progress

    if (validation.isImage) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      if (isCompressibleImage(file)) {
        isCompressing.value = true
        try {
          const compressionResult = await compressImageMaximum(file)
          compressionInfos.value.push(compressionResult)
        } catch (err) {
          error.value = `Compression error for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          const index = selectedFiles.value.indexOf(file)
          if (index > -1) {
            selectedFiles.value.splice(index, 1)
            filePreviews.value.splice(index, 1)
            uploadProgress.value.splice(index, 1)  // Remove corresponding progress
          }
        } finally {
          isCompressing.value = false
        }
      } else {
        compressionInfos.value.push(null as any)
      }
    } else {
      filePreviews.value.push('')
      compressionInfos.value.push(null as any)
    }
  }
  
  await nextTick()
  const inputSection = document.querySelector('.input-section')
  if (inputSection) {
    inputSection.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
}

async function handleDropFile(event: DragEvent) {
  isDragover.value = false
  const files = event.dataTransfer?.files
  
  if (!files || files.length === 0) {
    return
  }

  error.value = null
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    const validation = validateFileForUpload(file)
    if (!validation.valid) {
      error.value = validation.error || 'Invalid file'
      continue
    }

    selectedFiles.value.push(file)
    uploadProgress.value.push(0)  // Initialize upload progress

    if (validation.isImage) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      if (isCompressibleImage(file)) {
        isCompressing.value = true
        try {
          const compressionResult = await compressImageMaximum(file)
          compressionInfos.value.push(compressionResult)
        } catch (err) {
          error.value = `Compression error for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          const index = selectedFiles.value.indexOf(file)
          if (index > -1) {
            selectedFiles.value.splice(index, 1)
            filePreviews.value.splice(index, 1)
            uploadProgress.value.splice(index, 1)  // Remove corresponding progress
          }
        } finally {
          isCompressing.value = false
        }
      } else {
        compressionInfos.value.push(null as any)
      }
    } else {
      filePreviews.value.push('')
      compressionInfos.value.push(null as any)
    }
  }
}

function cancelFileSelect() {
  selectedFiles.value = []
  filePreviews.value = []
  compressionInfos.value = []
  uploadProgress.value = []
}

async function handlePasteFile(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  
  if (!items || items.length === 0) {
    return
  }

  let imageFile: File | null = null
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      imageFile = item.getAsFile()
      break
    }
  }

  if (!imageFile) {
    return
  }

  event.preventDefault()

  error.value = null
  
  const validation = validateFileForUpload(imageFile)
  if (!validation.valid) {
    error.value = validation.error || 'Invalid file'
    return
  }

  selectedFiles.value.push(imageFile)

  const reader = new FileReader()
  reader.onload = (e) => {
    filePreviews.value.push(e.target?.result as string)
  }
  reader.readAsDataURL(imageFile)

  if (isCompressibleImage(imageFile)) {
    isCompressing.value = true
    try {
      const compressionResult = await compressImageMaximum(imageFile)
      compressionInfos.value.push(compressionResult)
    } catch (err) {
      error.value = `Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`
      const index = selectedFiles.value.indexOf(imageFile)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
        filePreviews.value.splice(index, 1)
      }
    } finally {
      isCompressing.value = false
    }
  } else {
    compressionInfos.value.push(null as any)
  }
}

function openImageModal(imageUrl: string) {
  selectedImageUrl.value = imageUrl
  showImageModal.value = true
}

async function downloadImage() {
  if (!selectedImageUrl.value) return
  
  try {
    // Reassembles split images automatically when the URL points to a chunked manifest
    const resolved = await resolveChunkedFile(selectedImageUrl.value)
    if (!resolved) throw new Error('Could not fetch the file')

    const blobUrl = window.URL.createObjectURL(resolved.blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = resolved.fileName || 'image'
    link.click()
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('❌ Error saat mengunduh gambar:', err)
    error.value = `Gagal mengunduh gambar: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

async function downloadFile(fileUrl: string | undefined, fileName: string | undefined) {
  if (!fileUrl || downloadingFile.value === fileUrl) {
    return
  }
  
  downloadingFile.value = fileUrl
  downloadProgress.value = 0
  try {
    console.log('📥 Mengunduh file:', { fileName, fileUrl })
    
    // Reassembles split files automatically when the URL points to a chunked manifest
    const resolved = await resolveChunkedFile(fileUrl, (progress) => {
      downloadProgress.value = progress
    })
    if (!resolved) {
      throw new Error('Could not fetch the file')
    }

    const blobUrl = window.URL.createObjectURL(resolved.blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = resolved.fileName || fileName || 'file'
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(blobUrl)
    
    console.log('✅ File unduhan dimulai:', fileName)
  } catch (err) {
    console.error('❌ Error saat mengunduh file:', err)
    error.value = `Gagal mengunduh file: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    downloadingFile.value = null
    downloadProgress.value = 0
  }
}

async function downloadAttachment(attachment: any) {
  if (!attachment.url || downloadingFile.value === attachment.url) {
    return
  }
  
  downloadingFile.value = attachment.url
  downloadProgress.value = 0
  try {
    console.log('📥 Mengunduh attachment:', { name: attachment.name, url: attachment.url })
    
    // Reassembles split files automatically when the URL points to a chunked manifest
    const resolved = await resolveChunkedFile(attachment.url, (progress) => {
      downloadProgress.value = progress
    })
    if (!resolved) {
      throw new Error('Could not fetch the file')
    }

    const blobUrl = window.URL.createObjectURL(resolved.blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = resolved.fileName || attachment.name || 'file'
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(blobUrl)
    
    console.log('✅ Attachment download dimulai:', attachment.name)
    copyToastMessage.value = `✅ Downloading ${attachment.name}`
    showCopyToast.value = true
  } catch (err) {
    console.error('❌ Error saat mengunduh attachment:', err)
    error.value = `Gagal mengunduh file: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    downloadingFile.value = null
    downloadProgress.value = 0
  }
}

function scrollToMessage(messageId: string) {
  if (!messagesContainer.value) return

  const targetElement = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!targetElement) {
    console.warn('Message not found:', messageId)
    return
  }

  targetElement.scrollIntoView({ behavior: 'auto', block: 'center' })
  
  targetElement.classList.add('message-highlighted')
  setTimeout(() => {
    targetElement.classList.remove('message-highlighted')
  }, MESSAGE_HIGHLIGHT_DURATION)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copyToastMessage.value = '✅ Copied to clipboard!'
    showCopyToast.value = true
    console.log('✅ Message copied to clipboard')
  }).catch(err => {
    copyToastMessage.value = '❌ Failed to copy'
    showCopyToast.value = true
    console.error('Failed to copy:', err)
  })
}

/**
 * Extract unique users from messages for fallback mention resolution
 */
function extractUsersFromMessages(messages: Message[]): User[] {
  const usersMap = new Map<string, User>()
  
  messages.forEach(msg => {
    if (msg.userId && msg.username && msg.animal) {
      usersMap.set(msg.userId, {
        id: msg.userId,
        username: msg.username,
        animal: msg.animal,
        password: '',
        createdAt: msg.timestamp || 0,
      })
    }
  })
  
  return Array.from(usersMap.values())
}

function handleMessageCopy(message: Message) {
  let contentToCopy = message.content
  
  if (message.hidden) {
    contentToCopy = 'message has been deleted'
  } else if (hasFormattedContent(message.content)) {
    const formatted = detectContentType(message.content)
    contentToCopy = formatted.content
  } else if (isCurlRequest(message.content)) {
    contentToCopy = getCurlCopyableText(message.content)
  }
  
  copyToClipboard(contentToCopy)
}

async function handleFileDownload(message: Message) {
  if (!message.fileUrl || !message.fileName || downloadingFile.value === message.fileUrl) {
    error.value = 'File information not available'
    return
  }

  downloadingFile.value = message.fileUrl
  downloadProgress.value = 0
  try {
    // Reassembles split files automatically when the URL points to a chunked manifest
    const resolved = await resolveChunkedFile(message.fileUrl, (progress) => {
      downloadProgress.value = progress
    })
    if (!resolved) throw new Error('Failed to download file')

    const blob = resolved.blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = resolved.fileName || message.fileName || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    copyToastMessage.value = `✅ Downloading ${message.fileName}`
    showCopyToast.value = true
  } catch (err) {
    error.value = `Failed to download file: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    downloadingFile.value = null
    downloadProgress.value = 0
  }
}

async function handleHideMessage(messageId: string) {
  try {
    chatStore.updateMessageHidden(messageId, true)
    
    await hideMessage(messageId)
    
    copyToastMessage.value = '✅ Message has been deleted'
    showCopyToast.value = true
    console.log('[Chat] Message deleted:', messageId)
  } catch (err) {
    chatStore.updateMessageHidden(messageId, false)
    
    error.value = `Failed to delete message: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('Error hiding message:', err)
  }
}

function confirmDeleteMessage(messageId: string) {
  messageToDelete.value = messageId
  showDeleteDialog.value = true
}

async function performDeleteMessage() {
  if (!messageToDelete.value) return
  
  const messageId = messageToDelete.value
  showDeleteDialog.value = false
  messageToDelete.value = null
  
  await handleHideMessage(messageId)
}

async function togglePinMessage(message: any) {
  if (!authStore.user) return
  
  try {
    const newPinnedState = !message.pinned
    const newPinnedBy = newPinnedState ? authStore.user.username : undefined
    
    // Update local state immediately for instant UI feedback
    chatStore.updateMessagePin(message.id, newPinnedState, newPinnedBy)
    
    if (message.pinned) {
      await unpinMessage(message.id)
      console.log('[Chat] Message unpinned:', message.id)
    } else {
      await pinMessage(message.id, authStore.user.username)
      console.log('[Chat] Message pinned:', message.id)
    }
  } catch (error) {
    console.error('[Chat] Error toggling pin:', error)
  }
}

function handleMessageKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      event.preventDefault()
      const textarea = event.target as HTMLInputElement
      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? 0
      messageInput.value = messageInput.value.substring(0, start) + '\n' + messageInput.value.substring(end)
      
      nextTick(() => {
        textarea.selectionStart = start + 1
        textarea.selectionEnd = start + 1
        inputCursorPosition.value = start + 1
      })
    } else {
      event.preventDefault()
      handleSendMessage()
    }
  } else {
    nextTick(() => {
      updateCursorPosition(event)
    })
  }
}

function updateCursorPosition(event?: Event) {
  try {
    const target = event?.target as HTMLTextAreaElement | null
    if (target && target.selectionStart !== undefined) {
      inputCursorPosition.value = target.selectionStart
    } else if (messageInputRef.value?.$el?.querySelector('textarea')) {
      const textarea = messageInputRef.value.$el.querySelector('textarea')
      if (textarea && textarea.selectionStart !== undefined) {
        inputCursorPosition.value = textarea.selectionStart
      }
    }
  } catch (err) {
    console.error('[Chat] Error updating cursor position:', err)
  }
}

function handleMentionSelect(username: string) {
  const result = insertMention(messageInput.value, inputCursorPosition.value, username)
  messageInput.value = result.text
  
  nextTick(() => {
    const textarea = messageInputRef.value?.$el?.querySelector('textarea')
    if (textarea) {
      textarea.focus()
      textarea.selectionStart = result.cursorPosition
      textarea.selectionEnd = result.cursorPosition
      inputCursorPosition.value = result.cursorPosition
    }
  })
}

function handleSelectSticker(sticker: Sticker) {
  const stickerMessage = `[STIKER:${sticker.id}]`
  
  pendingStickerData.value = {
    id: sticker.id,
    type: sticker.type,
    content: sticker.content,
    name: sticker.name
  }
  
  console.log('[Chat] Selected sticker:', sticker.id, '| Type:', sticker.type)
  
  messageInput.value = stickerMessage
  nextTick(() => {
    handleSendMessage()
  })
}

const GEOCODE_ERROR_MESSAGES: Record<number, string> = {
  1: 'Akses lokasi ditolak. Izinkan akses lokasi di browser untuk berbagi lokasi.',
  2: 'Tidak dapat menentukan lokasi saat ini. Coba lagi.',
  3: 'Waktu permintaan lokasi habis. Coba lagi.'
}

async function handleShareLocation() {
  if (!authStore.user) return

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    error.value = 'Geolocation tidak didukung oleh browser ini.'
    return
  }

  isSharingLocation.value = true
  error.value = null

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      })
    })

    const latitude = position.coords.latitude
    const longitude = position.coords.longitude

    let label = ''
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16`,
        { headers: { 'Accept-Language': 'id' } }
      )
      if (res.ok) {
        const data = await res.json()
        label = data?.display_name ?? ''
      }
    } catch (err) {
      console.warn('[Chat] Reverse geocoding failed, using default label:', err)
    }

    pendingLocation.value = { latitude, longitude, label: label || undefined }
    messageInput.value = label ? `📍 ${label}` : '📍 Lokasi Saya'

    await handleSendMessage()
  } catch (err) {
    const geolocErr = err as GeolocationPositionError
    console.error('[Chat] Error getting location:', err)
    error.value = GEOCODE_ERROR_MESSAGES[geolocErr?.code] ?? 'Gagal mendapatkan lokasi. Coba lagi.'
  } finally {
    isSharingLocation.value = false
  }
}

// ============================================================================
// LIVE LOCATION FUNCTIONS
// ============================================================================

function toggleLiveLocation() {
  if (isLiveTracking.value) {
    stopLiveTracking()
  } else {
    startLiveTracking()
  }
}

async function startLiveTracking() {
  if (!authStore.user || !chatStore.currentRoomId) return

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    error.value = 'Geolocation tidak didukung oleh browser ini.'
    return
  }

  error.value = null

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      })
    })

    const lat = position.coords.latitude
    const lng = position.coords.longitude

    const sentMessage = await sendMessage(
      authStore.user.id,
      authStore.user.username,
      authStore.user.animal,
      '📍 Live Location',
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined,
      { latitude: lat, longitude: lng },
      chatStore.currentRoomId,
      true,
    )

    await startLiveLocation(sentMessage.id, chatStore.currentRoomId, authStore.user.id, authStore.user.username, authStore.user.animal, lat, lng)

    isLiveTracking.value = true
    liveLocationMessageId.value = sentMessage.id
    lastLiveLocationUpdate = Date.now()

    watchPositionId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now()
        if (now - lastLiveLocationUpdate < LIVE_LOCATION_THROTTLE_MS) return
        lastLiveLocationUpdate = now

        try {
          await updateLiveLocation(sentMessage.id, pos.coords.latitude, pos.coords.longitude)
        } catch (e) {
          console.warn('[Chat] Failed to update live location:', e)
        }
      },
      (err) => {
        console.error('[Chat] watchPosition error:', err)
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    )
  } catch (err) {
    const geolocErr = err as GeolocationPositionError
    console.error('[Chat] Error starting live location:', err)
    error.value = GEOCODE_ERROR_MESSAGES[geolocErr?.code] ?? 'Gagal memulai live location.'
    isLiveTracking.value = false
  }
}

async function stopLiveTracking() {
  if (watchPositionId !== null) {
    navigator.geolocation.clearWatch(watchPositionId)
    watchPositionId = null
  }

  if (liveLocationMessageId.value) {
    try {
      await fbStopLiveLocation(liveLocationMessageId.value)
    } catch (e) {
      console.warn('[Chat] Failed to stop live location:', e)
    }
  }

  isLiveTracking.value = false
  liveLocationMessageId.value = null
  lastLiveLocationUpdate = 0
}

async function handleSendMessage() {
  if ((!messageInput.value.trim() && selectedFiles.value.length === 0) || !authStore.user) {
    return
  }

  if (isLoading.value) {
    console.warn('[Chat] Message already being sent, ignoring duplicate submit')
    return
  }

  if (!validateSession()) {
    console.warn('[Chat] Session expired. Clearing storage and redirecting to login...')
    handleSessionExpiredWithToast()
    return
  }

  const isUserDataValid = await validateUserDataConsistency()
  if (!isUserDataValid) {
    return
  }

  isLoading.value = true
  error.value = null
  isUploading.value = true

  try {
    const attachments: Array<{
      id: string
      url: string
      type: 'image' | 'file'
      mimeType: string
      name: string
      size: number
      originalSize?: number
      compressedSize?: number
    }> = []

    if (selectedFiles.value.length > 0) {
      try {
        for (let i = 0; i < selectedFiles.value.length; i++) {
          const file = selectedFiles.value[i]
          const compressionInfo = compressionInfos.value[i]
          
          let uploadUrl: string | null = null
          let uploadedSize: number
          let originalSize: number
          let compressedSize: number | undefined
          
          // Create progress callback for this file
          const onProgress = (progress: number) => {
            uploadProgress.value[i] = progress
          }
          
          if (isFileImage(file) && compressionInfo) {
            uploadUrl = await uploadImage(compressionInfo.blob, file.name, 'chat-images', onProgress)
            uploadedSize = compressionInfo.compressedSize
            originalSize = compressionInfo.originalSize
            compressedSize = compressionInfo.compressedSize
          } 
          else {
            uploadUrl = await uploadFile(file, file.name, 'chat-images', onProgress)
            uploadedSize = file.size
            originalSize = file.size
          }
          
          if (!uploadUrl) {
            error.value = `Failed to upload file: ${file.name}`
            isLoading.value = false
            isUploading.value = false
            return
          }

          attachments.push({
            id: `attachment-${i}-${Date.now()}`,
            url: uploadUrl,
            type: isFileImage(file) ? 'image' : 'file',
            mimeType: file.type,
            name: file.name,
            size: uploadedSize,
            originalSize: originalSize,
            ...(compressedSize && { compressedSize })
          })
        }
      } catch (err) {
        console.error('❌ Upload error details:', err)
        console.error('Full error:', JSON.stringify(err, null, 2))
        error.value = `Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`
        isLoading.value = false
        isUploading.value = false
        return
      }
    }

    const sentMessage = await sendMessage(
      authStore.user.id,
      authStore.user.username,
      authStore.user.animal,
      messageInput.value.trim(),
      replyingTo.value || undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      pendingStickerData.value || undefined,
      attachments.length > 0 ? attachments : undefined,
      pendingLocation.value || undefined,
      chatStore.currentRoomId
    )
    
    lastSentMessageId = sentMessage.id
    console.log('[Chat] Message sent:', lastSentMessageId, {
      hasStickerData: !!sentMessage.stickerData,
      attachmentsCount: attachments.length,
      hasLocation: !!sentMessage.location
    })
    
    pendingStickerData.value = null
    pendingLocation.value = null

    messageInput.value = ''
    replyingTo.value = null
    cancelFileSelect()

    setAction('send')
    shouldForceScroll = true
    
    await nextTick()
    scrollToBottom()
  } catch (err) {
    error.value = `Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('Error sending message:', err)
  } finally {
    isLoading.value = false
    isUploading.value = false
  }
}

async function loadMoreMessages() {
  if (isLoadingMore.value || !hasMoreMessages.value || chatStore.messages.length === 0) {
    return
  }

  if (isMomentumScrolling) {
    pendingPrependRequest = true
    console.log('[Chat] Momentum scroll active: queued prepend request (will execute when settled)')
    return
  }

  isFetching = true
  
  isLoadingMore.value = true
  isPrepending = true
  setAction('prepend')
  
  console.log('[Chat] Starting to load more messages...')
  
  try {
    const container = messagesContainer.value
    if (!container) return
    
    const prevScrollHeight = container.scrollHeight
    const prevScrollTop = container.scrollTop
    
    console.log(`[Chat] Before prepend - height: ${prevScrollHeight}px, top: ${prevScrollTop}px`)
    
    const oldestMessage = chatStore.messages[0]
    const olderMessages = await getMessagesBefore(oldestMessage, chatStore.currentRoomId)

    if (olderMessages.length === 0) {
      hasMoreMessages.value = false
      console.log('[Chat] No more messages to load')
    } else {
      console.log(`[Chat] Loaded ${olderMessages.length} messages, preserving scroll...`)
      
      chatStore.prependMessages(olderMessages)
      
      await nextTick()
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
      })
      
      if (typeof window.performance?.mark === 'function') {
        performance.mark('scroll-delta-calc')
      }
      
      const newScrollHeight = container.scrollHeight
      const scrollHeightDelta = newScrollHeight - prevScrollHeight
      const targetScrollTop = prevScrollTop + scrollHeightDelta
      
      container.scrollTop = targetScrollTop
      lastKnownScrollTop = targetScrollTop
      
      console.log(`[Chat] Scroll preserved - delta: ${scrollHeightDelta}px, target: ${targetScrollTop}px`)
      
      handleImageLoadAdjustment(container, newScrollHeight)
      
      console.log('[Chat] Waiting for layout to stabilize (data-driven approach)...')
      await waitForLayoutStable()
      prependLockUntil = Date.now() + 100
      console.log(`[Chat] Layout stable, prepend lock safety margin: 100ms`)
    }
  } catch (err) {
    console.error('[Chat] Error loading more messages:', err)
    error.value = `Failed to load more messages: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    isLoadingMore.value = false
    isPrepending = false
    setAction('idle')
    
    isFetching = false
  }
}

function handleImageLoadAdjustment(container: HTMLElement, lastKnownHeight: number) {
  let currentHeight = lastKnownHeight
  const images = container.querySelectorAll('img[data-src], img:not([complete])')
  let adjustedCount = 0
  
  images.forEach((img, index) => {
    const imgElement = img as HTMLImageElement
    
    if (!imgElement.complete) {
      imgElement.addEventListener('load', () => {
        const newHeight = container.scrollHeight
        const delta = newHeight - currentHeight
        
        if (Math.abs(delta) > 5) {
          adjustedCount++
          console.log(`[Chat] Image loaded [${index + 1}], height delta: ${delta}px`)
          
          container.scrollTop += delta
          currentHeight = newHeight
          
          imageHeightTracker.set(imgElement, newHeight)
        }
      }, { once: true })
    }
  })
  
  if (images.length > 0) {
    console.log(`[Chat] Monitoring ${images.length} images for incremental load adjustments`)
  }
}

async function loadAllMessagesForSearch() {
  isLoadingAllMessages.value = true
  console.log('[Chat] Starting to load all messages for search...')
  
  try {
    let attempts = 0
    const maxAttempts = 100
    
    while (hasMoreMessages.value && attempts < maxAttempts) {
      attempts++
      console.log(`[Chat] Loading batch ${attempts}...`)
      
      if (chatStore.messages.length === 0) {
        console.log('[Chat] No messages to load from')
        break
      }
      
      const oldestMessage = chatStore.messages[0]
      const olderMessages = await getMessagesBefore(oldestMessage, chatStore.currentRoomId)
      
      if (olderMessages.length === 0) {
        hasMoreMessages.value = false
        console.log('[Chat] All messages loaded')
        break
      }
      
      chatStore.prependMessages(olderMessages)
      console.log(`[Chat] Loaded batch ${attempts}: ${olderMessages.length} messages`)
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`[Chat] Finished loading all messages. Total batches: ${attempts}`)
  } catch (err) {
    console.error('[Chat] Error loading all messages:', err)
    error.value = `Failed to load all messages: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    isLoadingAllMessages.value = false
  }
}

async function handleSearch(query: string) {
  if (query.length < 3) {
    searchResults.value = []
    console.log('[Chat] Search cleared (less than 3 characters)')
    return
  }

  if (query.length >= 3 && hasMoreMessages.value && !isLoadingAllMessages.value) {
    console.log('[Chat] Starting search, loading all messages first...')
    await loadAllMessagesForSearch()
  } else if (query.length >= 3 && !hasMoreMessages.value) {
    console.log('[Chat] All messages already loaded, searching...')
  }

  isSearching.value = true
  const lowerQuery = query.toLowerCase()
  
  try {
    const results = chatStore.messages.filter((msg) => {
      if (msg.hidden) return false
      
      const contentMatch = msg.content.toLowerCase().includes(lowerQuery)
      
      const usernameMatch = msg.username.toLowerCase().includes(lowerQuery)
      
      const animalMatch = (msg.animal ?? '').toLowerCase().includes(lowerQuery) || 
                         (msg.animal ?? '').includes(query)
      
      return contentMatch || usernameMatch || animalMatch
    })
    
    searchResults.value = results
    console.log(`[Chat] Search: "${query}" - Found ${results.length} messages`)
  } catch (err) {
    console.error('[Chat] Error searching messages:', err)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function handleSearchClear() {
  searchQuery.value = ''
  searchResults.value = []
  console.log('[Chat] Search cleared')
}

function handleScroll(event: Event) {
  const container = event.target as HTMLElement
  
  lastUserScrollTime = Date.now()
  
  isMomentumScrolling = true
  if (momentumTimer) clearTimeout(momentumTimer)
  momentumTimer = setTimeout(() => {
    isMomentumScrolling = false
    console.log('[Chat] Momentum scroll settled')
    
    processPendingPrepend()
  }, MOMENTUM_SETTLE_MS)
  
  if (searchQuery.value.length >= 3 || isLoadingAllMessages.value) {
    return
  }
  
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer)
  }

  scrollDebounceTimer = setTimeout(() => {
    if (isFetching) {
      console.log('[Chat] Scroll: fetch already in progress, skipping')
      return
    }
    
    const isNearTop = container.scrollTop < SCROLL_LOAD_THRESHOLD
    const shouldLoad = isNearTop && !isLoadingMore.value && hasMoreMessages.value
    
    if (shouldLoad) {
      console.log(`[Chat] Scroll position: ${container.scrollTop}px - Loading more messages...`)
      loadMoreMessages()
    }
  }, SCROLL_DEBOUNCE_MS)
}

function isUserNearBottom(): boolean {
  if (!messagesContainer.value) return false
  
  const container = messagesContainer.value
  
  const adaptiveThreshold = Math.max(100, container.clientHeight * 0.2)
  
  const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
  
  const isNear = distanceFromBottom < adaptiveThreshold
  console.log(`[Chat] Distance from bottom: ${distanceFromBottom}px, Threshold: ${adaptiveThreshold}px, Near: ${isNear}`)
  
  return isNear
}

async function waitForLayoutStable(): Promise<void> {
  return new Promise(resolve => {
    if (!messagesContainer.value) {
      resolve()
      return
    }

    const container = messagesContainer.value
    isLayoutSettling = true
    lastKnownHeight = container.scrollHeight
    stableHeightCount = 0

    const checkStability = () => {
      const currentHeight = container.scrollHeight
      
      if (currentHeight === lastKnownHeight) {
        stableHeightCount++
        console.log(`[Chat] Layout stability: ${stableHeightCount}/${LAYOUT_STABLE_THRESHOLD}`)
        
        if (stableHeightCount >= LAYOUT_STABLE_THRESHOLD) {
          isLayoutSettling = false
          console.log('[Chat] Layout stabilized (data-driven detection)')
          resolve()
          return
        }
      } else {
        stableHeightCount = 0
        lastKnownHeight = currentHeight
      }

      requestAnimationFrame(checkStability)
    }

    checkStability()
  })
}

function setupResizeObserver(): ResizeObserver | null {
  if (!messagesContainer.value) return null

  const container = messagesContainer.value
  
  const resizeObserver = new ResizeObserver(() => {
    if (lastAction === 'prepend' && isLayoutSettling) {
      console.log('[Chat] ResizeObserver: Detected resize during prepend, recalculating...')
    }
  })

  resizeObserver.observe(container)
  console.log('[Chat] ResizeObserver active for dynamic content detection')
  
  return resizeObserver
}

function processPendingPrepend() {
  if (pendingPrependRequest) {
    pendingPrependRequest = false
    console.log('[Chat] Executing queued prepend after momentum settled')
    loadMoreMessages()
  }
}

function setupSoftKeyboardHandler(): (() => void) | null {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return null
  }

  const handler = () => {
    if (!messagesContainer.value) return
    
    const container = messagesContainer.value
    const newDistanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
    
    console.log('[Chat] Soft keyboard resize detected, viewport metrics recalculated')
    console.log(`[Chat] Distance from bottom after keyboard event: ${newDistanceFromBottom}px`)
    
    if (isUserNearBottom()) {
      container.scrollTop = container.scrollHeight - container.clientHeight
      console.log('[Chat] User was near bottom, re-anchored after keyboard resize')
    }
  }

  window.visualViewport.addEventListener('resize', handler)
  console.log('[Chat] Soft keyboard handler active (visualViewport resize listener)')
  
  return handler
}

function debugScroll() {
  if (!messagesContainer.value) {
    console.log('[Chat Debug] Container not found')
    return null
  }
  
  const container = messagesContainer.value
  const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
  const debugInfo = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
    distanceFromBottom,
    
    isPrepending,
    shouldForceScroll,
    lastAction,
    
    now: Date.now(),
    prependLockUntil,
    isLocked: Date.now() < prependLockUntil,
    lockTimeRemaining: Math.max(0, prependLockUntil - Date.now()),
    
    isNearBottom: isUserNearBottom(),
    shouldAutoScroll: shouldForceScroll || isUserNearBottom()
  }
  
  console.table(debugInfo)
  return debugInfo
}

;(window as any).debugScroll = debugScroll

function scrollToBottom() {
  if (messagesContainer.value) {
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }, 0)
  }
}

async function handleLogout() {
  clearAllStorage()
  router.push('/create-account')
}

// ============================================================================
// ROOMS & GROUPS LOGIC
// ============================================================================

/**
 * Load initial messages for a room and (re)subscribe to its live updates.
 * Also re-subscribes the global users listener.
 */
async function startChatSubscriptions(roomId: string): Promise<void> {
  // Stop any previous room-scoped subscriptions
  chatStore.unsubscribeFromUpdates()

  // Reset per-room state
  chatStore.setMessages([])
  hasMoreMessages.value = true
  lastSentMessageId = null
  lastProcessedMessageIds = new Set()
  notifiedMessageIds = new Set()

  console.log(`[Rooms] Loading room "${roomId}"...`)

  const initialMessages = await getMessages(roomId)
  chatStore.setMessages(initialMessages)

  lastProcessedMessageIds = new Set(initialMessages.map(m => m.id))
  notifiedMessageIds = new Set(initialMessages.map(m => m.id))

  try {
    if (AUTO_CLEANUP_ON_MOUNT) {
      console.log('🔄 Performing initial file availability check...')
      const cleanupResult = await performFileCleanup(initialMessages)
      console.log('✅ File cleanup completed:', cleanupResult)
    }
  } catch (err) {
    console.error('⚠️ File cleanup error (non-critical):', err)
  }

  await nextTick()
  await new Promise(resolve => setTimeout(resolve, SCROLL_DELAY))
  scrollToBottom()

  setAction('init')

  if (messagesContainer.value) {
    lastKnownScrollTop = messagesContainer.value.scrollTop
  }

  const unsubscribe = subscribeToMessages((messages) => processIncomingMessages(messages), roomId)
  chatStore.setUnsubscribe(unsubscribe)

  const unsubscribeUsers = subscribeToUsers((users) => {
    if (!validateSession()) {
      handleSessionExpiredWithToast()
      return
    }
    chatStore.setUsers(users)
  })
  chatStore.setUnsubscribeUsers(unsubscribeUsers)

  const unsubscribeMessageCount = subscribeToMessageCount((count) => {
    if (!validateSession()) {
      handleSessionExpiredWithToast()
      return
    }
    chatStore.setMessageCount(count)
    console.log('[Chat] Message count updated:', count)
  }, roomId)
  chatStore.setUnsubscribeMessageCount(unsubscribeMessageCount)

  console.log(`[Rooms] Subscribed to room "${roomId}" (${initialMessages.length} initial messages)`)
}

/**
 * Switch the active channel and track membership.
 */
async function activateRoom(roomId: string): Promise<void> {
  if (!authStore.user || roomId === chatStore.currentRoomId) return

  // Leaving a channel ends any active call in it
  endCall()

  const room = chatStore.rooms.find(r => r.id === roomId)

  // Private channels require membership
  if (room?.type === 'group' && !room.members.includes(authStore.user.id)) {
    error.value = `#${room.name} is private — you need to be invited by the channel owner.`
    return
  }

  // Track membership when opening public channels
  if (room?.type === 'room') {
    joinRoom(room.id, {
      id: authStore.user.id,
      username: authStore.user.username,
      animal: authStore.user.animal,
    }).catch(err => console.warn('[Channels] Auto-join failed:', err))
  }

  chatStore.setCurrentRoom(roomId)
  try {
    localStorage.setItem(CURRENT_ROOM_STORAGE_KEY, roomId)
  } catch { /* storage unavailable - ignore */ }

  await startChatSubscriptions(roomId)
}

function handleRoomClick(room: ChatRoom): void {
  activateRoom(room.id).catch(err => {
    error.value = `Failed to open room: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Rooms] Failed to switch room:', err)
  })
}

function openCreateDialog(visibility: 'public' | 'private' = 'public'): void {
  newRoomName.value = ''
  createRoomVisibility.value = visibility
  selectedMemberIds.value = []
  showCreateRoomDialog.value = true
}

async function handleCreateRoom(): Promise<void> {
  const name = newRoomName.value.trim()
  if (!name || !authStore.user || name.length > MAX_ROOM_NAME_LENGTH) return

  creatingRoom.value = true
  error.value = null

  try {
    const creator: MemberInfo = {
      id: authStore.user.id,
      username: authStore.user.username,
      animal: authStore.user.animal,
    }

    const type: RoomType = createRoomVisibility.value === 'private' ? 'group' : 'room'
    const room = await fbCreateRoom(name, type, creator)

    // Private channels: add selected members right away
    if (type === 'group' && selectedMemberIds.value.length > 0) {
      const membersToAdd = chatStore.users
        .filter(u => selectedMemberIds.value.includes(u.id))
        .map(u => ({ id: u.id, username: u.username, animal: u.animal }))

      if (membersToAdd.length > 0) {
        await addGroupMembers(room.id, membersToAdd)
      }
    }

    showCreateRoomDialog.value = false
    console.log(`[Channels] Created channel "${room.name}", switching...`)

    await activateRoom(room.id)
  } catch (err) {
    error.value = `Failed to create channel: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Channels] Create failed:', err)
  } finally {
    creatingRoom.value = false
  }
}

function openMembersDialog(room: ChatRoom): void {
  selectedRoomId.value = room.id
  membersToAdd.value = []
  showMembersDialog.value = true
}

async function confirmAddMembers(): Promise<void> {
  const room = selectedRoom.value
  if (!room || membersToAdd.value.length === 0) return

  isManagingMembers.value = true
  try {
    const users = chatStore.users
      .filter(u => membersToAdd.value.includes(u.id))
      .map(u => ({ id: u.id, username: u.username, animal: u.animal }))
    await addGroupMembers(room.id, users)
    membersToAdd.value = []
  } catch (err) {
    error.value = `Failed to add members: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Channels] Add members failed:', err)
  } finally {
    isManagingMembers.value = false
  }
}

async function handleRemoveMember(memberId: string): Promise<void> {
  const room = selectedRoom.value
  if (!room) return

  isManagingMembers.value = true
  try {
    await removeGroupMember(room.id, memberId)
  } catch (err) {
    error.value = `Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Channels] Remove member failed:', err)
  } finally {
    isManagingMembers.value = false
  }
}

async function handleLeaveRoom(): Promise<void> {
  const room = selectedRoom.value
  if (!room || !authStore.user) return

  isManagingMembers.value = true
  try {
    await leaveRoom(room.id, authStore.user.id)
    showMembersDialog.value = false

    // If we were viewing that channel, fall back to General
    if (chatStore.currentRoomId === room.id) {
      await activateRoom(DEFAULT_ROOM_ID)
    }
  } catch (err) {
    error.value = `Failed to leave channel: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Channels] Leave failed:', err)
  } finally {
    isManagingMembers.value = false
  }
}

/**
 * Start a channel call in a popup window (meet.jit.si limits embedded
 * iframes to 5 minutes, but popup windows are unrestricted and login-free).
 * Config passed via URL hash skips the prejoin name prompt entirely.
 */
function startCall(): void {
  const roomName = `chitchat-${chatStore.currentRoomId}`
  const displayName = `${authStore.user?.animal ?? ''} ${authStore.user?.username ?? ''}`.trim()

  // Values wrapped in literal quotes are parsed correctly even with spaces
  const hashParams = [
    'config.prejoinPageEnabled=false',
    'config.startWithVideoMuted=true',
    `userInfo.displayName=${encodeURIComponent(`"${displayName}"`)}`,
  ].join('&')

  callUrl.value = `https://${JITSI_DOMAIN}/${roomName}#${hashParams}`
  window.open(callUrl.value, 'chitchat-call', 'width=1280,height=800')
  callActive.value = true
}

function endCall(): void {
  callActive.value = false
}

async function handleDeleteRoom(): Promise<void> {
  const room = selectedRoom.value
  if (!room || !isSelectedRoomOwner.value) return

  isManagingMembers.value = true
  try {
    await deleteRoom(room.id)
    showMembersDialog.value = false

    // If we were viewing that channel, fall back to General
    if (chatStore.currentRoomId === room.id) {
      await activateRoom(DEFAULT_ROOM_ID)
    }
  } catch (err) {
    error.value = `Failed to delete channel: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[Channels] Delete failed:', err)
  } finally {
    isManagingMembers.value = false
  }
}


function processIncomingMessages(messages: Message[]): void {
  if (!validateSession()) {
    handleSessionExpiredWithToast()
    return
  }

  const now = Date.now()
  if (now - lastSubscriptionUpdateTime < SUBSCRIPTION_DEBOUNCE_MS) {
    console.log('[Chat] Subscription update debounced - too frequent')
    return
  }
  lastSubscriptionUpdateTime = now

  const currentIds = new Set(messages.map(m => m.id))
  
  if (currentIds.size === lastProcessedMessageIds.size && 
      [...currentIds].every(id => lastProcessedMessageIds.has(id))) {
    console.log('[Chat] Message IDs unchanged, skipping duplicate update')
    return
  }
  
  lastProcessedMessageIds = currentIds
  
  const newMessages = messages.filter(newMsg => 
    !chatStore.messages.some(currentMsg => currentMsg.id === newMsg.id)
  )

  if (chatStore.notificationsEnabled && newMessages.length > 0) {
    console.log(`[Chat] Found ${newMessages.length} new messages to notify, page visible: ${isPageVisible.value}`)
    
    let shouldPlaySound = false
    
    newMessages.forEach((message) => {
      if (!notifiedMessageIds.has(message.id) && message.userId !== authStore.user?.id) {
        console.log('[Chat] Sending notification for message:', message.id, 'from:', message.username)
        
        notifiedMessageIds.add(message.id)
        
        shouldPlaySound = true
        
        let isMentioned = false
        try {
          const mentions = extractMentions(message.content)
          const currentUsername = authStore.user?.username?.toLowerCase() || ''
          isMentioned = mentions.some(m => 
            m.toLowerCase() === currentUsername || m.toLowerCase() === 'all'
          )
        } catch (err) {
          console.warn('[Chat] Error checking mentions:', err)
        }
        
        if (isPageVisible.value) {
          console.log('[Chat] Page visible - displaying notification for:', message.username, 'mentioned:', isMentioned)
          
          const { toastData } = isMentioned 
            ? notifyMentioned(message, authStore.user?.id || '', isPageVisible.value)
            : notifyNewMessage(message, authStore.user?.id || '', isPageVisible.value)
          
          if (toastData) {
            toastMessage.value = toastData.content.substring(0, 100) + (toastData.content.length > 100 ? '...' : '')
            toastAnimal.value = toastData.animal
            toastUsername.value = toastData.username
            showNewMessageToast.value = true
          }
        } else {
          console.log('[Chat] Page hidden - using Service Worker for device notification for:', message.username, 'mentioned:', isMentioned)
          
          if (navigator.serviceWorker?.controller) {
            const notificationTitle = isMentioned 
              ? `🔔 ${message.animal} ${message.username} mentioned you`
              : `💬 ${message.animal} ${message.username}`
            
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              data: {
                title: notificationTitle,
                body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
                icon: '/vite.svg',
                badge: '/notification-badge.png',
                tag: `message-${message.id}`,
                requireInteraction: true,
                messageId: message.id,
                userId: authStore.user?.id || '',
              },
            })
            console.log('[Chat] Notification sent to Service Worker')
          } else {
            console.warn('[Chat] Service Worker not available, notification may not appear')
          }
        }
        
        console.log('[Chat] Notification complete for message:', message.id)
      }
    })
    
    if (shouldPlaySound) {
      console.log('[Chat] Triggering sound notification (once for batch)...')
      playNotificationSoundDouble()
    }
  } else {
    if (!chatStore.notificationsEnabled) {
      console.log('[Chat] Notifications disabled, skipping notification')
    } else {
      console.log('[Chat] No new messages to notify')
    }
  }
  
  chatStore.syncMessages(messages)
  console.log('[Chat] Messages synced:', messages.length)
  
  if (CHECK_FILE_ON_NEW_MESSAGE) {
    performFileCleanup(messages).catch(err => {
      console.error('⚠️ File cleanup error during message update (non-critical):', err)
    })
  }
  
  if (isPrepending || lastAction === 'prepend') {
    console.log('[Chat] Prepend in progress or just finished, skipping auto-scroll', {
      isPrepending,
      lastAction
    })
    setAction('idle')
    return
  }
  
  if (now < prependLockUntil) {
    const timeRemaining = prependLockUntil - now
    console.log(`[Chat] Blocked by prepend lock window (${timeRemaining}ms remaining)`)
    return
  }
  
  const container = messagesContainer.value
  if (!container) return
  
  const pixelThresholdExceeded = Math.abs(container.scrollTop - lastKnownScrollTop) > USER_SCROLL_THRESHOLD
  const recentUserScroll = (Date.now() - lastUserScrollTime) < USER_SCROLL_TIME_WINDOW
  const userScrolledManually = pixelThresholdExceeded || recentUserScroll
  
  if (userScrolledManually) {
    console.log('[Chat] User actively scrolling, skip auto-scroll', {
      pixelThreshold: pixelThresholdExceeded,
      recentScroll: recentUserScroll,
      currentScrollTop: container.scrollTop,
      lastKnownScrollTop,
      delta: container.scrollTop - lastKnownScrollTop
    })
    lastKnownScrollTop = container.scrollTop
    return
  }
  
  const nearBottom = isUserNearBottom()
  
  if (shouldForceScroll || nearBottom) {
    console.log('[Chat] Auto-scrolling to latest message', {
      force: shouldForceScroll,
      nearBottom
    })
    nextTick(() => {
      scrollToBottom()
    })
    shouldForceScroll = false
    setAction('idle')
  } else {
    console.log('[Chat] User scrolling up (reading older messages), NOT auto-scrolling')
    setAction('idle')
  }
}

onMounted(async () => {
  try {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
      console.log('[Chat] Scroll restoration set to manual (app controlled)')
    }

    contentResizeObserver = setupResizeObserver()

    visualViewportHandler = setupSoftKeyboardHandler()
    
    const savedTheme = localStorage.getItem('theme')
    isDark.value = savedTheme === 'dark'
    theme.change(isDark.value ? 'dark' : 'light')
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    }

    if (!validateSession()) {
      console.warn('[Chat] Session invalid on mount - router guard should have caught this')
      return
    }

    showImageModal.value = false
    
    if (authStore.user) {
      const userExists = await getUserById(authStore.user.id)
      if (!userExists) {
        console.log('User session invalid - database was cleaned. Logging out...')
        authStore.logout()
        chatStore.unsubscribeFromUpdates()
        router.push('/create-account')
        return
      }
    }

    // One-time migration: legacy messages without roomId belong to General
    try {
      await backfillLegacyMessageRooms()
    } catch (err) {
      console.error('⚠️ Room backfill error (non-critical):', err)
    }

    // Restore last opened room (falls back to General)
    let savedRoomId: string | null = null
    try {
      savedRoomId = localStorage.getItem(CURRENT_ROOM_STORAGE_KEY)
    } catch { /* storage unavailable - ignore */ }
    chatStore.setCurrentRoom(savedRoomId || DEFAULT_ROOM_ID)

    await startChatSubscriptions(chatStore.currentRoomId)

    // Live channels list (public + private channels I'm a member of)
    if (authStore.user) {
      unsubscribeRooms = subscribeToRooms(authStore.user.id, (rooms) => {
        chatStore.setRooms(rooms)
        console.log('[Channels] Channels updated:', rooms.length)
      })
    }

    if (isNotificationSupported()) {
      try {
        const notificationPermission = await requestNotificationPermission()
        if (notificationPermission) {
          chatStore.setNotificationsEnabled(true)
          console.log('[Notification] Notifications enabled')
        } else {
          chatStore.setNotificationsEnabled(false)
          console.log('[Notification] Notifications permission denied')
        }
      } catch (err) {
        console.error('[Notification] Error requesting permission:', err)
        chatStore.setNotificationsEnabled(false)
      }
    } else {
      console.warn('[Notification] Browser does not support notifications')
      chatStore.setNotificationsEnabled(false)
    }

    audioInitHandler = () => {
      console.log('[Sound] Initializing audio context from user interaction')
      initAudioContext()
      if (audioInitHandler) {
        document.removeEventListener('click', audioInitHandler)
        document.removeEventListener('keypress', audioInitHandler)
        document.removeEventListener('touchstart', audioInitHandler)
        audioInitHandler = null
      }
    }

    document.addEventListener('click', audioInitHandler)
    document.addEventListener('keypress', audioInitHandler)
    document.addEventListener('touchstart', audioInitHandler)

    updatePageVisibility()
    document.addEventListener('visibilitychange', updatePageVisibility)

    document.addEventListener('dragenter', handleGlobalDragEnter as any)
    document.addEventListener('dragover', handleGlobalDragOver as any)
    document.addEventListener('dragleave', handleGlobalDragLeave as any)
    document.addEventListener('drop', handleGlobalDrop as any)

    
    stopPeriodicCleanup = schedulePeriodicCleanup(
      () => chatStore.messages,
      PERIODIC_CLEANUP_INTERVAL
    )
  } catch (err) {
    error.value = `Failed to load messages: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('Error loading messages:', err)
  }
})

onUnmounted(() => {
  stopLiveTracking()
  chatStore.unsubscribeFromUpdates()

  if (unsubscribeRooms) {
    unsubscribeRooms()
    unsubscribeRooms = null
  }

  if (stopPeriodicCleanup) {
    stopPeriodicCleanup()
    stopPeriodicCleanup = null
  }

  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer)
    scrollDebounceTimer = null
  }

  if (momentumTimer) {
    clearTimeout(momentumTimer)
    momentumTimer = null
  }

  if (contentResizeObserver) {
    contentResizeObserver.disconnect()
    contentResizeObserver = null
    console.log('[Chat] ResizeObserver disconnected')
  }

  if (visualViewportHandler && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', visualViewportHandler)
    visualViewportHandler = null
    console.log('[Chat] Soft keyboard handler removed')
  }

  if (audioInitHandler) {
    document.removeEventListener('click', audioInitHandler)
    document.removeEventListener('keypress', audioInitHandler)
    document.removeEventListener('touchstart', audioInitHandler)
    audioInitHandler = null
  }

  document.removeEventListener('visibilitychange', updatePageVisibility)

  document.removeEventListener('dragenter', handleGlobalDragEnter as any)
  document.removeEventListener('dragover', handleGlobalDragOver as any)
  document.removeEventListener('dragleave', handleGlobalDragLeave as any)
  document.removeEventListener('drop', handleGlobalDrop as any)
})

</script>

<style scoped>
/* Global Drop Zone Overlay */
.global-drop-zone-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(79, 195, 247, 0.95);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  animation: dropZoneBounce 0.6s ease-out;
}

.drop-zone-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-align: center;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.drop-zone-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@keyframes dropZoneBounce {
  0% {
    transform: scale(0.8) translateY(-20px);
    opacity: 0;
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Fade transition for drop zone */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  overflow: hidden;
  transition: background 0.3s, color 0.3s;
}

.gradient-header {
  background: linear-gradient(135deg, var(--clr-primary-a0) 0%, var(--clr-primary-a30) 100%) !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px !important;
  gap: 0.75rem;
  width: 100%;
  flex-wrap: nowrap;
  overflow: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.header-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.app-title {
  color: white !important;
  font-weight: 700 !important;
  font-size: 1.25rem !important;
  margin: 0 !important;
  letter-spacing: 0.5px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-stats {
  display: flex;
  gap: 0.75rem;
  margin-top: 4px;
  flex-wrap: wrap;
}

/* Room / Group Selector */
.room-selector {
  align-self: flex-start;
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0.2px;
  max-width: 240px;
}

.room-selector-name {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-menu-card {
  overflow-y: auto;
}

.stat-item-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  color: rgba(255, 255, 255, 1) !important;
  font-size: 1rem !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-number {
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.stat-item {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.75rem !important;
  margin: 0 !important;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.logo-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 75px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  gap: 3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

  .logo-badge:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.15));
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

.logo-content {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

  .logo-badge:hover .logo-content {
    background: rgba(255, 255, 255, 0.15);
  }

  .logo-content .text-white {
    font-size: 2.2rem !important;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }

  .logo-content .icon-strike-through {
    position: absolute;
    font-size: 2.5rem !important;
    color: white !important;
    opacity: 0.85;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    transition: all 0.3s ease;
    z-index: 10;
  }

  .logo-badge:hover .icon-strike-through {
    opacity: 1;
    transform: rotate(90deg) scale(1.1);
  }

  .logo-content .icon-cancel {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 1.2rem !important;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    padding: 2px;
    backdrop-filter: blur(4px);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    transition: all 0.3s ease;
    z-index: 11;
  }

  .logo-badge:hover .icon-cancel {
    background: rgba(0, 0, 0, 0.5);
    transform: scale(1.1);
  }

.logo-text {
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  line-height: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
  gap: 0.5rem;
  flex-shrink: 0;
}

.search-field {
  width: 250px;
  transition: all 0.3s ease;
}

/* Dark mode styling - explicit */
.chat-container:not(.light-mode) :deep(.search-field .v-field) {
  background: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(8px) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s ease !important;
}

.chat-container:not(.light-mode) :deep(.search-field .v-field:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.chat-container:not(.light-mode) :deep(.search-field .v-field--focused) {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1) !important;
}

.chat-container:not(.light-mode) :deep(.search-field input) {
  color: white !important;
  font-size: 0.875rem !important;
}

.chat-container:not(.light-mode) :deep(.search-field input::placeholder) {
  color: white !important;
}

.chat-container:not(.light-mode) :deep(.search-field .v-icon) {
  color: rgba(255, 255, 255, 0.8) !important;
}

/* Override Vuetify TextField styles for better header integration */
:deep(.search-field .v-field) {
  background: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(8px) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s ease !important;
}

:deep(.search-field .v-field:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-field .v-field--focused) {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1) !important;
}

:deep(.search-field input) {
  color: white !important;
  font-size: 0.875rem !important;
}

:deep(.search-field input::placeholder) {
  color: white !important;
}

:deep(.search-field .v-icon) {
  color: rgba(255, 255, 255, 0.8) !important;
}

/* Light mode styling */
.chat-container.light-mode :deep(.search-field .v-field) {
  background: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s ease !important;
}

.chat-container.light-mode :deep(.search-field .v-field:hover) {
  background: rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(0, 0, 0, 0.25) !important;
}

.chat-container.light-mode :deep(.search-field .v-field--focused) {
  background: rgba(0, 0, 0, 0.1) !important;
  border-color: rgba(0, 0, 0, 0.35) !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15) !important;
}

.chat-container.light-mode :deep(.search-field input) {
  color: #000000 !important;
  font-size: 0.875rem !important;
}

.chat-container.light-mode :deep(.search-field input::placeholder) {
  color: #000000 !important;
}

.chat-container.light-mode :deep(.search-field .v-icon) {
  color: rgba(0, 0, 0, 0.6) !important;
}

.search-results-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: badgePulse 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.search-loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spinnerFadeIn 0.3s ease;
}

@keyframes badgePulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.user-chip {
  font-weight: 600;
  letter-spacing: 0.5px;
  min-width: 0;
}

.animal-emoji {
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.username-text {
  font-weight: bold;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
}

.logout-btn {
  border-color: rgba(255, 255, 255, 0.8) !important;
  color: white !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: white !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
}

.theme-toggle-mobile {
  color: white !important;
  display: none;
}

.theme-toggle-mobile:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
}

/* Responsive Design */
/* Desktop: 961px+ */

/* Tablet: 769px - 960px */
@media (max-width: 960px) and (min-width: 769px) {
  .header-container {
    padding: 10px 14px !important;
    gap: 0.75rem;
  }

  .header-left {
    gap: 0.75rem;
  }

  .header-right {
    gap: 0.5rem;
  }

  .search-container {
    width: 150px;
  }

  .search-field {
    width: 150px;
  }

  .app-title {
    font-size: 1rem !important;
  }

  .header-stats {
    gap: 0.75rem;
  }

  .logo-badge {
    width: 42px;
    height: 42px;
  }

  .logout-btn {
    font-size: 0.8rem !important;
    padding: 4px 8px !important;
  }

  .messages-list {
    padding: 1.25rem;
  }

  .message-content-container {
    max-width: 80%;
  }

  .input-section {
    padding: 0.75rem 1.25rem 1.25rem;
  }
}

/* iPad/Small Tablet: 600px - 768px */
@media (max-width: 768px) {
  .header-container {
    padding: 8px 12px !important;
    gap: 0.5rem;
  }

  .header-left {
    gap: 0.5rem;
    min-width: 0;
    flex: 0 1 auto;
  }

  .header-right {
    gap: 0.4rem;
    flex: 1;
    justify-content: flex-end;
  }

  .search-container {
    display: none;
  }

  .app-title {
    font-size: 0.95rem !important;
  }

  .header-stats {
    gap: 0.4rem;
    margin-top: 2px;
  }

  .stat-item-badge {
    padding: 3px 6px;
    font-size: 0.65rem;
  }

  .logo-badge {
    width: 40px;
    height: 40px;
  }

  .logo-content .text-white {
    font-size: 1.6rem !important;
  }

  .user-chip {
    font-size: 0.85rem;
    padding: 4px 8px !important;
  }

  .logout-btn {
    font-size: 0.75rem !important;
    padding: 4px 8px !important;
  }

  .messages-list {
    padding: 1rem 0.75rem;
  }

  .message-content-container {
    max-width: 80%;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .input-section {
    padding: 0.5rem 0.75rem 0.75rem;
    gap: 0.4rem;
  }

  .input-wrapper {
    gap: 0.4rem;
    min-height: 40px;
  }

  .message-input-wrapper {
    min-height: 34px;
    padding: 6px 4px;
  }
}

/* Mobile: <= 600px */
@media (max-width: 600px) {
  .header-container {
    padding: 8px 10px !important;
    gap: 0.4rem;
  }

  .header-left {
    gap: 0.4rem;
    min-width: 0;
    flex: 0 1 auto;
  }

  .header-right {
    gap: 0.3rem;
    flex: 1;
    justify-content: flex-end;
  }

  .search-container {
    display: none;
  }

  .app-title {
    font-size: 0.9rem !important;
  }

  .header-stats {
    gap: 0.3rem;
    margin-top: 0px;
  }

  .stat-item-badge {
    padding: 2px 4px;
    font-size: 0.6rem;
  }

  .stat-icon {
    font-size: 0.8rem !important;
  }

  .stat-number {
    font-size: 0.65rem;
  }

  .logo-badge {
    width: 36px;
    height: 36px;
  }

  .logo-content .text-white {
    font-size: 1.4rem !important;
  }

  .logo-content .icon-strike-through {
    font-size: 2rem !important;
  }

  .user-chip {
    font-size: 0.75rem;
    padding: 2px 6px !important;
  }

  .animal-emoji {
    margin-right: 0.2rem;
  }

  .logout-btn {
    font-size: 0.65rem !important;
    padding: 2px 4px !important;
  }

  .theme-toggle-mobile {
    display: inline-flex !important;
  }

  .messages-list {
    padding: 0.75rem 0.5rem;
    gap: 0.2rem;
  }

  .message-wrapper {
    margin: 0.3rem 0;
  }

  .message-content-container {
    max-width: 88%;
  }

  .message-avatar {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .message-sender-name {
    font-size: 0.7rem;
  }

  .message-card {
    min-width: 100px;
  }

  .message-item.received .message-card {
    margin-left: 32px;
  }

  .input-section {
    padding: 0.4rem 0.5rem 0.75rem;
    gap: 0.3rem;
    border-radius: 12px 12px 0 0;
  }

  .input-wrapper {
    gap: 0.3rem;
    min-height: 40px;
  }

  .message-input-wrapper {
    min-height: 32px;
    max-height: 120px;
    padding: 6px 3px;
    border-radius: 16px;
  }

  :deep(.message-input textarea) {
    padding: 4px 12px !important;
    font-size: 0.9rem !important;
  }

  .send-btn {
    min-width: 40px !important;
    width: 40px !important;
  }

  :deep(.upload-btn),
  :deep(.sticker-btn) {
    min-width: 36px !important;
    width: 36px !important;
    padding: 0 !important;
  }

  .empty-state {
    padding: 1rem 0.5rem;
  }

  .date-separator {
    padding: 0.75rem 0;
    margin: 0.3rem 0;
  }

  .date-text {
    font-size: 0.7rem;
    padding: 0.4rem 0.8rem;
  }

  .quoted-message {
    padding: 6px 8px;
    margin-bottom: 8px;
    font-size: 0.8rem;
  }

  .quoted-reply-box {
    padding: 4px 6px;
    gap: 6px;
  }

  .quoted-reply-text strong {
    font-size: 0.7rem;
  }

  .quoted-reply-text p {
    font-size: 0.65rem;
  }

  .action-buttons {
    gap: 0.3rem;
    margin-top: 0.4rem;
  }

  :deep(.action-btn) {
    min-width: 28px !important;
    width: auto !important;
    padding: 0 4px !important;
  }

  :deep(.action-btn .v-icon) {
    font-size: 1rem !important;
  }

  .message-footer {
    gap: 0.3rem;
  }

  .message-time {
    font-size: 0.65rem;
  }

  .reply-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  gap: 0;
  height: 100%;
  min-height: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  scroll-padding-top: 120px;
  min-height: 0;
  background-color: var(--bg-primary);
  transition: background 0.3s;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem 1.5rem;
  flex: 1;
  color: var(--text-secondary);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1.5rem 1rem 1rem 1rem;
  flex: 1;
}

.loading-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.5rem 0 1rem 0;
  animation: slideInDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: all 0.3s ease;
  scroll-margin-top: 120px;
}

.loading-text {
  opacity: 0.8;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.search-info-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
  color: rgba(33, 150, 243, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
  margin: 2rem 0 1rem 0;
  animation: slideInDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  scroll-margin-top: 120px;
}

.search-info-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.search-info-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper:first-child {
  margin-top: 0;
}

.message-wrapper {
  display: flex;
  animation: slideIn 0.3s ease-out;
}

.message-item {
  display: flex;
  width: 100%;
  gap: 0.75rem;
  align-items: flex-start;
}

.message-item.sent {
  justify-content: flex-end;
  gap: 0;
}

.message-item.received {
  justify-content: flex-start;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  line-height: 1;
}

.message-content-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 85%;
}

.message-item.sent .message-content-container {
  align-items: flex-end;
}

.message-sender-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.message-card {
  max-width: 100%;
  word-break: break-word;
  border-radius: 12px;
  transition: all 0.2s ease, background 0.3s, color 0.3s;
  min-width: 120px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  flex-direction: column;
}

:deep(.message-card .v-card-text) {
  padding-top: 8px !important;
}

.message-item.received .message-card {
  margin-left: 44px;
}

.message-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:root.dark .message-card {
  border: 1.5px solid var(--border-accent);
  box-shadow: 0 0 12px rgba(129, 140, 248, 0.3), 0 2px 4px rgba(0, 0, 0, 0.3);
}

:root.dark .message-card:hover {
  box-shadow: 0 0 20px rgba(129, 140, 248, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.message-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  width: 100%;
}

.footer-sent {
  justify-content: flex-end;
}

.footer-received {
  justify-content: flex-end;
}

.message-time {
  font-size: 0.75rem;
  white-space: nowrap;
  margin-left: auto;
}

.reply-badge {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reply-badge:hover {
  background: rgba(37, 99, 235, 0.2);
}

/* Date Separator */
.date-separator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
  margin: 0.5rem 0;
}

.date-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 16px;
  text-transform: capitalize;
}

.input-section {
  padding: 0.75rem 1rem 1rem;
  background-color: var(--bg-primary);
  border-top: 2px solid var(--border-accent);
  border-radius: 16px 16px 0 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: background 0.3s, color 0.3s;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
}

:root.dark .input-section {
  border-left: 1.5px solid var(--border-accent);
  border-right: 1.5px solid var(--border-accent);
  border-bottom: 1.5px solid var(--border-accent);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2), 
              0 0 20px rgba(129, 140, 248, 0.25),
              inset 0 0 15px rgba(129, 140, 248, 0.1);
}

.input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
  min-height: 44px;
}

.message-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .input-wrapper {
    gap: 0.4rem;
    min-height: 40px;
  }

  .message-input-group {
    gap: 0.4rem;
  }
}

@media (max-width: 600px) {
  .input-wrapper {
    gap: 0.3rem;
    min-height: 38px;
  }

  .message-input-group {
    gap: 0.3rem;
  }
}

.message-input-wrapper {
  flex: 1;
  position: relative;
  border: 2px solid var(--clr-primary-a20);
  border-radius: 20px;
  background: var(--bg-tertiary);
  padding: 8px 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: stretch;
  min-height: 36px;
  max-height: 140px;
}

.message-input-wrapper:hover {
  border-color: var(--clr-primary-a10);
  box-shadow: 0 0 12px var(--clr-primary-a30);
}

.message-input-wrapper:has(.v-field--focused) {
  border-color: var(--clr-primary-a0);
  box-shadow: 0 0 20px var(--clr-primary-a30);
}

@media (max-width: 768px) {
  .message-input-wrapper {
    min-height: 34px;
    padding: 7px 3px;
  }
}

@media (max-width: 600px) {
  .message-input-wrapper {
    min-height: 32px;
    padding: 6px 3px;
    max-height: 120px;
    border-radius: 18px;
    border-width: 1.5px;
  }
}

:global(html.dark) .message-input-wrapper {
  border-color: var(--clr-primary-a20);
}

:global(html.dark) .message-input-wrapper:hover {
  border-color: var(--clr-primary-a10);
  box-shadow: 0 0 12px rgba(100, 30, 253, 0.3);
}

:global(html.dark) .message-input-wrapper:has(.v-field--focused) {
  border-color: var(--clr-primary-a0);
  box-shadow: 0 0 20px rgba(100, 30, 253, 0.4);
}

.message-input-wrapper.drag-over {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.05);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

/* Textarea Input Styling */
:deep(.message-input textarea) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  padding: 6px 16px !important;
  font-size: 0.95rem !important;
  line-height: 1.4 !important;
  resize: none !important;
  width: 100%;
}

@media (max-width: 600px) {
  :deep(.message-input textarea) {
    padding: 5px 12px !important;
    font-size: 0.9rem !important;
  }
}

:deep(.message-input textarea::placeholder) {
  color: var(--text-secondary) !important;
  opacity: 0.8 !important;
}

:deep(.message-input .v-field) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  min-height: auto !important;
}

:deep(.message-input .v-field__input) {
  padding: 0 !important;
}

:deep(.message-input .v-field__outline) {
  display: none !important;
}

:deep(.message-input .v-field__underline) {
  display: none !important;
}

:deep(.message-input svg) {
  display: none !important;
}

.send-btn {
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--clr-primary-a0) 0%, var(--clr-primary-a30) 100%) !important;
  box-shadow: 0 4px 12px rgba(100, 30, 253, 0.3) !important;
  transition: all 0.3s ease !important;
  min-width: 44px !important;
  min-height: 44px !important;
  width: 44px !important;
  height: 44px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 16px rgba(100, 30, 253, 0.5) !important;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .send-btn {
    min-width: 40px !important;
    min-height: 40px !important;
    width: 40px !important;
    height: 40px !important;
  }
}

@media (max-width: 600px) {
  .send-btn {
    min-width: 36px !important;
    min-height: 36px !important;
    width: 36px !important;
    height: 36px !important;
  }

  :deep(.send-btn .v-icon) {
    font-size: 1.2rem !important;
  }
}

/* Upload Button Styling */
:deep(.upload-btn) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
  min-width: 44px !important;
  min-height: 44px !important;
  width: 44px !important;
  height: 44px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.upload-btn:hover:not(:disabled)) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
  transform: scale(1.08) !important;
}

:deep(.upload-btn:active:not(:disabled)) {
  transform: scale(0.95) !important;
}

/* Sticker Button Styling */
:deep(.sticker-btn),
:deep(.location-btn) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
  min-width: 44px !important;
  min-height: 44px !important;
  width: 44px !important;
  height: 44px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Live Location Toggle - pulsing when active */
:deep(.live-toggle.is-live) {
  animation: live-pulse 1.5s ease-in-out infinite !important;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.3)) !important;
}

@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
}

:deep(.sticker-btn:hover:not(:disabled)),
:deep(.location-btn:hover:not(:disabled)) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
  transform: scale(1.08) !important;
}

:deep(.sticker-btn:active:not(:disabled)),
:deep(.location-btn:active:not(:disabled)) {
  transform: scale(0.95) !important;
}

@media (max-width: 768px) {
  :deep(.upload-btn),
  :deep(.sticker-btn),
  :deep(.location-btn) {
    min-width: 40px !important;
    min-height: 40px !important;
    width: 40px !important;
    height: 40px !important;
  }
}

@media (max-width: 600px) {
  :deep(.upload-btn),
  :deep(.sticker-btn),
  :deep(.location-btn) {
    min-width: 36px !important;
    min-height: 36px !important;
    width: 36px !important;
    height: 36px !important;
  }

  :deep(.upload-btn .v-icon),
  :deep(.sticker-btn .v-icon),
  :deep(.location-btn .v-icon) {
    font-size: 1.2rem !important;
  }
}

/* Quoted Message (Reply) */
.quoted-message {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid var(--accent);
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.quoted-message:hover {
  background: rgba(0, 0, 0, 0.08);
  border-left-color: #764ba2;
}

:root.dark .quoted-message {
  background: rgba(255, 255, 255, 0.05);
  border-left-color: var(--accent);
}

:root.dark .quoted-message:hover {
  background: rgba(255, 255, 255, 0.08);
}

.message-sent .quoted-message {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: rgba(255, 255, 255, 0.6);
  color: white;
}

.message-sent .quoted-message:hover {
  background: rgba(255, 255, 255, 0.2);
  border-left-color: rgba(255, 255, 255, 0.8);
}

.quoted-content {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.quoted-emoji {
  font-size: 1rem;
  flex-shrink: 0;
}

.quoted-text {
  flex: 1;
  min-width: 0;
}

.quoted-username {
  font-size: 0.75rem;
  opacity: 0.8;
  display: block;
  margin-bottom: 2px;
}

.quoted-msg {
  font-size: 0.85rem;
  opacity: 0.8;
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quoted Reply Box in Input Section */
.quoted-reply-box {
  background: var(--bg-secondary);
  border-left: 4px solid var(--accent);
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

@media (max-width: 768px) {
  .quoted-reply-box {
    padding: 8px 10px;
    margin-bottom: 10px;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .quoted-reply-box {
    padding: 6px 8px;
    margin-bottom: 8px;
    gap: 6px;
    border-left-width: 3px;
  }
}

.quoted-reply-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 12px;
}

.quoted-reply-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.quoted-reply-emoji {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.quoted-reply-text {
  flex: 1;
  min-width: 0;
}

.quoted-reply-text strong {
  font-size: 0.85rem;
  color: var(--accent);
  display: block;
  margin-bottom: 4px;
}

.quoted-reply-text p {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  word-break: break-word;
  white-space: normal;
  max-height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .quoted-reply-emoji {
    font-size: 1rem;
  }

  .quoted-reply-text strong {
    font-size: 0.8rem;
    margin-bottom: 2px;
  }

  .quoted-reply-text p {
    font-size: 0.75rem;
    max-height: 32px;
  }
}

@media (max-width: 600px) {
  .quoted-reply-emoji {
    font-size: 0.95rem;
  }

  .quoted-reply-text strong {
    font-size: 0.75rem;
    margin-bottom: 0px;
  }

  .quoted-reply-text p {
    font-size: 0.7rem;
    max-height: 28px;
  }
}

.quoted-reply-close {
  flex-shrink: 0;
  color: var(--text-secondary) !important;
}

.quoted-reply-close:hover {
  color: var(--accent) !important;
}

/* Action Buttons Always Visible */
.action-buttons {
  opacity: 1;
  transition: opacity 0.2s ease;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.3rem;
}

.action-btn {
  color: var(--accent) !important;
  transition: all 0.2s ease;
  background-color: transparent !important;
  background: transparent !important;
}

:deep(.action-btn .v-btn__content) {
  background: transparent !important;
}

:deep(.action-btn .v-btn__overlay) {
  background: transparent !important;
}

.message-sent .action-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  background-color: transparent !important;
  background: transparent !important;
}

.message-received .action-btn {
  color: var(--accent) !important;
  background-color: transparent !important;
  background: transparent !important;
}

.action-btn:hover {
  transform: scale(1.15);
  background-color: rgba(102, 126, 234, 0.15) !important;
}

.message-sent .action-btn:hover {
  color: white !important;
  background-color: rgba(255, 255, 255, 0.25) !important;
}

.pinned-btn-active {
  color: #F44336 !important;
}

.message-sent .pinned-btn-active {
  color: #EF5350 !important;
}

/* Tablet Responsive (600px - 960px) */
@media (max-width: 960px) {
  .chat-content {
    gap: 0;
  }

  .messages-container {
    padding: 0;
    min-height: 0;
  }

  .messages-list {
    padding: 1.25rem;
  }

  .message-content-container {
    max-width: 80%;
  }

  .message-card {
    max-width: 100%;
  }

  .message-wrapper:first-child {
    margin-top: 1.5rem;
  }

  .input-section {
    padding: 0.75rem 1.25rem 1.25rem;
    gap: 0.75rem;
    border-radius: 16px 16px 0 0;
  }

  .input-wrapper {
    gap: 0.5rem;
  }

  .quoted-reply-box {
    padding: 8px 10px;
  }

  .quoted-reply-text strong {
    font-size: 0.8rem;
  }

  .quoted-reply-text p {
    font-size: 0.75rem;
  }
}

.message-sent {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-sent .message-content {
  color: white;
}

/* Make URLs visible on sent message background */
.message-sent .message-content :deep(.url-link) {
  color: #FFFF00;
  background: rgba(255, 255, 255, 0.25);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  text-decoration: underline;
}

.message-sent .message-content :deep(.url-link):hover {
  background: rgba(255, 255, 255, 0.35);
  border: 1.5px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  color: #FFFF66;
}

.message-sent .message-content :deep(.url-link)::after {
  background: rgba(255, 255, 0, 0.8);
}

/* Make mentions visible on sent message background */
.message-sent .message-content :deep(.mention-valid) {
  color: #FFFF00;
  background: rgba(255, 255, 255, 0.25);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.message-sent .message-content :deep(.mention-valid):hover {
  color: #FFFF66;
}

.message-sent .message-content :deep(.mention-all) {
  color: #FFFF00;
  background: rgba(255, 255, 255, 0.25);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.message-sent .message-content :deep(.mention-all):hover {
  color: #FFFF66;
}

.message-sent .message-content :deep(.mention-invalid) {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.message-sent .time-stamp {
  color: rgba(255, 255, 255, 0.7);
}

.message-sent :deep(.v-icon) {
  color: #fff !important;
}

.message-sent .copy-icon {
  color: rgba(255, 255, 255, 0.6);
}

.message-sent .copy-icon:hover {
  color: rgba(255, 255, 255, 1);
}

.message-sent .copy-btn {
  opacity: 0.7;
}

.message-sent .copy-btn:hover {
  opacity: 1 !important;
}

.message-sent .copy-icon-btn {
  color: rgba(255, 255, 255, 0.7);
}

.message-sent .copy-icon-btn:hover {
  color: white !important;
  opacity: 1 !important;
}

.message-received {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  border-left: 4px solid var(--border);
  transition: background 0.3s, color 0.3s;
}

.message-received .message-content :deep(.mention-valid) {
  color: #fff;
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.35), rgba(30, 144, 255, 0.25));
  border: 1px solid rgba(10, 92, 255, 0.5);
}

.message-received .message-content :deep(.mention-all) {
  color: #fff;
  background: linear-gradient(135deg, rgba(255, 45, 85, 0.3), rgba(255, 107, 107, 0.2));
  border: 1px solid rgba(255, 45, 85, 0.5);
}

/* URL styling for received messages */
.message-received .message-content :deep(.url-link) {
  color: #fff;
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.3), rgba(30, 144, 255, 0.2));
  border: 1px solid rgba(10, 92, 255, 0.5);
  text-decoration: underline;
}

.message-received .message-content :deep(.url-link):hover {
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.45), rgba(30, 144, 255, 0.35));
  border: 1px solid rgba(10, 92, 255, 0.7);
  color: #fff;
}

:root.dark .message-received {
  border-left: 2px solid var(--border-accent);
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* URL tag styling for better visibility */
.message-content :deep(.url-link) {
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #4FC3F7;
}

/* Mention tag styling for better visibility */
.message-content :deep(.mention-tag) {
  font-weight: 700;
  letter-spacing: 0.3px;
  word-spacing: 0;
  color: #fff;
}

.message-content :deep(.mention-valid) {
  color: #fff;
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.4), rgba(30, 144, 255, 0.3));
  border: 1px solid rgba(10, 92, 255, 0.6);
  box-shadow: 0 2px 8px rgba(10, 92, 255, 0.2);
}

.message-content :deep(.mention-all) {
  color: #fff;
  background: linear-gradient(135deg, rgba(255, 45, 85, 0.35), rgba(255, 107, 107, 0.25));
  border: 1px solid rgba(255, 45, 85, 0.6);
  box-shadow: 0 2px 8px rgba(255, 45, 85, 0.2);
}

.message-content :deep(.mention-invalid) {
  color: #aaa;
  background: rgba(180, 180, 180, 0.2);
  border: 1px solid rgba(100, 100, 100, 0.4);
  opacity: 0.8;
}

.copy-icon {
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s ease;
  color: var(--accent);
}

.copy-icon:hover {
  opacity: 1;
  color: var(--accent);
  transform: scale(1.2);
}

.copy-btn {
  opacity: 0.7;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  opacity: 1 !important;
  transform: scale(1.15);
}

.copy-icon-btn {
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s ease;
  color: var(--accent);
}

.copy-icon-btn:hover {
  opacity: 1 !important;
  color: var(--accent) !important;
  transform: scale(1.2);
}

.alert-error {
  border-radius: 8px;
  border-left: 4px solid var(--error);
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter-active {
  animation: slideIn 0.3s ease-out;
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
  transition: background 0.3s;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 1rem;
}

.w-100 {
  width: 100%;
}

/* Message Highlight Animation */
.message-highlighted {
  animation: messageHighlight 2s ease-in-out;
}

@keyframes messageHighlight {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(102, 126, 234, 0.15);
  }
}

.message-deleted-text {
  opacity: 0.6;
  font-style: italic;
  color: var(--text-secondary);
}

/* ===== IMAGE UPLOAD STYLES ===== */

/* Image Input Group */
.message-input-group {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex: 1;
}

/* Image Preview Section */
.file-preview-section {
  margin-bottom: 1rem;
}

.file-preview-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  border: 2px solid var(--accent);
  border-radius: 12px !important;
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.preview-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 600;
}

.preview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
}

@media (max-width: 768px) {
  .preview-header {
    padding: 10px 12px;
  }

  .preview-header h4 {
    font-size: 0.9rem;
  }

  .preview-content {
    gap: 0.75rem;
    padding: 0.75rem;
  }
}

@media (max-width: 600px) {
  .file-preview-section {
    margin-bottom: 0.5rem;
  }

  .preview-header {
    padding: 8px 10px;
  }

  .preview-header h4 {
    font-size: 0.85rem;
  }

  .preview-content {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.6rem;
  }
}

.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-primary);
}

.preview-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.info-item {
  font-size: 0.875rem;
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.info-item strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 0.25rem;
}

.compression-info {
  background: rgba(34, 197, 94, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid var(--success);
}

.compression-ratio {
  color: var(--success);
  font-weight: bold;
  margin-top: 0.5rem;
}

.upload-progress-section {
  background: rgba(59, 130, 246, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid var(--info);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.progress-label {
  font-weight: 600;
  color: var(--info);
}

.progress-percentage {
  font-weight: bold;
  color: var(--info);
}

@media (max-width: 768px) {
  .info-item {
    font-size: 0.8rem;
    margin: 0.4rem 0;
  }

  .info-item strong {
    margin-bottom: 0.2rem;
  }

  .compression-info {
    padding: 0.5rem;
  }

  .compression-ratio {
    font-size: 0.8rem;
    margin-top: 0.3rem;
  }
}

@media (max-width: 600px) {
  .info-item {
    font-size: 0.75rem;
    margin: 0.3rem 0;
  }

  .info-item strong {
    margin-bottom: 0.15rem;
  }

  .compression-info {
    padding: 0.4rem;
    border-left-width: 2px;
  }

  .compression-ratio {
    font-size: 0.75rem;
    margin-top: 0.2rem;
  }
}

/* Mobile view for file/image preview */
@media (max-width: 600px) {
  .preview-content {
    grid-template-columns: 1fr;
  }
}

/* Image Display in Chat */
.image-display {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 300px;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-primary);
}

.chat-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
}

.image-size-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* File Download Section */
.file-download-section {
  width: 100%;
}

.file-card {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
  user-select: none;
}

.file-card:hover {
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.file-card:active {
  opacity: 0.9;
}

.file-card:hover .file-download-icon {
  transform: none;
}

/* Download progress overlay (shown while a file is being downloaded/reassembled) */
.download-progress-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  border-radius: inherit;
  z-index: 2;
  backdrop-filter: blur(2px);
}

.download-progress-content {
  width: 100%;
  max-width: 240px;
}

.download-progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.file-name {
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  word-break: break-word;
}

.file-size {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  margin-top: 2px;
}

/* Attachments Section */
.attachments-section {
  width: 100%;
}

.attachments-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  width: 100%;
}

.attachment-image {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-secondary);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: box-shadow 0.2s ease;
}

.attachment-image:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  border-color: rgba(99, 102, 241, 0.5);
}

.attachment-image .chat-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  pointer-events: none;
}

.attachment-image:hover .image-overlay {
  background: rgba(0, 0, 0, 0.35);
}

.image-size-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.files-list .file-card {
  width: 100%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.file-info {
  flex: 1;
}

/* Image Modal */
.image-modal {
  background: #000;
}

.image-modal-header {
  background: rgba(0, 0, 0, 0.9) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  z-index: 200;
}

.image-modal-header .v-btn {
  color: white !important;
}

.image-modal-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #000;
  padding: 2rem;
}

.modal-image {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
}

/* Input Wrapper Adjustments */
.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
  padding: 0 8px;
}

.message-input {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
}

/* New Message Toast Styles */
.new-message-toast {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.toast-content-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  width: 100%;
}

.toast-avatar {
  font-size: 24px;
  min-width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.toast-message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 12px;
  flex: 1;
  min-width: 0;
}

.toast-sender-name {
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
}

.toast-message-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============================================================
   DISCORD-STYLE LAYOUT
   ============================================================ */
.chat-container {
  flex-direction: row !important;
  padding: 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
}

/* ---------- Sidebar ---------- */
.channel-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #2b2d31;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  height: 100vh;
  z-index: 1001;
  transition: width 0.2s ease, transform 0.2s ease;
}

.channel-sidebar.hidden {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-server-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.35);
  font-weight: 700;
}

.server-name {
  color: #f2f3f5;
  font-size: 15px;
  letter-spacing: 0.3px;
}

.server-chevron {
  color: #949ba4;
}

.channel-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.channel-category {
  color: #949ba4;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 8px 8px 4px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 8px;
  margin-bottom: 2px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #949ba4;
  font-size: 15px;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.channel-item:hover {
  background: rgba(78, 80, 88, 0.4);
  color: #dbdee1;
}

.channel-item.active {
  background: rgba(88, 101, 242, 0.25);
  color: #f2f3f5;
}

.channel-hash {
  font-size: 19px;
  font-weight: 400;
  opacity: 0.75;
  line-height: 1;
}

.channel-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel-gear {
  display: none;
  color: #949ba4;
  padding: 2px;
  border-radius: 4px;
}

.channel-gear:hover {
  color: #dbdee1;
}

.channel-item:hover .channel-gear,
.channel-item.active .channel-gear {
  display: inline-flex;
}

.add-channel-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 8px 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #949ba4;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.add-channel-btn:hover {
  background: rgba(78, 80, 88, 0.4);
  color: #23a55a;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: #232428;
}

.footer-user {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.footer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #5865f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.footer-username {
  color: #f2f3f5;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.footer-btn {
  color: #b5bac1 !important;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
}

.sidebar-hamburger {
  display: inline-flex;
  color: #b5bac1 !important;
}

/* ---------- Channel header ---------- */
.channel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  background: #313338;
  border-bottom: 1px solid rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  box-shadow: none !important;
}

.channel-title {
  color: #f2f3f5;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-stats-mini {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #949ba4;
  font-size: 11px;
  font-weight: 600;
}

.flex-spacer {
  flex: 1;
}

.channel-header .search-field {
  width: 240px;
}

.header-icon-btn {
  color: #b5bac1 !important;
  flex-shrink: 0;
}

/* Inline emoji button inside the message input box */
.emoji-inline-btn {
  position: absolute;
  right: 8px;
  bottom: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #949ba4;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.emoji-inline-btn:hover:not(:disabled) {
  color: #dbdee1;
  background: rgba(255, 255, 255, 0.06);
}

.emoji-inline-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.message-input :deep(textarea) {
  padding-right: 42px !important;
}

.call-btn:hover {
  color: #23a55a !important;
}

/* ---------- Call banner ---------- */
.call-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(35, 165, 90, 0.12);
  border-bottom: 1px solid rgba(35, 165, 90, 0.3);
  flex-shrink: 0;
}

.call-banner-text {
  color: #23a55a;
  font-size: 13px;
  font-weight: 600;
}

.call-banner-rejoin {
  color: #5865f2;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.call-banner-rejoin:hover {
  text-decoration: underline;
}

.chat-container.light-mode .call-banner-text,
.chat-container.light-mode .call-banner-rejoin {
  color: #1a7f47;
}

/* ---------- Channel dialogs ---------- */
.member-select-list,
.member-list {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.visibility-toggle {
  border-radius: 8px;
}

.chat-container.light-mode .header-icon-btn {
  color: #4e5058 !important;
}

/* ---------- Messages (Discord flat style) ---------- */
.message-wrapper {
  position: relative;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 6px 48px 6px 16px;
  position: relative;
  transition: background 0.1s;
}

.message-row:hover {
  background: rgba(78, 80, 88, 0.2);
}

/* Own messages: same internal layout as received, group pushed to the right corner */
.message-row.own-message {
  justify-content: flex-end;
}

.message-row.own-message .row-body {
  flex: 0 1 auto;
  max-width: 78%;
}

.row-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-top: 2px;
  user-select: none;
}

.row-body {
  flex: 1;
  min-width: 0;
}

.row-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.row-author {
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
}

.row-ts {
  color: #949ba4;
  font-size: 11px;
  font-weight: 500;
}

.row-body .message-content {
  color: #dbdee1;
  white-space: pre-wrap;
  word-break: break-word;
}

.row-body .message-deleted-text {
  color: #949ba4;
  font-style: italic;
}

/* Hover actions — Discord style floating toolbar */
/* Anchored to the bubble (message-card), not the full-width row */
.message-row .action-buttons {
  position: absolute;
  top: -13px;
  right: 10px;
  background: #313338;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  padding: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
  z-index: 5;
}

.message-row:hover .action-buttons {
  opacity: 1;
  pointer-events: auto;
}

/* Light mode palette */
.chat-container.light-mode {
  --bg-primary: #ffffff;
}

.chat-container.light-mode .channel-sidebar {
  background: #f2f3f5;
  border-right-color: #e3e5e8;
}

.chat-container.light-mode .sidebar-server-header {
  border-bottom-color: #e3e5e8;
}

.chat-container.light-mode .server-name,
.chat-container.light-mode .footer-username {
  color: #060607;
}

.chat-container.light-mode .channel-item {
  color: #5c5e66;
}

.chat-container.light-mode .channel-item:hover {
  background: rgba(6, 6, 7, 0.06);
  color: #060607;
}

.chat-container.light-mode .channel-item.active {
  background: rgba(88, 101, 242, 0.15);
  color: #060607;
}

.chat-container.light-mode .add-channel-btn {
  color: #5c5e66;
}

.chat-container.light-mode .sidebar-footer {
  background: #ebedef;
}

.chat-container.light-mode .footer-btn {
  color: #4e5058 !important;
}

.chat-container.light-mode .channel-header {
  background: #ffffff;
  border-bottom-color: #e3e5e8;
}

.chat-container.light-mode .channel-title {
  color: #060607;
}

.chat-container.light-mode .stat-pill {
  background: rgba(0, 0, 0, 0.05);
  color: #5c5e66;
}

.chat-container.light-mode .message-row:hover {
  background: rgba(6, 6, 7, 0.04);
}

.chat-container.light-mode .row-body .message-content {
  color: #2e3338;
}

.chat-container.light-mode .row-ts {
  color: #5c5e66;
}

.chat-container.light-mode .message-row .action-buttons {
  background: #ffffff;
  border-color: #e3e5e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.chat-container.light-mode .emoji-inline-btn {
  color: #5c5e66;
}

.chat-container.light-mode .emoji-inline-btn:hover:not(:disabled) {
  color: #060607;
  background: rgba(0, 0, 0, 0.06);
}

/* ---------- Mobile ---------- */
@media (max-width: 900px) {
  .channel-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.4);
  }

  .channel-sidebar.open {
    transform: translateX(0);
  }

  .header-search :deep(.search-field) {
    width: 150px;
  }

  .header-stats-mini {
    display: none;
  }

  .message-row {
    padding: 6px 16px 6px 12px;
    gap: 10px;
  }

  .row-avatar {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  /* Safe area padding for notched phones */
  .channel-header {
    padding: 0 12px;
    height: 48px;
  }

  .input-section {
    padding: 0.4rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
    border-radius: 12px 12px 0 0;
  }

  /* Action buttons: minimum 44px touch targets */
  :deep(.upload-btn),
  :deep(.location-btn),
  :deep(.live-toggle),
  :deep(.send-btn) {
    min-width: 44px !important;
    min-height: 44px !important;
    width: 44px !important;
    height: 44px !important;
  }

  :deep(.sticker-btn) {
    min-width: 44px !important;
    min-height: 44px !important;
    width: 44px !important;
    height: 44px !important;
  }

  /* Input text area */
  .message-input-wrapper {
    min-height: 40px;
    border-radius: 20px;
  }

  :deep(.message-input textarea) {
    font-size: 16px !important; /* Prevent iOS zoom on focus */
    padding: 8px 12px !important;
  }

  /* Messages */
  .messages-list {
    padding: 0.75rem 0.5rem;
  }

  .message-content-container {
    max-width: 88%;
  }

  .message-card {
    min-width: 80px;
  }

  /* Chat container fill remaining space */
  .chat-main {
    min-width: 0;
  }

  .chat-container {
    flex-direction: column;
  }

  /* Hamburger always visible */
  .sidebar-hamburger {
    display: inline-flex !important;
  }

  /* Reply box */
  .quoted-reply-box {
    padding: 6px 8px;
  }

  .quoted-reply-content {
    gap: 6px;
  }

  /* File preview on mobile */
  .file-preview-card {
    max-height: 200px;
    overflow-y: auto;
  }

  /* Empty state */
  .empty-state {
    padding: 1rem;
    text-align: center;
  }

  .empty-state h3 {
    font-size: 1rem;
  }

  .empty-state p {
    font-size: 0.85rem;
  }
}

/* Small phones: <= 380px */
@media (max-width: 380px) {
  .channel-header {
    padding: 0 8px;
    gap: 6px;
  }

  .channel-title {
    font-size: 14px;
  }

  .header-icon-btn {
    min-width: 36px !important;
    min-height: 36px !important;
  }

  :deep(.upload-btn),
  :deep(.location-btn),
  :deep(.live-toggle),
  :deep(.send-btn) {
    min-width: 40px !important;
    min-height: 40px !important;
    width: 40px !important;
    height: 40px !important;
  }

  .message-content-container {
    max-width: 92%;
  }

  .message-row {
    padding: 4px 8px;
    gap: 8px;
  }

  .row-avatar {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .messages-list {
    padding: 0.5rem 0.35rem;
  }
}
</style>
