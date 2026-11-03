// Real-Time Chat Platform Client Script
document.addEventListener('DOMContentLoaded', () => {
    // Current state
    let activeConversation = null;
    let conversations = [];
    let isTyping = false;
    let typingTimeout = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecordingAudio = false;

    // Connect to Socket.IO
    const socket = io();

    // DOM Elements
    const conversationList = document.getElementById('conversationList');
    const emptyChatState = document.getElementById('emptyChatState');
    const activeChatWindow = document.getElementById('activeChatWindow');
    const chatHeaderTitle = document.getElementById('chatHeaderTitle');
    const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
    const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
    const chatHeaderOnlineDot = document.getElementById('chatHeaderOnlineDot');
    const btnGroupInfo = document.getElementById('btnGroupInfo');
    const btnLeaveGroup = document.getElementById('btnLeaveGroup');
    const messagesFeed = document.getElementById('messagesFeed');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageForm = document.getElementById('messageForm');
    const messageTextInput = document.getElementById('messageTextInput');
    const mediaFileInput = document.getElementById('mediaFileInput');
    const attachmentPreviewBar = document.getElementById('attachmentPreviewBar');
    const previewFileName = document.getElementById('previewFileName');
    const previewIconOrImg = document.getElementById('previewIconOrImg');
    const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');
    const audioRecordBtn = document.getElementById('audioRecordBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const typingText = document.getElementById('typingText');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchUsersList = document.getElementById('searchUsersList');
    const searchMessagesList = document.getElementById('searchMessagesList');
    const toastContainer = document.getElementById('toastContainer');
    const unreadTotalBadge = document.getElementById('unreadTotalBadge');

    // Selected attachment file holder
    let selectedAttachmentFile = null;

    // Web Audio chime for incoming notifications
    const playNotificationSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    };

    // Show Toast Notification
    const showToast = (title, message, onClick) => {
        const toast = document.createElement('div');
        toast.className = 'toast-alert';
        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid fa-comment-dots"></i></div>
            <div class="toast-body">
                <strong>${escapeHtml(title)}</strong>
                <p>${escapeHtml(message)}</p>
            </div>
            <button class="toast-close">&times;</button>
        `;

        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close')) {
                if (onClick) onClick();
            }
            toast.remove();
        });

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);
        playNotificationSound();

        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 5000);
    };

    // Helper: Escape HTML
    function escapeHtml(string) {
        if (!string) return '';
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(string).replace(/[&<>"']/g, s => entityMap[s]);
    }

    // Helper: Format Time
    function formatTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Helper: Format Last Seen
    function formatLastSeen(dateStr) {
        if (!dateStr) return 'Offline';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Last seen just now';
        if (diffMins < 60) return `Last seen ${diffMins}m ago`;
        if (d.toDateString() === now.toDateString()) {
            return `Last seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return `Last seen on ${d.toLocaleDateString()}`;
    }

    // Helper: Scroll Feed to bottom
    const scrollToBottom = (smooth = true) => {
        if (smooth) {
            messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
        } else {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    };

    // Load Conversations List
    async function loadConversations() {
        try {
            const res = await fetch('/api/v1/conversations');
            const data = await res.json();
            if (res.ok && data.success) {
                conversations = data.data;
                renderConversationsList();
            } else {
                conversationList.innerHTML = `<li class="empty-state-item">Failed to load chats</li>`;
            }
        } catch (err) {
            conversationList.innerHTML = `<li class="empty-state-item">Network error</li>`;
        }
    }

    // Render Conversations in Sidebar
    function renderConversationsList() {
        if (!conversations || conversations.length === 0) {
            conversationList.innerHTML = `
                <li class="empty-state-item">
                    <i class="fa-regular fa-comments"></i>
                    <p>No conversations yet.<br>Start a chat or create a group!</p>
                </li>
            `;
            unreadTotalBadge.style.display = 'none';
            return;
        }

        let totalUnread = 0;
        conversationList.innerHTML = '';

        conversations.forEach(c => {
            const isGroup = c.type === 'group';
            let title = isGroup ? c.title : (c.partner ? c.partner.name : 'Unknown User');
            let avatar = isGroup ? (c.group_avatar_url || '/images/default-group.svg') : ((c.partner && c.partner.profile_picture_url) || '/images/default-avatar.svg');
            let isOnline = !isGroup && c.partner && c.partner.is_online;

            let lastMsgText = 'No messages yet';
            let lastMsgTime = '';
            if (c.last_message) {
                lastMsgTime = formatTime(c.last_message.createdAt);
                if (c.last_message.message_type === 'image') {
                    lastMsgText = '<i class="fa-regular fa-image"></i> Photo';
                } else if (c.last_message.message_type === 'audio') {
                    lastMsgText = '<i class="fa-solid fa-microphone"></i> Voice message';
                } else {
                    lastMsgText = escapeHtml(c.last_message.content);
                }

                if (isGroup && c.last_message.sender) {
                    lastMsgText = `${c.last_message.sender.name.split(' ')[0]}: ${lastMsgText}`;
                }
            }

            const unreadCount = c.unread_count || 0;
            totalUnread += unreadCount;

            const isActive = activeConversation && activeConversation.id === c.id;

            const li = document.createElement('li');
            li.className = `conversation-item ${isActive ? 'active' : ''}`;
            li.dataset.conversationId = c.id;
            li.innerHTML = `
                <div class="avatar-wrapper">
                    <img src="${avatar}" alt="${escapeHtml(title)}" class="user-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                    ${!isGroup ? `<span class="status-indicator ${isOnline ? 'online' : 'offline'}" data-user-dot="${c.partner ? c.partner.id : ''}"></span>` : ''}
                </div>
                <div class="convo-content">
                    <div class="convo-top-row">
                        <h4 class="convo-name">${escapeHtml(title)}</h4>
                        <span class="convo-time">${lastMsgTime}</span>
                    </div>
                    <div class="convo-bottom-row">
                        <p class="convo-last-msg">${lastMsgText}</p>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            `;

            li.addEventListener('click', () => {
                selectConversation(c.id);
            });

            conversationList.appendChild(li);
        });

        if (totalUnread > 0) {
            unreadTotalBadge.textContent = totalUnread;
            unreadTotalBadge.style.display = 'inline-block';
        } else {
            unreadTotalBadge.style.display = 'none';
        }
    }

    // Select and Open Conversation
    async function selectConversation(conversationId) {
        try {
            const res = await fetch(`/api/v1/conversations/${conversationId}`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || 'Error opening conversation');
                return;
            }

            activeConversation = data.data;

            // Update sidebar active class
            document.querySelectorAll('.conversation-item').forEach(el => {
                el.classList.toggle('active', el.dataset.conversationId == conversationId);
            });

            // Clear unread badge in memory and UI
            const convoItem = conversations.find(c => c.id === Number(conversationId));
            if (convoItem) {
                convoItem.unread_count = 0;
                renderConversationsList();
            }

            // Switch view
            emptyChatState.style.display = 'none';
            activeChatWindow.style.display = 'flex';

            // Setup Header
            const isGroup = activeConversation.type === 'group';
            let title = isGroup ? activeConversation.title : '';
            let avatar = isGroup ? (activeConversation.group_avatar_url || '/images/default-group.svg') : '/images/default-avatar.svg';
            let subtitle = '';

            if (isGroup) {
                const memberCount = activeConversation.participants ? activeConversation.participants.length : 0;
                subtitle = `${memberCount} members`;
                chatHeaderOnlineDot.style.display = 'none';
                btnGroupInfo.style.display = 'inline-flex';
                btnLeaveGroup.style.display = 'inline-flex';
            } else {
                const partnerParticipant = activeConversation.participants.find(p => p.user_id !== CURRENT_USER.id);
                const partner = partnerParticipant ? partnerParticipant.user : null;
                title = partner ? partner.name : 'Direct Chat';
                avatar = (partner && partner.profile_picture_url) || '/images/default-avatar.svg';

                chatHeaderOnlineDot.style.display = 'block';
                if (partner && partner.is_online) {
                    chatHeaderOnlineDot.className = 'status-indicator online';
                    subtitle = 'Online';
                } else {
                    chatHeaderOnlineDot.className = 'status-indicator offline';
                    subtitle = partner ? formatLastSeen(partner.last_seen_at) : 'Offline';
                }

                btnGroupInfo.style.display = 'none';
                btnLeaveGroup.style.display = 'none';
            }

            chatHeaderTitle.textContent = title;
            chatHeaderSubtitle.textContent = subtitle;
            chatHeaderAvatar.src = avatar;

            // Join socket room
            socket.emit('join_conversation', conversationId);

            // Fetch Messages
            await loadMessages(conversationId);

            // Focus text input
            messageTextInput.focus();
        } catch (err) {
            console.error('Error selecting conversation:', err);
        }
    }

    // Load Messages for active conversation
    async function loadMessages(conversationId) {
        messagesFeed.innerHTML = '<div class="loading-messages"><i class="fa-solid fa-spinner fa-spin"></i> Loading messages...</div>';
        try {
            const res = await fetch(`/api/v1/conversations/${conversationId}/messages`);
            const data = await res.json();
            if (res.ok && data.success) {
                renderMessages(data.data);
                scrollToBottom(false);

                // Notify socket mark as read
                if (data.data.length > 0) {
                    const latestMsg = data.data[data.data.length - 1];
                    socket.emit('mark_read', { conversationId, messageId: latestMsg.id });
                }
            } else {
                messagesFeed.innerHTML = '<div class="empty-feed">Failed to load messages</div>';
            }
        } catch (err) {
            messagesFeed.innerHTML = '<div class="empty-feed">Error loading messages</div>';
        }
    }

    // Render Messages list
    function renderMessages(messages) {
        if (!messages || messages.length === 0) {
            messagesFeed.innerHTML = `
                <div class="empty-feed">
                    <i class="fa-regular fa-comment-dots"></i>
                    <p>No messages yet. Send a message to start the conversation!</p>
                </div>
            `;
            return;
        }

        messagesFeed.innerHTML = '';
        messages.forEach(msg => {
            appendMessageToFeed(msg, false);
        });
    }

    // Append single message to feed
    function appendMessageToFeed(msg, shouldScroll = true) {
        // If empty feed placeholder exists, remove it
        const emptyFeed = messagesFeed.querySelector('.empty-feed');
        if (emptyFeed) emptyFeed.remove();

        // System messages (e.g. joined/left group)
        if (msg.message_type === 'system') {
            const sysDiv = document.createElement('div');
            sysDiv.className = 'system-message-row';
            sysDiv.innerHTML = `<span>${escapeHtml(msg.content)}</span>`;
            messagesFeed.appendChild(sysDiv);
            if (shouldScroll) scrollToBottom();
            return;
        }

        const isMine = msg.sender_id === CURRENT_USER.id;
        const msgRow = document.createElement('div');
        msgRow.className = `message-row ${isMine ? 'outgoing' : 'incoming'}`;
        msgRow.id = `msg-${msg.id}`;

        let mediaHtml = '';
        if (msg.message_type === 'image' && msg.media_url) {
            mediaHtml = `
                <div class="message-image-container" onclick="openLightbox('${msg.media_url}')">
                    <img src="${msg.media_url}" alt="Attachment" class="chat-image-preview" loading="lazy">
                </div>
            `;
        } else if (msg.message_type === 'audio' && msg.media_url) {
            mediaHtml = `
                <div class="message-audio-container">
                    <audio controls src="${msg.media_url}" preload="metadata" class="chat-audio-player"></audio>
                </div>
            `;
        }

        // Reactions aggregated
        const reactionsMap = {};
        if (msg.reactions && msg.reactions.length > 0) {
            msg.reactions.forEach(r => {
                reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
            });
        }
        let reactionsHtml = '<div class="message-reactions-bar">';
        Object.entries(reactionsMap).forEach(([emoji, count]) => {
            reactionsHtml += `<span class="reaction-pill" onclick="handleReactionClick(${msg.id}, '${emoji}')">${emoji} ${count}</span>`;
        });
        reactionsHtml += '</div>';

        const senderName = (!isMine && msg.sender) ? `<span class="message-sender-name">${escapeHtml(msg.sender.name)}</span>` : '';
        const editedTag = msg.is_edited ? `<span class="edited-label">(edited)</span>` : '';
        const deletedClass = msg.is_deleted ? 'deleted-text' : '';

        msgRow.innerHTML = `
            ${!isMine && msg.sender ? `
                <img src="${msg.sender.profile_picture_url || '/images/default-avatar.svg'}" alt="${escapeHtml(msg.sender.name)}" class="sender-mini-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
            ` : ''}
            <div class="message-bubble-wrapper">
                ${senderName}
                <div class="message-bubble ${deletedClass}">
                    ${mediaHtml}
                    ${msg.content ? `<p class="message-text">${escapeHtml(msg.content)}</p>` : ''}
                    <div class="message-meta">
                        ${editedTag}
                        <span class="message-time">${formatTime(msg.createdAt)}</span>
                        ${isMine ? `<span class="read-receipt"><i class="fa-solid fa-check-double"></i></span>` : ''}
                    </div>
                </div>
                ${reactionsHtml}
            </div>

            <!-- Hover Action Buttons -->
            <div class="message-actions-bar">
                <!-- Emoji Reaction Button -->
                <div class="reaction-action-dropdown">
                    <button class="msg-action-btn" title="React"><i class="fa-regular fa-face-smile"></i></button>
                    <div class="reaction-quick-picker">
                        <span onclick="handleReactionClick(${msg.id}, '👍')">👍</span>
                        <span onclick="handleReactionClick(${msg.id}, '❤️')">❤️</span>
                        <span onclick="handleReactionClick(${msg.id}, '😂')">😂</span>
                        <span onclick="handleReactionClick(${msg.id}, '😮')">😮</span>
                        <span onclick="handleReactionClick(${msg.id}, '😢')">😢</span>
                        <span onclick="handleReactionClick(${msg.id}, '🔥')">🔥</span>
                    </div>
                </div>

                ${isMine && !msg.is_deleted && msg.message_type === 'text' ? `
                    <button class="msg-action-btn" onclick="openEditMessageModal(${msg.id}, '${escapeHtml(msg.content).replace(/'/g, "\\'")}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                ` : ''}

                ${isMine && !msg.is_deleted ? `
                    <button class="msg-action-btn text-danger" onclick="handleDeleteMessage(${msg.id})" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;

        messagesFeed.appendChild(msgRow);
        if (shouldScroll) scrollToBottom();
    }

    // Send Message Handler
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeConversation) return;

        const content = messageTextInput.value.trim();

        // If there is an attachment file (image or audio), upload via multipart API
        if (selectedAttachmentFile) {
            const formData = new FormData();
            formData.append('media', selectedAttachmentFile);
            if (content) formData.append('content', content);

            try {
                const res = await fetch(`/api/v1/conversations/${activeConversation.id}/messages`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    clearAttachment();
                    messageTextInput.value = '';
                } else {
                    alert((data.error && data.error[0]) || data.message || 'Upload failed');
                }
            } catch (err) {
                alert('Error uploading media message');
            }
            return;
        }

        // Standard text message via Socket.io
        if (!content) return;

        socket.emit('send_message', {
            conversationId: activeConversation.id,
            content,
            message_type: 'text'
        }, (response) => {
            if (!response.success) {
                alert('Error sending message: ' + response.error);
            }
        });

        messageTextInput.value = '';
        socket.emit('stop_typing', { conversationId: activeConversation.id });
    });

    // Typing Events
    messageTextInput.addEventListener('input', () => {
        if (!activeConversation) return;
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', { conversationId: activeConversation.id });
        }
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            socket.emit('stop_typing', { conversationId: activeConversation.id });
        }, 2000);
    });

    // File Attachment Handler
    mediaFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        selectedAttachmentFile = file;
        previewFileName.textContent = file.name;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewIconOrImg.innerHTML = `<img src="${ev.target.result}" class="preview-mini-thumb" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
            previewIconOrImg.innerHTML = `<i class="fa-solid fa-file-audio preview-audio-icon"></i>`;
        }

        attachmentPreviewBar.style.display = 'flex';
    });

    const clearAttachment = () => {
        selectedAttachmentFile = null;
        mediaFileInput.value = '';
        attachmentPreviewBar.style.display = 'none';
        previewIconOrImg.innerHTML = '';
        previewFileName.textContent = '';
    };
    removeAttachmentBtn.addEventListener('click', clearAttachment);

    // Audio Voice Recording via Web MediaRecorder
    audioRecordBtn.addEventListener('click', async () => {
        if (!activeConversation) {
            alert('Please select a conversation first');
            return;
        }

        if (!isRecordingAudio) {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

                    // Upload recorded audio
                    const formData = new FormData();
                    formData.append('media', audioFile);
                    formData.append('message_type', 'audio');

                    try {
                        const res = await fetch(`/api/v1/conversations/${activeConversation.id}/messages`, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                            alert('Failed to send voice recording');
                        }
                    } catch (e) {
                        alert('Failed to send voice recording');
                    }

                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                isRecordingAudio = true;
                audioRecordBtn.classList.add('recording');
                audioRecordBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                audioRecordBtn.title = 'Stop and send voice recording';
            } catch (err) {
                alert('Microphone access denied or not available.');
            }
        } else {
            // Stop recording
            if (mediaRecorder) mediaRecorder.stop();
            isRecordingAudio = false;
            audioRecordBtn.classList.remove('recording');
            audioRecordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            audioRecordBtn.title = 'Record Audio Message';
        }
    });

    // Emoji Picker Trigger in Footer
    const emojiPickerBtn = document.getElementById('emojiPickerBtn');
    const emojiPickerPopup = document.getElementById('emojiPickerPopup');
    emojiPickerBtn.addEventListener('click', () => {
        emojiPickerPopup.style.display = emojiPickerPopup.style.display === 'none' ? 'grid' : 'none';
    });
    emojiPickerPopup.querySelectorAll('.emoji-item').forEach(item => {
        item.addEventListener('click', () => {
            messageTextInput.value += item.textContent;
            messageTextInput.focus();
            emojiPickerPopup.style.display = 'none';
        });
    });

    // Global Reactions Handler
    window.handleReactionClick = (messageId, emoji) => {
        if (!activeConversation) return;
        socket.emit('react_message', {
            messageId,
            conversationId: activeConversation.id,
            emoji
        });
    };

    // Global Edit Message Modal
    window.openEditMessageModal = (messageId, currentContent) => {
        document.getElementById('editMessageId').value = messageId;
        document.getElementById('editMessageContentInput').value = currentContent;
        document.getElementById('editMessageModal').style.display = 'flex';
    };

    document.getElementById('editMessageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const messageId = document.getElementById('editMessageId').value;
        const content = document.getElementById('editMessageContentInput').value.trim();
        if (!content || !activeConversation) return;

        socket.emit('edit_message', {
            messageId,
            conversationId: activeConversation.id,
            content
        }, (res) => {
            if (res.success) {
                closeModal('editMessageModal');
            } else {
                alert(res.error || 'Edit failed');
            }
        });
    });

    // Global Delete Message Handler
    window.handleDeleteMessage = (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        if (!activeConversation) return;

        socket.emit('delete_message', {
            messageId,
            conversationId: activeConversation.id
        }, (res) => {
            if (!res.success) {
                alert(res.error || 'Delete failed');
            }
        });
    };

    // Image Lightbox
    window.openLightbox = (src) => {
        document.getElementById('lightboxImage').src = src;
        document.getElementById('imageLightboxModal').style.display = 'flex';
    };

    // Modal Control Helpers
    window.closeModal = (id) => {
        document.getElementById(id).style.display = 'none';
    };

    // ================= NEW DIRECT CHAT MODAL =================
    window.openNewDirectModal = () => {
        document.getElementById('newDirectModal').style.display = 'flex';
        searchDirectUsers('');
        document.getElementById('directUserSearchInput').focus();
    };

    const directUserSearchInput = document.getElementById('directUserSearchInput');
    const directUsersResultList = document.getElementById('directUsersResultList');

    directUserSearchInput.addEventListener('input', (e) => {
        searchDirectUsers(e.target.value.trim());
    });

    async function searchDirectUsers(query) {
        try {
            const res = await fetch(`/api/v1/users/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (res.ok && data.success) {
                renderDirectSearchResults(data.data);
            }
        } catch (e) {
            directUsersResultList.innerHTML = `<p class="empty-modal-text">Error searching users</p>`;
        }
    }

    function renderDirectSearchResults(users) {
        if (!users || users.length === 0) {
            directUsersResultList.innerHTML = `<p class="empty-modal-text">No registered users found</p>`;
            return;
        }

        directUsersResultList.innerHTML = '';
        users.forEach(u => {
            const div = document.createElement('div');
            div.className = 'modal-user-item';
            div.innerHTML = `
                <div class="avatar-wrapper">
                    <img src="${u.profile_picture_url || '/images/default-avatar.svg'}" alt="${escapeHtml(u.name)}" class="user-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                    <span class="status-indicator ${u.is_online ? 'online' : 'offline'}"></span>
                </div>
                <div class="user-text">
                    <h4>${escapeHtml(u.name)}</h4>
                    <span>@${escapeHtml(u.username)}</span>
                </div>
            `;
            div.addEventListener('click', async () => {
                closeModal('newDirectModal');
                try {
                    const res = await fetch('/api/v1/conversations/direct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ partner_id: u.id })
                    });
                    const resData = await res.json();
                    if (res.ok && resData.success) {
                        await loadConversations();
                        selectConversation(resData.data.id);
                    }
                } catch (err) {
                    alert('Failed to start conversation');
                }
            });
            directUsersResultList.appendChild(div);
        });
    }

    document.getElementById('btnNewDirect').addEventListener('click', openNewDirectModal);

    // ================= NEW GROUP MODAL =================
    window.openNewGroupModal = async () => {
        document.getElementById('newGroupModal').style.display = 'flex';
        const membersList = document.getElementById('groupMembersSelectionList');
        membersList.innerHTML = '<p class="empty-modal-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading users...</p>';

        try {
            const res = await fetch('/api/v1/users/search');
            const data = await res.json();
            if (res.ok && data.success) {
                membersList.innerHTML = '';
                data.data.forEach(u => {
                    const label = document.createElement('label');
                    label.className = 'member-checkbox-item';
                    label.innerHTML = `
                        <input type="checkbox" name="memberIds" value="${u.id}">
                        <img src="${u.profile_picture_url || '/images/default-avatar.svg'}" alt="${escapeHtml(u.name)}" class="mini-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                        <span>${escapeHtml(u.name)} (@${escapeHtml(u.username)})</span>
                    `;
                    membersList.appendChild(label);
                });
            }
        } catch (e) {
            membersList.innerHTML = '<p class="empty-modal-text">Error loading users</p>';
        }
    };

    document.getElementById('btnNewGroup').addEventListener('click', openNewGroupModal);

    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitGroup');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

        const formData = new FormData();
        formData.append('title', document.getElementById('groupTitleInput').value.trim());
        formData.append('description', document.getElementById('groupDescInput').value.trim());

        const avatarFile = document.getElementById('groupAvatarInput').files[0];
        if (avatarFile) formData.append('avatar', avatarFile);

        const checkedBoxes = document.querySelectorAll('input[name="memberIds"]:checked');
        const memberIds = Array.from(checkedBoxes).map(cb => cb.value);
        formData.append('memberIds', JSON.stringify(memberIds));

        try {
            const res = await fetch('/api/v1/conversations/group', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                closeModal('newGroupModal');
                await loadConversations();
                selectConversation(data.data.id);
            } else {
                alert((data.error && data.error[0]) || data.message || 'Failed to create group');
            }
        } catch (err) {
            alert('Network error while creating group');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Group';
        }
    });

    // ================= GROUP INFO & MEMBERS MODAL =================
    btnGroupInfo.addEventListener('click', () => {
        if (!activeConversation || activeConversation.type !== 'group') return;
        document.getElementById('infoGroupAvatar').src = activeConversation.group_avatar_url || '/images/default-group.svg';
        document.getElementById('infoGroupTitle').textContent = activeConversation.title;
        document.getElementById('infoGroupDesc').textContent = activeConversation.description || 'No description provided';
        document.getElementById('infoMemberCount').textContent = activeConversation.participants ? activeConversation.participants.length : 0;

        renderGroupMembers();
        document.getElementById('groupInfoModal').style.display = 'flex';
    });

    function renderGroupMembers() {
        const memberList = document.getElementById('infoMemberList');
        memberList.innerHTML = '';

        if (!activeConversation.participants) return;

        activeConversation.participants.forEach(p => {
            const u = p.user;
            if (!u) return;

            const div = document.createElement('div');
            div.className = 'group-member-item';
            div.innerHTML = `
                <div class="member-left">
                    <img src="${u.profile_picture_url || '/images/default-avatar.svg'}" alt="${escapeHtml(u.name)}" class="mini-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                    <div>
                        <strong>${escapeHtml(u.name)}</strong>
                        <span class="member-username">@${escapeHtml(u.username)}</span>
                    </div>
                </div>
                <div>
                    <span class="role-badge ${p.role}">${p.role}</span>
                </div>
            `;
            memberList.appendChild(div);
        });
    }

    // Toggle Add Member to Group Box
    const btnAddMemberBtn = document.getElementById('btnAddMemberBtn');
    const addMemberFormContainer = document.getElementById('addMemberFormContainer');
    const addMemberSearchInput = document.getElementById('addMemberSearchInput');
    const addMemberResults = document.getElementById('addMemberResults');

    btnAddMemberBtn.addEventListener('click', () => {
        const isHidden = addMemberFormContainer.style.display === 'none';
        addMemberFormContainer.style.display = isHidden ? 'block' : 'none';
        if (isHidden) addMemberSearchInput.focus();
    });

    addMemberSearchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        try {
            const res = await fetch(`/api/v1/users/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (res.ok && data.success) {
                // Filter out users already in group
                const existingMemberIds = activeConversation.participants.map(p => p.user_id);
                const eligible = data.data.filter(u => !existingMemberIds.includes(u.id));

                addMemberResults.innerHTML = '';
                if (eligible.length === 0) {
                    addMemberResults.innerHTML = '<p class="empty-modal-text">No eligible users found</p>';
                    return;
                }

                eligible.forEach(u => {
                    const item = document.createElement('div');
                    item.className = 'modal-user-item mini';
                    item.innerHTML = `
                        <div class="avatar-wrapper">
                            <img src="${u.profile_picture_url || '/images/default-avatar.svg'}" alt="${escapeHtml(u.name)}" class="user-avatar" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                        </div>
                        <div class="user-text">
                            <h4>${escapeHtml(u.name)}</h4>
                        </div>
                        <button class="btn btn-small btn-primary">Add</button>
                    `;
                    item.querySelector('button').addEventListener('click', async () => {
                        try {
                            const addRes = await fetch(`/api/v1/conversations/${activeConversation.id}/members`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: u.id })
                            });
                            const addData = await addRes.json();
                            if (addRes.ok && addData.success) {
                                // Refresh conversation details
                                selectConversation(activeConversation.id);
                                addMemberFormContainer.style.display = 'none';
                                addMemberSearchInput.value = '';
                                addMemberResults.innerHTML = '';
                            } else {
                                alert((addData.error && addData.error[0]) || addData.message || 'Error adding member');
                            }
                        } catch (err) {
                            alert('Network error');
                        }
                    });
                    addMemberResults.appendChild(item);
                });
            }
        } catch (err) {
            addMemberResults.innerHTML = '<p class="empty-modal-text">Error</p>';
        }
    });

    // Leave Group Handler
    btnLeaveGroup.addEventListener('click', async () => {
        if (!activeConversation || activeConversation.type !== 'group') return;
        if (!confirm(`Are you sure you want to leave "${activeConversation.title}"?`)) return;

        try {
            const res = await fetch(`/api/v1/conversations/${activeConversation.id}/leave`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                activeConversation = null;
                activeChatWindow.style.display = 'none';
                emptyChatState.style.display = 'flex';
                await loadConversations();
            } else {
                alert((data.error && data.error[0]) || data.message || 'Failed to leave group');
            }
        } catch (err) {
            alert('Error leaving group');
        }
    });

    // ================= GLOBAL SEARCH (USERS & MESSAGES) =================
    let searchDebounce = null;
    globalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounce);

        if (!query) {
            searchResultsContainer.style.display = 'none';
            clearSearchBtn.style.display = 'none';
            return;
        }

        clearSearchBtn.style.display = 'block';
        searchResultsContainer.style.display = 'block';

        searchDebounce = setTimeout(() => {
            performGlobalSearch(query);
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        globalSearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchResultsContainer.style.display = 'none';
    });

    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetTab = tab.dataset.tab;
            searchUsersList.style.display = targetTab === 'users' ? 'block' : 'none';
            searchMessagesList.style.display = targetTab === 'messages' ? 'block' : 'none';
        });
    });

    async function performGlobalSearch(query) {
        searchUsersList.innerHTML = '<p class="search-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> Searching users...</p>';
        searchMessagesList.innerHTML = '<p class="search-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> Searching messages...</p>';

        // 1. Search Users
        try {
            const resUsers = await fetch(`/api/v1/users/search?query=${encodeURIComponent(query)}`);
            const usersData = await resUsers.json();
            if (resUsers.ok && usersData.success) {
                if (usersData.data.length === 0) {
                    searchUsersList.innerHTML = '<p class="search-placeholder">No matching users</p>';
                } else {
                    searchUsersList.innerHTML = '';
                    usersData.data.forEach(u => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.innerHTML = `
                            <img src="${u.profile_picture_url || '/images/default-avatar.svg'}" class="mini-avatar" alt="${escapeHtml(u.name)}" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">
                            <div class="result-text">
                                <strong>${escapeHtml(u.name)}</strong>
                                <span>@${escapeHtml(u.username)}</span>
                            </div>
                        `;
                        item.addEventListener('click', async () => {
                            clearSearchBtn.click();
                            const resDirect = await fetch('/api/v1/conversations/direct', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ partner_id: u.id })
                            });
                            const directData = await resDirect.json();
                            if (resDirect.ok && directData.success) {
                                await loadConversations();
                                selectConversation(directData.data.id);
                            }
                        });
                        searchUsersList.appendChild(item);
                    });
                }
            }
        } catch (e) {}

        // 2. Search Messages
        try {
            const resMsgs = await fetch(`/api/v1/messages/search?query=${encodeURIComponent(query)}`);
            const msgsData = await resMsgs.json();
            if (resMsgs.ok && msgsData.success) {
                if (msgsData.data.length === 0) {
                    searchMessagesList.innerHTML = '<p class="search-placeholder">No matching messages</p>';
                } else {
                    searchMessagesList.innerHTML = '';
                    msgsData.data.forEach(m => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item message-hit';
                        item.innerHTML = `
                            <div class="result-text">
                                <span class="search-msg-sender">${escapeHtml(m.sender ? m.sender.name : 'System')}</span>
                                <p class="search-msg-content">${escapeHtml(m.content)}</p>
                                <span class="search-msg-date">${formatTime(m.createdAt)}</span>
                            </div>
                        `;
                        item.addEventListener('click', () => {
                            clearSearchBtn.click();
                            selectConversation(m.conversation_id);
                        });
                        searchMessagesList.appendChild(item);
                    });
                }
            }
        } catch (e) {}
    }

    // ================= REAL-TIME SOCKET.IO LISTENERS =================

    // 1. Online / Offline status updates
    socket.on('user_status_changed', (data) => {
        const { userId, isOnline, lastSeenAt } = data;

        // Update dot in sidebar
        const dots = document.querySelectorAll(`[data-user-dot="${userId}"]`);
        dots.forEach(dot => {
            dot.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        });

        // Update active chat header if viewing this user
        if (activeConversation && activeConversation.type === 'direct') {
            const partner = activeConversation.participants.find(p => p.user_id === userId);
            if (partner) {
                partner.user.is_online = isOnline;
                partner.user.last_seen_at = lastSeenAt;
                chatHeaderOnlineDot.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
                chatHeaderSubtitle.textContent = isOnline ? 'Online' : formatLastSeen(lastSeenAt);
            }
        }
    });

    // 2. New Message received
    socket.on('new_message', (data) => {
        const { conversationId, message } = data;

        // If viewing this conversation right now
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            appendMessageToFeed(message, true);
            // Mark as read immediately
            socket.emit('mark_read', { conversationId, messageId: message.id });
        } else {
            // We are not on this conversation: show toast alert and increment unread badge!
            if (message.sender_id !== CURRENT_USER.id) {
                const senderName = message.sender ? message.sender.name : 'New message';
                const preview = message.message_type === 'image' ? 'Sent a photo' : (message.message_type === 'audio' ? 'Sent a voice message' : message.content);
                showToast(senderName, preview, () => {
                    selectConversation(conversationId);
                });
            }
        }

        // Re-load / update conversation card in sidebar
        loadConversations();
    });

    // 3. Message Edited
    socket.on('message_edited', (data) => {
        const { conversationId, message } = data;
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            const row = document.getElementById(`msg-${message.id}`);
            if (row) {
                const textEl = row.querySelector('.message-text');
                if (textEl) textEl.textContent = message.content;

                let metaEl = row.querySelector('.message-meta');
                if (metaEl && !metaEl.querySelector('.edited-label')) {
                    const span = document.createElement('span');
                    span.className = 'edited-label';
                    span.textContent = '(edited)';
                    metaEl.prepend(span);
                }
            }
        }
    });

    // 4. Message Deleted
    socket.on('message_deleted', (data) => {
        const { conversationId, message } = data;
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            const row = document.getElementById(`msg-${message.id}`);
            if (row) {
                const bubble = row.querySelector('.message-bubble');
                if (bubble) {
                    bubble.className = 'message-bubble deleted-text';
                    bubble.innerHTML = `
                        <p class="message-text">This message was deleted</p>
                        <div class="message-meta">
                            <span class="message-time">${formatTime(message.deleted_at || message.updatedAt)}</span>
                        </div>
                    `;
                }
                const actionsBar = row.querySelector('.message-actions-bar');
                if (actionsBar) actionsBar.remove();
            }
        }
    });

    // 5. Reaction Updated
    socket.on('reaction_updated', (data) => {
        const { conversationId, message } = data;
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            const row = document.getElementById(`msg-${message.id}`);
            if (row) {
                const reactionsBar = row.querySelector('.message-reactions-bar');
                if (reactionsBar) {
                    const reactionsMap = {};
                    if (message.reactions) {
                        message.reactions.forEach(r => {
                            reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
                        });
                    }
                    let html = '';
                    Object.entries(reactionsMap).forEach(([emoji, count]) => {
                        html += `<span class="reaction-pill" onclick="handleReactionClick(${message.id}, '${emoji}')">${emoji} ${count}</span>`;
                    });
                    reactionsBar.innerHTML = html;
                }
            }
        }
    });

    // 6. Typing Indicator
    socket.on('user_typing', (data) => {
        const { conversationId, userName } = data;
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            typingText.textContent = `${userName} is typing...`;
            typingIndicator.style.display = 'flex';
        }
    });

    socket.on('user_stop_typing', (data) => {
        const { conversationId } = data;
        if (activeConversation && activeConversation.id === Number(conversationId)) {
            typingIndicator.style.display = 'none';
        }
    });

    // 7. Group Member Event
    socket.on('group_member_event', (data) => {
        if (activeConversation && activeConversation.id === Number(data.conversationId)) {
            selectConversation(data.conversationId);
        }
    });

    // Initialize application
    loadConversations();
});

