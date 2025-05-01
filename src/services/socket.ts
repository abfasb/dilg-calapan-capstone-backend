// server/src/services/socket.ts
import { Server } from 'socket.io';
import Conversation from '../models/conversation';

export const initSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_conversation', async (conversationId: string) => {
      socket.join(conversationId);
      await Conversation.findByIdAndUpdate(conversationId, { status: 'open' });
    });

    socket.on('send_message', async (data) => {
      const conversation = await Conversation.findById(data.conversationId);
      if (conversation) {
        conversation.messages.push({
          sender: data.sender,
          content: data.content,
          timestamp: new Date(),
          read: false
        });
        await conversation.save();
        io.to(data.conversationId).emit('new_message', conversation.messages.slice(-1)[0]);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};