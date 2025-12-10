/**
 * useChatStore Unit Tests
 * Tests for Zustand chat store
 */

import { act } from '@testing-library/react';
import { useChatStore } from './useChatStore';
import type { RoomType, CustomRoomType, RoomParticipantsType } from '@/api/chatAPI';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Mock data
const mockRoom: RoomType = {
  id: 'room-123',
  requester: 'user-1',
  sharer: 'user-2',
  post_id: 1,
  last_message: 'Hello!',
  last_message_sent_by: 'user-1',
  last_message_seen_by: 'user-2',
  profiles: {
    id: 'user-2',
    first_name: 'John',
    second_name: 'Doe',
    avatar_url: '',
    about_me: '',
    birth_date: '',
    created_time: '',
    phone: '',
    updated_at: '2024-01-01T00:00:00Z',
    role: null,
  },
  post_arranged_to: '',
};

const mockCustomRoom: CustomRoomType = {
  id: 'room-123',
  last_message: 'Hello!',
  last_message_seen_by: 'user-2',
  last_message_sent_by: 'user-1',
  last_message_time: '2024-01-01T12:00:00Z',
  post_id: 1,
  posts: {
    id: 1,
    post_name: 'Test Product',
    post_description: 'Test description',
    post_type: 'food',
    post_address: '123 Test St',
    post_stripped_address: 'Test St',
    images: [],
    available_hours: '9am-5pm',
    transportation: 'pickup',
    is_active: true,
    is_arranged: false,
    post_views: 0,
    post_like_counter: 0,
    profile_id: 'user-2',
    created_at: '2024-01-01T00:00:00Z',
    five_star: null,
    four_star: null,
    location: null as unknown as string,
    reviews: [],
    condition: 'good',
  },
  profiles: {
    id: 'user-2',
    first_name: 'John',
    second_name: 'Doe',
    avatar_url: '',
    about_me: '',
    birth_date: '',
    created_time: '',
    phone: '',
    updated_at: '2024-01-01T00:00:00Z',
    role: null,
  },
  requester: 'user-1',
  room_participants: [],
  sharer: 'user-2',
};

const mockMessage: RoomParticipantsType = {
  id: 'msg-1',
  profile_id: 'user-1',
  room_id: 'room-123',
  text: 'Hello, world!',
  timestamp: '2024-01-01T12:00:00Z',
};

const mockMessage2: RoomParticipantsType = {
  id: 'msg-2',
  profile_id: 'user-2',
  room_id: 'room-123',
  text: 'Hi there!',
  timestamp: '2024-01-01T12:01:00Z',
};

const mockChannel = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
} as unknown as RealtimeChannel;

describe('useChatStore', () => {
  // Reset store before each test
  beforeEach(() => {
    act(() => {
      useChatStore.getState().reset();
    });
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useChatStore.getState();

      expect(state.channel).toBeNull();
      expect(state.currentRoom).toBeNull();
      expect(state.rooms).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.newMessage).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.creationStatus).toBe('idle');
      expect(state.updateStatus).toBe('idle');
      expect(state.feedbackStatus).toBe('not_written');
      expect(state.createdRoom).toBeNull();
    });
  });

  // ==========================================================================
  // Channel Management
  // ==========================================================================

  describe('setChannel', () => {
    it('should set channel', () => {
      act(() => {
        useChatStore.getState().setChannel(mockChannel);
      });

      expect(useChatStore.getState().channel).toBe(mockChannel);
    });

    it('should clear channel when set to null', () => {
      act(() => {
        useChatStore.getState().setChannel(mockChannel);
        useChatStore.getState().setChannel(null);
      });

      expect(useChatStore.getState().channel).toBeNull();
    });
  });

  // ==========================================================================
  // Current Room
  // ==========================================================================

  describe('setCurrentRoom', () => {
    it('should set current room', () => {
      act(() => {
        useChatStore.getState().setCurrentRoom(mockRoom);
      });

      expect(useChatStore.getState().currentRoom).toEqual(mockRoom);
    });

    it('should clear current room when set to null', () => {
      act(() => {
        useChatStore.getState().setCurrentRoom(mockRoom);
        useChatStore.getState().setCurrentRoom(null);
      });

      expect(useChatStore.getState().currentRoom).toBeNull();
    });
  });

  // ==========================================================================
  // Rooms List
  // ==========================================================================

  describe('rooms management', () => {
    it('should set rooms array', () => {
      const rooms = [mockCustomRoom, { ...mockCustomRoom, id: 'room-456' }];

      act(() => {
        useChatStore.getState().setRooms(rooms);
      });

      expect(useChatStore.getState().rooms).toEqual(rooms);
      expect(useChatStore.getState().rooms.length).toBe(2);
    });

    it('should add room to beginning of list', () => {
      const existingRoom = { ...mockCustomRoom, id: 'room-existing' };
      const newRoom = { ...mockCustomRoom, id: 'room-new' };

      act(() => {
        useChatStore.getState().setRooms([existingRoom]);
        useChatStore.getState().addRoom(newRoom);
      });

      const rooms = useChatStore.getState().rooms;
      expect(rooms.length).toBe(2);
      expect(rooms[0].id).toBe('room-new');
      expect(rooms[1].id).toBe('room-existing');
    });

    it('should update room in list', () => {
      const rooms = [mockCustomRoom, { ...mockCustomRoom, id: 'room-456' }];

      act(() => {
        useChatStore.getState().setRooms(rooms);
        useChatStore.getState().updateRoomInList('room-123', {
          last_message: 'Updated message',
        });
      });

      const updatedRooms = useChatStore.getState().rooms;
      expect(updatedRooms[0].last_message).toBe('Updated message');
      expect(updatedRooms[1].last_message).toBe('Hello!'); // Unchanged
    });

    it('should not modify rooms when updating non-existent room', () => {
      act(() => {
        useChatStore.getState().setRooms([mockCustomRoom]);
        useChatStore.getState().updateRoomInList('non-existent', {
          last_message: 'Updated',
        });
      });

      expect(useChatStore.getState().rooms[0].last_message).toBe('Hello!');
    });
  });

  // ==========================================================================
  // Messages
  // ==========================================================================

  describe('messages management', () => {
    it('should set messages array', () => {
      const messages = [mockMessage, mockMessage2];

      act(() => {
        useChatStore.getState().setMessages(messages);
      });

      expect(useChatStore.getState().messages).toEqual(messages);
    });

    it('should add message to beginning and set newMessage', () => {
      act(() => {
        useChatStore.getState().setMessages([mockMessage2]);
        useChatStore.getState().addMessage(mockMessage);
      });

      const state = useChatStore.getState();
      expect(state.messages.length).toBe(2);
      expect(state.messages[0]).toEqual(mockMessage);
      expect(state.newMessage).toEqual(mockMessage);
    });

    it('should prepend messages to end of array', () => {
      const existingMessages = [mockMessage];
      const olderMessages = [mockMessage2];

      act(() => {
        useChatStore.getState().setMessages(existingMessages);
        useChatStore.getState().prependMessages(olderMessages);
      });

      const messages = useChatStore.getState().messages;
      expect(messages.length).toBe(2);
      expect(messages[0]).toEqual(mockMessage);
      expect(messages[1]).toEqual(mockMessage2);
    });
  });

  // ==========================================================================
  // New Message
  // ==========================================================================

  describe('setNewMessage', () => {
    it('should set new message', () => {
      act(() => {
        useChatStore.getState().setNewMessage(mockMessage);
      });

      expect(useChatStore.getState().newMessage).toEqual(mockMessage);
    });

    it('should clear new message', () => {
      act(() => {
        useChatStore.getState().setNewMessage(mockMessage);
        useChatStore.getState().setNewMessage(null);
      });

      expect(useChatStore.getState().newMessage).toBeNull();
    });
  });

  // ==========================================================================
  // Loading State
  // ==========================================================================

  describe('setIsLoading', () => {
    it('should set loading state', () => {
      act(() => {
        useChatStore.getState().setIsLoading(true);
      });

      expect(useChatStore.getState().isLoading).toBe(true);
    });

    it('should clear loading state', () => {
      act(() => {
        useChatStore.getState().setIsLoading(true);
        useChatStore.getState().setIsLoading(false);
      });

      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // Status Fields
  // ==========================================================================

  describe('setCreationStatus', () => {
    it.each(['idle', 'creating', 'created', 'error'] as const)(
      'should set creation status to %s',
      (status) => {
        act(() => {
          useChatStore.getState().setCreationStatus(status);
        });

        expect(useChatStore.getState().creationStatus).toBe(status);
      }
    );
  });

  describe('setUpdateStatus', () => {
    it.each(['idle', 'updating', 'updated', 'error'] as const)(
      'should set update status to %s',
      (status) => {
        act(() => {
          useChatStore.getState().setUpdateStatus(status);
        });

        expect(useChatStore.getState().updateStatus).toBe(status);
      }
    );
  });

  describe('setFeedbackStatus', () => {
    it.each(['not_written', 'written'] as const)(
      'should set feedback status to %s',
      (status) => {
        act(() => {
          useChatStore.getState().setFeedbackStatus(status);
        });

        expect(useChatStore.getState().feedbackStatus).toBe(status);
      }
    );
  });

  // ==========================================================================
  // Created Room
  // ==========================================================================

  describe('setCreatedRoom', () => {
    it('should set created room', () => {
      act(() => {
        useChatStore.getState().setCreatedRoom(mockRoom);
      });

      expect(useChatStore.getState().createdRoom).toEqual(mockRoom);
    });

    it('should clear created room', () => {
      act(() => {
        useChatStore.getState().setCreatedRoom(mockRoom);
        useChatStore.getState().setCreatedRoom(null);
      });

      expect(useChatStore.getState().createdRoom).toBeNull();
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      act(() => {
        useChatStore.getState().setChannel(mockChannel);
        useChatStore.getState().setCurrentRoom(mockRoom);
        useChatStore.getState().setRooms([mockCustomRoom]);
        useChatStore.getState().setMessages([mockMessage]);
        useChatStore.getState().setNewMessage(mockMessage);
        useChatStore.getState().setIsLoading(true);
        useChatStore.getState().setCreationStatus('created');
        useChatStore.getState().setUpdateStatus('updated');
        useChatStore.getState().setFeedbackStatus('written');
        useChatStore.getState().setCreatedRoom(mockRoom);
      });

      // Reset
      act(() => {
        useChatStore.getState().reset();
      });

      const state = useChatStore.getState();
      expect(state.channel).toBeNull();
      expect(state.currentRoom).toBeNull();
      expect(state.rooms).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.newMessage).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.creationStatus).toBe('idle');
      expect(state.updateStatus).toBe('idle');
      expect(state.feedbackStatus).toBe('not_written');
      expect(state.createdRoom).toBeNull();
    });
  });

  describe('resetCurrentRoom', () => {
    it('should only reset current room related state', () => {
      // Set various state values
      act(() => {
        useChatStore.getState().setChannel(mockChannel);
        useChatStore.getState().setCurrentRoom(mockRoom);
        useChatStore.getState().setRooms([mockCustomRoom]);
        useChatStore.getState().setMessages([mockMessage]);
        useChatStore.getState().setNewMessage(mockMessage);
        useChatStore.getState().setIsLoading(true);
        useChatStore.getState().setCreationStatus('created');
      });

      // Reset current room only
      act(() => {
        useChatStore.getState().resetCurrentRoom();
      });

      const state = useChatStore.getState();
      // Should be reset
      expect(state.currentRoom).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.newMessage).toBeNull();

      // Should remain unchanged
      expect(state.channel).toBe(mockChannel);
      expect(state.rooms).toEqual([mockCustomRoom]);
      expect(state.isLoading).toBe(true);
      expect(state.creationStatus).toBe('created');
    });
  });

  // ==========================================================================
  // Selectors (testing they exist and return correct values)
  // ==========================================================================

  describe('selectors', () => {
    beforeEach(() => {
      act(() => {
        useChatStore.getState().setCurrentRoom(mockRoom);
        useChatStore.getState().setRooms([mockCustomRoom]);
        useChatStore.getState().setMessages([mockMessage]);
        useChatStore.getState().setIsLoading(true);
        useChatStore.getState().setNewMessage(mockMessage);
      });
    });

    it('should provide current room via state', () => {
      expect(useChatStore.getState().currentRoom).toEqual(mockRoom);
    });

    it('should provide messages via state', () => {
      expect(useChatStore.getState().messages).toEqual([mockMessage]);
    });

    it('should provide rooms via state', () => {
      expect(useChatStore.getState().rooms).toEqual([mockCustomRoom]);
    });

    it('should provide loading state via state', () => {
      expect(useChatStore.getState().isLoading).toBe(true);
    });

    it('should provide new message via state', () => {
      expect(useChatStore.getState().newMessage).toEqual(mockMessage);
    });
  });
});
