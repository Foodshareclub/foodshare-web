# Implementation Plan

- [ ] 1. Set up database schema
  - Create notifications table with indexes
  - Create notification_preferences table
  - Add triggers for real-time events
  - _Requirements: All_

- [ ] 2. Implement notification service
- [ ] 2.1 Create notificationAPI.ts
  - createNotification()
  - getNotifications()
  - markAsRead()
  - _Requirements: 1.1, 2.1, 3.1_

- [ ]\* 2.2 Write property test for delivery timing
  - **Property 1: Delivery timing**
  - **Validates: Requirements 1.1, 2.1, 3.1**

- [ ] 3. Build Supabase Realtime integration
- [ ] 3.1 Set up WebSocket subscription
  - Subscribe to notifications channel
  - Handle real-time events
  - Reconnection logic
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 3.2 Implement notification batching
  - Group notifications by type
  - Batch within 5-second window
  - _Requirements: 1.2, 7.5_

- [ ] 4. Create notification components
- [ ] 4.1 Build NotificationBell component
  - Badge with unread count
  - Dropdown with recent notifications
  - Mark all as read button
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.2 Build NotificationCenter component
  - List all notifications (30 days)
  - Filter by type
  - Delete notifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. Implement push notifications
- [ ] 5.1 Set up service worker
  - Register service worker
  - Handle push events
  - Show browser notifications
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]\* 5.2 Write property test for push registration
  - **Property 4: Push notification registration**
  - **Validates: Requirements 6.2, 6.3**

- [ ] 6. Build notification preferences
- [ ] 6.1 Create PreferencesPanel component
  - Toggle switches for each type
  - Do Not Disturb time picker
  - Save preferences
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]\* 6.2 Write property test for preference respect
  - **Property 2: Preference respect**
  - **Validates: Requirements 4.2**

- [ ] 7. Implement email notifications
- [ ] 7.1 Create email batching Edge Function
  - Check for offline users
  - Batch unread notifications
  - Send email summary
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]\* 7.2 Write property test for email batching
  - **Property 5: Email batching**
  - **Validates: Requirements 10.1, 10.5**

- [ ] 8. Add notification types
- [ ] 8.1 Implement new listing notifications
  - Match user preferences
  - Include listing details
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 8.2 Implement booking notifications
  - Request, confirmation, cancellation
  - Reminder notifications
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8.3 Implement message notifications
  - New message alerts
  - Group by conversation
  - Suppress when viewing
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8.4 Implement expiry notifications
  - 24h and 3d reminders
  - Batch multiple listings
  - Quick actions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Add accessibility features
- [ ] 9.1 Implement ARIA live regions
  - Announce new notifications
  - Keyboard navigation
  - Screen reader support
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 9.2 Test with screen readers
  - NVDA/JAWS testing
  - VoiceOver testing
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Performance optimization
- [ ] 11.1 Implement notification caching
  - Cache recent notifications
  - Invalidate on new notification
  - _Requirements: Performance_

- [ ] 11.2 Add request deduplication
  - Prevent duplicate notifications
  - Handle race conditions
  - _Requirements: Performance_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
