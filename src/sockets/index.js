const { verifyToken } = require('../utils');
const { UserRepository, ConversationRepository } = require('../repositories');
const { MessageService, ConversationService } = require('../services');

const userRepository = new UserRepository();
const conversationRepository = new ConversationRepository();
const messageService = new MessageService();
const conversationService = new ConversationService();

// Map tracking connected user sockets: userId -> Set of socket IDs
const onlineUsers = new Map();

const setupSockets = (io) => {
    // Socket authentication middleware
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth && socket.handshake.auth.token;

            if (!token && socket.handshake.headers.cookie) {
                const cookies = socket.handshake.headers.cookie.split(';');
                for (let c of cookies) {
                    const [k, v] = c.trim().split('=');
                    if (k === 'token') {
                        token = decodeURIComponent(v);
                        break;
                    }
                }
            }

            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = verifyToken(token);
            const user = await userRepository.get(decoded.id);
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user.toJSON();
            next();
        } catch (error) {
            return next(new Error('Authentication error: ' + error.message));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.id;

        // Register user connection
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
            // Mark online in DB
            try {
                await userRepository.updateOnlineStatus(userId, true);
                // Broadcast online status to all
                io.emit('user_status_changed', {
                    userId,
                    isOnline: true,
                    lastSeenAt: null
                });
            } catch (err) {
                console.error('Failed to update online status:', err.message);
            }
        }
        onlineUsers.get(userId).add(socket.id);

        // Join user's personal notification room
        socket.join(`user_${userId}`);

        // Automatically join all active conversations the user is part of
        try {
            const userConversations = await conversationRepository.getUserConversations(userId);
            userConversations.forEach(c => {
                socket.join(`conversation_${c.id}`);
            });
        } catch (err) {
            console.error('Failed to pre-join conversation rooms:', err.message);
        }

        // Join a specific conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation_${conversationId}`);
        });

        // Leave a conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
        });

        // Real-time message sending
        socket.on('send_message', async (data, callback) => {
            try {
                const { conversationId, content, message_type } = data;
                const message = await messageService.sendMessage(conversationId, userId, {
                    content,
                    message_type: message_type || 'text'
                });

                // Broadcast message to everyone in the conversation
                io.to(`conversation_${conversationId}`).emit('new_message', {
                    conversationId,
                    message
                });

                // Notify all members about conversation update (for reordering & unread count badge in sidebar)
                const conversation = await conversationRepository.getConversationWithDetails(conversationId);
                if (conversation && conversation.participants) {
                    conversation.participants.forEach(p => {
                        io.to(`user_${p.user_id}`).emit('conversation_updated', {
                            conversationId,
                            lastMessage: message
                        });
                    });
                }

                if (typeof callback === 'function') callback({ success: true, message });
            } catch (error) {
                if (typeof callback === 'function') callback({ success: false, error: error.message });
            }
        });

        // Real-time message edit
        socket.on('edit_message', async (data, callback) => {
            try {
                const { messageId, content, conversationId } = data;
                const updatedMessage = await messageService.editMessage(messageId, userId, content);

                io.to(`conversation_${conversationId}`).emit('message_edited', {
                    conversationId,
                    message: updatedMessage
                });

                if (typeof callback === 'function') callback({ success: true, message: updatedMessage });
            } catch (error) {
                if (typeof callback === 'function') callback({ success: false, error: error.message });
            }
        });

        // Real-time message delete
        socket.on('delete_message', async (data, callback) => {
            try {
                const { messageId, conversationId } = data;
                const deletedMessage = await messageService.deleteMessage(messageId, userId);

                io.to(`conversation_${conversationId}`).emit('message_deleted', {
                    conversationId,
                    message: deletedMessage
                });

                if (typeof callback === 'function') callback({ success: true, message: deletedMessage });
            } catch (error) {
                if (typeof callback === 'function') callback({ success: false, error: error.message });
            }
        });

        // Real-time message reaction
        socket.on('react_message', async (data, callback) => {
            try {
                const { messageId, conversationId, emoji } = data;
                const result = await messageService.reactToMessage(messageId, userId, emoji);

                io.to(`conversation_${conversationId}`).emit('reaction_updated', {
                    conversationId,
                    messageId,
                    message: result.message
                });

                if (typeof callback === 'function') callback({ success: true, data: result });
            } catch (error) {
                if (typeof callback === 'function') callback({ success: false, error: error.message });
            }
        });

        // Typing indicator
        socket.on('typing', ({ conversationId }) => {
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
                userName: socket.user.name
            });
        });

        socket.on('stop_typing', ({ conversationId }) => {
            socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
                conversationId,
                userId
            });
        });

        // Mark as read
        socket.on('mark_read', async ({ conversationId, messageId }) => {
            try {
                await conversationService.markAsRead(conversationId, userId, messageId);
                socket.to(`conversation_${conversationId}`).emit('messages_read', {
                    conversationId,
                    userId,
                    messageId
                });
            } catch (error) {
                console.error('Error marking as read:', error.message);
            }
        });

        // User joined or created group notification
        socket.on('group_member_changed', ({ conversationId, action, targetUser }) => {
            io.to(`conversation_${conversationId}`).emit('group_member_event', {
                conversationId,
                action,
                user: targetUser
            });
        });

        // Disconnection
        socket.on('disconnect', async () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    const lastSeenAt = new Date();
                    try {
                        await userRepository.updateOnlineStatus(userId, false);
                        io.emit('user_status_changed', {
                            userId,
                            isOnline: false,
                            lastSeenAt
                        });
                    } catch (err) {
                        console.error('Failed to update offline status:', err.message);
                    }
                }
            }
        });
    });

    return { io, onlineUsers };
};

module.exports = setupSockets;

