# Implementation Plan

- [ ] 1. Set up database schema and indexes
  - Create dietary_categories and allergens columns in posts table
  - Add full-text search GIN index on post_name and description
  - Add spatial index for location-based queries
  - Create composite indexes for common filter combinations
  - _Requirements: 1.1, 2.1, 3.1, 9.1_

- [ ] 2. Implement core search API
- [ ] 2.1 Create searchAPI.ts with base search function
  - Implement searchListings() with Supabase query builder
  - Add text search using textSearch() method
  - Implement pagination support
  - _Requirements: 1.1, 1.2_

- [ ]\* 2.2 Write property test for text search filtering
  - **Property 1: Search text filtering consistency**
  - **Validates: Requirements 1.1**

- [ ] 2.3 Add distance-based filtering
  - Implement calculateDistance() utility function
  - Add distance filter to search query
  - Sort results by distance when applicable
  - _Requirements: 2.1, 2.4_

- [ ]\* 2.4 Write property test for distance filtering
  - **Property 2: Distance filter boundary correctness**
  - **Validates: Requirements 2.1**

- [ ] 3. Implement dietary and food type filters
- [ ] 3.1 Add dietary restriction filtering
  - Implement AND logic for multiple dietary filters
  - Add dietary_categories to database query
  - _Requirements: 3.1, 3.2_

- [ ]\* 3.2 Write property test for dietary filters
  - **Property 3: Dietary filter intersection**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 3.3 Add food type filtering
  - Implement OR logic for multiple food types
  - Add post_type filter to query
  - _Requirements: 4.1, 4.2_

- [ ]\* 3.4 Write property test for food type filters
  - **Property 4: Food type filter union**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 4. Implement sorting functionality
- [ ] 4.1 Create sort utility functions
  - Implement sortByDistance()
  - Implement sortByDate()
  - Implement sortByExpiry()
  - Implement sortByQuantity()
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]\* 4.2 Write property test for sort consistency
  - **Property 5: Sort order consistency**
  - **Validates: Requirements 8.1-8.4**

- [ ] 5. Implement filter counts
- [ ] 5.1 Create getFilterCounts() API function
  - Calculate counts for each dietary option
  - Calculate counts for each food type
  - Update counts when filters change
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]\* 5.2 Write property test for filter count accuracy
  - **Property 6: Filter count accuracy**
  - **Validates: Requirements 7.1, 7.2**

- [ ] 6. Implement Redux state management
- [ ] 6.1 Create searchSlice with initial state
  - Define SearchState interface
  - Create initial state with default values
  - _Requirements: All_

- [ ] 6.2 Implement search thunk actions
  - Create searchListingsTC async thunk
  - Create getFilterCountsTC async thunk
  - Handle loading, success, and error states
  - _Requirements: 1.1, 1.5_

- [ ] 6.3 Create search selectors
  - selectSearchResults
  - selectSearchFilters
  - selectFilterCounts
  - selectSearchStatus
  - _Requirements: All_

- [ ] 7. Build SearchBar component
- [ ] 7.1 Create SearchBar with debounced input
  - Implement useDebounce hook (300ms)
  - Add search icon and clear button
  - Handle Enter key submission
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]\* 7.2 Write unit tests for SearchBar
  - Test debouncing behavior
  - Test clear functionality
  - Test keyboard interactions
  - _Requirements: 1.1, 1.2, 1.5_

- [ ] 8. Build FilterPanel component
- [ ] 8.1 Create distance filter slider
  - Implement range slider with km display
  - Request user location permission
  - Show distance on each listing card
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 8.2 Create dietary restriction checkboxes
  - Multi-select checkboxes for dietary categories
  - Display dietary badges on listings
  - Show "No results" message when needed
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8.3 Create food type filter buttons
  - Category buttons with icons
  - Display item count per category
  - Support multiple selection
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8.4 Create availability time filter
  - "Available Now" quick filter
  - Custom time range picker
  - Display pickup windows on listings
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8.5 Create allergen filter input
  - Text input for allergen keywords
  - Common allergen quick-select buttons
  - Display allergen warnings on listings
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8.6 Create quantity filter
  - Minimum quantity input
  - Unit selector (kg, servings, items)
  - Display quantity on listing cards
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]\* 8.7 Write unit tests for FilterPanel
  - Test each filter type independently
  - Test filter combinations
  - Test filter count display
  - _Requirements: All filter requirements_

- [ ] 9. Implement filter persistence
- [ ] 9.1 Create filter storage utilities
  - saveFiltersToLocalStorage()
  - loadFiltersFromLocalStorage()
  - clearSavedFilters()
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]\* 9.2 Write property test for filter persistence
  - **Property 9: Filter persistence round-trip**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 9.3 Sync filters to user profile (if logged in)
  - Save to Supabase user preferences
  - Load on login across devices
  - _Requirements: 6.5_

- [ ] 10. Build ResultsGrid component
- [ ] 10.1 Create results grid with sorting
  - Display listings in responsive grid
  - Add sort dropdown (distance, date, expiry, quantity)
  - Show loading skeletons
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 10.2 Implement empty state handling
  - Display helpful message when no results
  - Suggest relaxing filters
  - Show alternative suggestions
  - _Requirements: 1.4, 2.4, 3.4, 5.5_

- [ ]\* 10.3 Write property test for empty result handling
  - **Property 10: Empty result handling**
  - **Validates: Requirements 1.4, 2.4, 3.4**

- [ ] 10.4 Add virtual scrolling for performance
  - Implement react-window for large result sets
  - Lazy load images
  - _Requirements: Performance_

- [ ] 11. Implement search highlighting
- [ ] 11.1 Create text highlighting utility
  - Highlight matching text in titles
  - Highlight matching text in descriptions
  - Use accessible color contrast
  - _Requirements: 1.3_

- [ ]\* 11.2 Write unit tests for text highlighting
  - Test case-insensitive matching
  - Test multiple matches
  - Test special characters
  - _Requirements: 1.3_

- [ ] 12. Add filter count badges
- [ ] 12.1 Display counts on filter options
  - Show count next to each filter option
  - Update counts in real-time
  - Disable options with zero count
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12.2 Display total result count
  - Show "X results found" prominently
  - Update count as filters change
  - _Requirements: 7.5_

- [ ] 13. Implement allergen exclusion
- [ ] 13.1 Add allergen filtering logic
  - Exclude listings with specified allergens
  - Check both allergen list and description
  - Display warning badge on filter panel
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]\* 13.2 Write property test for allergen exclusion
  - **Property 7: Allergen exclusion completeness**
  - **Validates: Requirements 9.1, 9.2**

- [ ] 13.3 Handle missing allergen information
  - Mark listings without allergen data
  - Display "Allergen info not provided" badge
  - _Requirements: 9.5_

- [ ] 14. Implement availability filtering
- [ ] 14.1 Add time window filtering
  - Filter by availability overlap
  - Display pickup time windows
  - Suggest nearby time slots when empty
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 14.2 Write property test for availability filtering
  - **Property 8: Availability window filtering**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 15. Add performance optimizations
- [ ] 15.1 Implement request debouncing
  - Debounce search input (300ms)
  - Cancel in-flight requests
  - _Requirements: 1.5_

- [ ] 15.2 Add result caching
  - Cache search results for 5 minutes
  - Implement cache invalidation
  - _Requirements: Performance_

- [ ] 15.3 Optimize database queries
  - Use database indexes effectively
  - Limit result set size
  - Implement pagination
  - _Requirements: Performance_

- [ ] 16. Implement error handling
- [ ] 16.1 Handle location errors
  - Prompt for location permission
  - Fallback to manual address entry
  - Display clear error messages
  - _Requirements: 2.2_

- [ ] 16.2 Handle network errors
  - Show cached results when offline
  - Display retry button
  - Queue failed requests
  - _Requirements: Error Handling_

- [ ]\* 16.3 Write unit tests for error scenarios
  - Test location permission denied
  - Test network failure
  - Test invalid input
  - _Requirements: Error Handling_

- [ ] 17. Add accessibility features
- [ ] 17.1 Implement keyboard navigation
  - Tab through all filter controls
  - Enter/Space to activate
  - Escape to close dropdowns
  - _Requirements: Accessibility_

- [ ] 17.2 Add ARIA labels and roles
  - Label all filter controls
  - Announce result count changes
  - Provide screen reader feedback
  - _Requirements: Accessibility_

- [ ]\* 17.3 Test with screen readers
  - Test with NVDA/JAWS
  - Test with VoiceOver
  - Verify all content is announced
  - _Requirements: Accessibility_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Integration and polish
- [ ] 19.1 Integrate with existing UI
  - Add search to navbar
  - Style to match design system
  - Ensure responsive design
  - _Requirements: All_

- [ ] 19.2 Add loading states
  - Skeleton screens for results
  - Loading spinners for filters
  - Smooth transitions
  - _Requirements: UX_

- [ ] 19.3 Add analytics tracking
  - Track search queries
  - Track filter usage
  - Track result clicks
  - _Requirements: Analytics_

- [ ]\* 19.4 Perform end-to-end testing
  - Test complete search flow
  - Test filter combinations
  - Test on multiple devices
  - _Requirements: All_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
