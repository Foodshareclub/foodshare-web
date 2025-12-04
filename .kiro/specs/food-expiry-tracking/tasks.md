# Implementation Plan

- [ ] 1. Database schema updates
  - Add expiry_date, best_before_date columns to posts table
  - Add urgency_level computed column
  - Add expiry_extended_count, last_expiry_reminder_sent, archived_at columns
  - Create indexes for expiry queries
  - _Requirements: 1.1, 5.1_

- [ ] 2. Implement urgency calculation
- [ ] 2.1 Create calculateUrgencyLevel utility
  - Implement urgency thresholds (<24h, 1-3d, 4-7d, >7d)
  - Return UrgencyLevel enum
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 2.2 Write property test for urgency calculation
  - **Property 2: Urgency level calculation consistency**
  - **Validates: Requirements 2.1-2.5**

- [ ] 3. Build ExpiryInput component
- [ ] 3.1 Create date picker with validation
  - Validate future dates only
  - Show expiry suggestions based on food type
  - Display error for past dates
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]\* 3.2 Write property test for date validation
  - **Property 1: Expiry date validation**
  - **Validates: Requirements 1.2**

- [ ] 4. Build UrgencyBadge component
- [ ] 4.1 Create badge with color coding
  - Red for critical (<24h)
  - Orange for high (1-3d)
  - Yellow for medium (4-7d)
  - Green for low (>7d)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Implement expiry display logic
- [ ] 5.1 Create formatExpiryTime utility
  - "Expires in X hours" for <24h
  - "Expires tomorrow" for next day
  - "Expires in X days" for 2-7 days
  - "Expires on [date]" for >7 days
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]\* 5.2 Write property test for expiry display
  - **Property 6: Days until expiry display accuracy**
  - **Validates: Requirements 6.1-6.4**

- [ ] 6. Create expiry monitor Edge Function
- [ ] 6.1 Implement expiry-monitor function
  - Query listings expiring in 24h
  - Query listings expiring in 3 days
  - Send reminder notifications
  - Update last_expiry_reminder_sent
  - _Requirements: 3.1, 3.2_

- [ ]\* 6.2 Write property test for reminder timing
  - **Property 3: Reminder timing accuracy**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 6.3 Implement auto-archiving logic
  - Query expired listings
  - Mark as archived
  - Send archival notification
  - _Requirements: 5.1, 5.2_

- [ ]\* 6.4 Write property test for auto-archive
  - **Property 4: Auto-archive timing**
  - **Validates: Requirements 5.1**

- [ ] 6.5 Set up cron schedule
  - Schedule function to run hourly
  - Configure Supabase cron job
  - _Requirements: 3.1, 5.1_

- [ ] 7. Implement expiry filtering
- [ ] 7.1 Add expiry filters to search
  - "Expiring Soon" (<48h)
  - "Expires Today"
  - Custom date range
  - Sort by expiry (soonest first)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]\* 7.2 Write property test for expiry filtering
  - **Property 5: Expiry filter correctness**
  - **Validates: Requirements 4.1-4.3**

- [ ] 8. Build expiry extension feature
- [ ] 8.1 Create extendExpiry API endpoint
  - Validate new date is future
  - Increment expiry_extended_count
  - Log extension with timestamp
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]\* 8.2 Write property tests for extension
  - **Property 7: Expiry extension validation**
  - **Property 8: Extension count tracking**
  - **Validates: Requirements 7.2, 7.4**

- [ ] 8.3 Add extension UI to reminder
  - Quick action buttons in notification
  - Date picker for new expiry
  - Show extension count if >3
  - _Requirements: 3.3, 7.5_

- [ ] 9. Implement notification batching
- [ ] 9.1 Batch multiple expiring listings
  - Group by user
  - Create single notification with list
  - _Requirements: 3.5_

- [ ]\* 9.2 Write property test for batching
  - **Property 10: Notification batching**
  - **Validates: Requirements 3.5**

- [ ] 10. Build expiry statistics dashboard
- [ ] 10.1 Create getExpiryStats API
  - Calculate total/active/expired counts
  - Calculate average days to pickup
  - Calculate expiry management score
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 10.2 Create ExpiryStats component
  - Display statistics with charts
  - Show trends over time
  - Highlight expiring listings
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 11. Implement archived listing management
- [ ] 11.1 Create archived listings view
  - Show in sharer's history
  - Exclude from public search
  - Allow reactivation with new expiry
  - _Requirements: 5.3, 5.4_

- [ ]\* 11.2 Write property test for archive exclusion
  - **Property 9: Archived listing exclusion**
  - **Validates: Requirements 5.3**

- [ ] 11.3 Preserve archived data
  - Keep for historical tracking
  - Include in statistics
  - _Requirements: 5.5_

- [ ] 12. Add expiry notifications for seekers
- [ ] 12.1 Notify seekers of expiring matches
  - Check saved filters
  - Send notification for critical items
  - Include expiry time and distance
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 12.2 Respect notification preferences
  - Honor "Urgent Food Alerts" setting
  - Allow disabling expiry notifications
  - _Requirements: 8.5_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Integration and polish
- [ ] 14.1 Integrate with listing creation
  - Add expiry input to create form
  - Show suggestions based on food type
  - _Requirements: 1.1, 1.3_

- [ ] 14.2 Add urgency indicators throughout UI
  - Show on listing cards
  - Show in search results
  - Show in detail view
  - _Requirements: 2.1-2.5_

- [ ] 14.3 Style urgency badges
  - Use accessible colors
  - Add icons for clarity
  - Ensure responsive design
  - _Requirements: 2.1-2.5_

- [ ]\* 14.4 Test complete expiry flow
  - Create listing with expiry
  - Receive reminders
  - Extend expiry
  - Auto-archive
  - _Requirements: All_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
