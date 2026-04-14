# Implementation Plan: Web File Uploader

## Overview

This implementation plan breaks down the Web File Uploader feature into discrete coding tasks. The system is a full-stack application with React + Vite + Tailwind + shadcn/ui frontend and Node.js + Express + PostgreSQL backend. Files are automatically classified by type and stored in organized category-based folders.

The implementation follows an incremental approach: backend infrastructure first, then core services, followed by frontend components, and finally integration with comprehensive testing throughout.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create monorepo structure with separate frontend and backend directories
  - Initialize backend: `npm init` in backend directory, install Express, Multer, pg, dotenv, cors
  - Initialize frontend: `npm create vite@latest` with React + TypeScript template
  - Install frontend dependencies: Tailwind CSS, shadcn/ui, Axios, React Query
  - Create .env.example files for both frontend and backend with required configuration variables
  - Set up .gitignore files to exclude node_modules, .env, and build artifacts
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2_

- [ ] 2. Set up database schema and migrations
  - [x] 2.1 Create PostgreSQL database and connection module
    - Write database connection module using node-postgres (pg) with connection pooling
    - Implement connection configuration from environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
    - Add connection health check function
    - _Requirements: 9.5, 9.8_
  
  - [x] 2.2 Create uploads table schema
    - Write SQL migration to create uploads table with all required columns (id, file_name, original_name, file_size, category, stored_path, mime_type, uploaded_at, session_id, device_info, checksum)
    - Add indexes on session_id, uploaded_at, and category columns for query performance
    - _Requirements: 8.1, 8.4, 11.6_
  
  - [x] 2.3 Create configuration table schema
    - Write SQL migration to create configuration table (key, value, description, updated_at)
    - Insert initial configuration values (target_folder, max_file_size, concurrent_upload_limit)
    - _Requirements: 4.1_
  
  - [x] 2.4 Write property test for database schema
    - **Property 14: Upload Metadata Recording**
    - **Validates: Requirements 8.1, 8.4**
    - Generate random upload records and verify all required fields are stored correctly

- [ ] 3. Implement backend configuration management
  - [x] 3.1 Create ConfigManager service
    - Implement ConfigManager class to read configuration from database and environment variables
    - Add methods: getTargetFolder(), getMaxFileSize(), getConcurrentUploadLimit()
    - Implement caching mechanism for configuration values
    - _Requirements: 4.1, 4.2_
  
  - [x] 3.2 Write unit tests for ConfigManager
    - Test configuration loading from database
    - Test fallback to environment variables
    - Test caching behavior
    - _Requirements: 4.1_

- [ ] 4. Implement file classification service
  - [x] 4.1 Create ClassifierService with extension mapping
    - Implement ClassifierService class with classifyFile() method
    - Define extension-to-category mappings for Photo, Video, Document, Audio, Archive, Other
    - Implement getSupportedExtensions() method returning Map of categories to extensions
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7_
  
  - [x] 4.2 Add MIME type validation
    - Implement validateMimeType() method to check consistency between file extension and MIME type
    - Add logic to flag mismatches for additional validation
    - _Requirements: 3.1.8_
  
  - [x] 4.3 Write property test for file classification
    - **Property 8: File Classification by Extension**
    - **Validates: Requirements 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6**
    - Generate random files with all supported extensions and verify correct category assignment
  
  - [x] 4.4 Write property test for MIME type validation
    - **Property 9: MIME Type Validation**
    - **Validates: Requirements 3.1.8**
    - Generate files with various extension/MIME type combinations and verify validation logic
  
  - [x] 4.5 Write unit tests for ClassifierService
    - Test specific extension mappings (.jpg → Photo, .mp4 → Video, .pdf → Document)
    - Test unknown extension defaults to "Other"
    - Test MIME type mismatch detection
    - _Requirements: 3.1.7, 3.1.8_

- [ ] 5. Implement storage service
  - [x] 5.1 Create StorageService with folder management
    - Implement StorageService class with saveFile() method
    - Implement ensureCategoryFolder() to create category subfolders if they don't exist
    - Implement verifyStorageSpace() to check available disk space before saving
    - _Requirements: 3.1, 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8, 4.2, 4.3_
  
  - [x] 5.2 Implement filename conflict resolution
    - Implement resolveFileNameConflict() to append numeric suffix (_1, _2, etc.) when file exists
    - Add logic to find next available suffix number
    - _Requirements: 3.2, 3.3_
  
  - [x] 5.3 Add file integrity verification
    - Implement checksum calculation using crypto module (SHA-256)
    - Add verifyFileIntegrity() method to compare original and stored file checksums
    - _Requirements: 3.4_
  
  - [x] 5.4 Set file permissions
    - Implement setFilePermissions() to set appropriate read/write permissions on saved files
    - Use fs.chmod() with configurable permission mode
    - _Requirements: 3.5_
  
  - [x] 5.5 Write property test for file storage persistence
    - **Property 3: File Storage Persistence**
    - **Validates: Requirements 3.1**
    - Generate random files and verify they are saved and retrievable from file system
  
  - [x] 5.6 Write property test for filename preservation
    - **Property 4: Original Filename Preservation**
    - **Validates: Requirements 3.2**
    - Generate files with unique names and verify original filename is preserved
  
  - [x] 5.7 Write property test for conflict resolution
    - **Property 5: Filename Conflict Resolution**
    - **Validates: Requirements 3.3**
    - Generate files with duplicate names and verify numeric suffix is appended
  
  - [x] 5.8 Write property test for file integrity
    - **Property 6: File Integrity Verification**
    - **Validates: Requirements 3.4**
    - Generate random files and verify checksums match after storage
  
  - [x] 5.9 Write property test for file permissions
    - **Property 7: File Permission Assignment**
    - **Validates: Requirements 3.5**
    - Verify saved files have correct permissions set
  
  - [x] 5.10 Write property test for category-based storage
    - **Property 10: Category-Based Storage Organization**
    - **Validates: Requirements 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7**
    - Generate files of each category and verify they are stored in correct subfolders
  
  - [x] 5.11 Write property test for subfolder creation
    - **Property 11: Automatic Subfolder Creation**
    - **Validates: Requirements 3.2.8**
    - Test with missing subfolders and verify they are created automatically
  
  - [x] 5.12 Write unit tests for StorageService
    - Test saveFile() with valid file
    - Test conflict resolution with existing files
    - Test storage space verification
    - Test error handling for inaccessible target folder
    - _Requirements: 3.1, 3.3, 7.2, 7.4_

- [x] 6. Checkpoint - Ensure backend core services pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement history service and repository
  - [x] 7.1 Create FileRepository for database operations
    - Implement FileRepository class with insertUploadRecord() method
    - Implement getUploadsBySession() method to query by session_id
    - Implement getRecentUploads() method with limit parameter
    - Use parameterized queries to prevent SQL injection
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 7.2 Create HistoryService
    - Implement HistoryService class with recordUpload() method
    - Implement getSessionHistory() and getRecentUploads() methods
    - Add error handling with retry logic for database failures
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 7.3 Write property test for metadata recording
    - **Property 14: Upload Metadata Recording** (implementation verification)
    - **Validates: Requirements 8.1, 8.4**
    - Generate random uploads and verify complete metadata is recorded
  
  - [x] 7.4 Write property test for history query structure
    - **Property 15: History Query Response Structure**
    - **Validates: Requirements 8.3**
    - Query history and verify all required fields are present in response
  
  - [x] 7.5 Write unit tests for HistoryService
    - Test recordUpload() with valid data
    - Test getSessionHistory() filtering
    - Test getRecentUploads() with limit
    - Test retry logic on database failure
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 8. Implement main file upload service
  - [x] 8.1 Create FileService orchestration layer
    - Implement FileService class with handleUpload() method
    - Orchestrate flow: receive file → classify → store → verify → record metadata
    - Implement handleMultipleUploads() for batch processing
    - Add comprehensive error handling for each step
    - _Requirements: 2.1, 3.1, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4_
  
  - [x] 8.2 Add file size validation
    - Implement file size check against max_file_size configuration (500MB default)
    - Reject files exceeding limit with descriptive error
    - _Requirements: 2.7_
  
  - [x] 8.3 Write property test for file format acceptance
    - **Property 1: Supported File Format Acceptance**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
    - Generate files with all supported extensions and verify acceptance
  
  - [x] 8.4 Write property test for file size limit
    - **Property 2: File Size Limit Enforcement**
    - **Validates: Requirements 2.7**
    - Generate files with sizes around 500MB threshold and verify enforcement
  
  - [x] 8.5 Write property test for multiple file processing
    - **Property 12: Multiple File Processing**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Generate batches with some invalid files and verify independent processing
  
  - [x] 8.6 Write unit tests for FileService
    - Test handleUpload() with valid file
    - Test rejection of oversized file
    - Test rejection of unsupported format
    - Test handleMultipleUploads() with mixed success/failure
    - Test error handling for storage failures
    - _Requirements: 2.1, 2.7, 6.3, 7.1, 7.3_

- [x] 9. Implement Express API endpoints
  - [x] 9.1 Set up Express server with middleware
    - Create Express app with JSON and CORS middleware
    - Configure Multer for multipart/form-data handling with memory storage
    - Add request logging middleware
    - Configure HTTPS with SSL certificates from environment variables
    - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3, 5.4, 9.3_
  
  - [x] 9.2 Implement POST /api/upload endpoint
    - Create route handler accepting multipart/form-data
    - Extract files and metadata (sessionId, deviceInfo) from request
    - Call FileService.handleMultipleUploads()
    - Return JSON response with results for each file
    - Add error handling middleware
    - _Requirements: 2.1, 2.8, 2.9, 6.1, 6.2, 7.1_
  
  - [x] 9.3 Implement GET /api/history endpoint
    - Create route handler accepting query parameters (sessionId, limit)
    - Call HistoryService to retrieve upload records
    - Return JSON response with upload history including category information
    - _Requirements: 8.2, 8.3, 8.5_
  
  - [x] 9.4 Implement GET /api/config endpoint
    - Create route handler to return client configuration
    - Return maxFileSize, supportedCategories, and acceptedExtensions
    - _Requirements: 2.7, 4.1_
  
  - [x] 9.5 Add rate limiting middleware
    - Implement rate limiting using express-rate-limit package
    - Configure threshold and time window from environment variables
    - Return 429 status code when limit exceeded
    - _Requirements: 11.3_
  
  - [x] 9.6 Add response compression middleware
    - Add compression middleware to reduce bandwidth usage
    - _Requirements: 11.4_
  
  - [x] 9.7 Write property test for concurrent upload limit
    - **Property 16: Concurrent Upload Limit Enforcement**
    - **Validates: Requirements 11.5**
    - Generate multiple concurrent uploads and verify limit is enforced
  
  - [x] 9.8 Write property test for rate limiting
    - **Property 17: Rate Limiting Protection**
    - **Validates: Requirements 11.3**
    - Generate high-frequency requests and verify rate limit enforcement
  
  - [x] 9.9 Write integration tests for API endpoints
    - Test POST /api/upload with valid file
    - Test POST /api/upload with oversized file (expect 400)
    - Test POST /api/upload with multiple files
    - Test GET /api/history with sessionId filter
    - Test GET /api/history with limit parameter
    - Test GET /api/config returns correct structure
    - Test rate limiting triggers 429 response
    - _Requirements: 2.1, 2.7, 2.9, 6.1, 8.2, 8.3, 11.3_

- [x] 10. Checkpoint - Ensure backend API is functional
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Set up frontend project structure
  - [x] 11.1 Configure Tailwind CSS
    - Install and configure Tailwind CSS with Vite
    - Create tailwind.config.js with custom theme if needed
    - Add Tailwind directives to main CSS file
    - _Requirements: 10.1_
  
  - [x] 11.2 Install and configure shadcn/ui
    - Initialize shadcn/ui with `npx shadcn-ui@latest init`
    - Install required components: Button, Card, Progress, Toast, Dialog
    - Configure components.json for project structure
    - _Requirements: 10.2_
  
  - [x] 11.3 Set up React Query for data fetching
    - Install @tanstack/react-query
    - Create QueryClient and wrap app with QueryClientProvider
    - Configure default query options (retry, staleTime)
    - _Requirements: 9.2_
  
  - [x] 11.4 Create API client module
    - Create Axios instance with base URL from environment variable
    - Implement uploadFiles() function for POST /api/upload
    - Implement getHistory() function for GET /api/history
    - Implement getConfig() function for GET /api/config
    - Add request/response interceptors for error handling
    - _Requirements: 1.1, 2.1, 8.2_
  
  - [x] 11.5 Write unit tests for API client
    - Test uploadFiles() request structure
    - Test getHistory() with query parameters
    - Test error handling in interceptors
    - _Requirements: 2.1, 8.2_

- [x] 12. Implement frontend upload interface
  - [x] 12.1 Create UploadZone component with drag-and-drop
    - Implement drag-and-drop zone using HTML5 drag events
    - Add visual feedback on dragover (highlight border, change background)
    - Implement file input fallback for click-to-browse
    - Support multiple file selection
    - _Requirements: 1.3, 10.3, 10.4_
  
  - [x] 12.2 Add client-side file validation
    - Validate file size against maxFileSize from config (show error toast if exceeded)
    - Validate file type against accepted extensions (show error toast if unsupported)
    - Display validation errors using toast notifications
    - _Requirements: 2.7, 7.1, 10.10_
  
  - [x] 12.3 Implement image preview functionality
    - Generate thumbnail previews for image files using FileReader API
    - Display preview grid for selected images
    - _Requirements: 10.6, 11.2_
  
  - [x] 12.4 Write unit tests for UploadZone component
    - Test drag-and-drop event handlers
    - Test file selection via input
    - Test client-side validation
    - Test image preview generation
    - _Requirements: 10.3, 10.4, 2.7_

- [x] 13. Implement progress display component
  - [x] 13.1 Create ProgressDisplay component
    - Create component to display upload progress for each file
    - Use shadcn/ui Progress component for progress bars
    - Show file name, size, and current progress percentage
    - Display status indicators (pending, uploading, success, error) with icons
    - Show category label once classification is complete
    - _Requirements: 2.8, 8.5, 10.5, 10.9_
  
  - [x] 13.2 Implement upload state management
    - Create React state to track upload progress for multiple files
    - Update progress state as upload progresses using Axios onUploadProgress callback
    - Handle success and error states for each file independently
    - _Requirements: 2.8, 6.3, 10.9_
  
  - [x] 13.3 Write unit tests for ProgressDisplay component
    - Test rendering of progress bars
    - Test status indicator display
    - Test category label display
    - Test error message display
    - _Requirements: 2.8, 8.5_

- [x] 14. Implement upload history view
  - [x] 14.1 Create HistoryView component
    - Create component to display upload history using shadcn/ui Card components
    - Use React Query to fetch history data from GET /api/history
    - Display file name, size, category, upload timestamp, and device info
    - Add category icons/labels for visual identification
    - Implement loading state with skeleton loaders
    - _Requirements: 8.2, 8.3, 8.5, 10.9_
  
  - [x] 14.2 Add history filtering and pagination
    - Add filter by sessionId (current session vs all uploads)
    - Implement limit parameter for pagination
    - Add "Load More" button for additional records
    - _Requirements: 8.2_
  
  - [x] 14.3 Write unit tests for HistoryView component
    - Test history data rendering
    - Test loading state display
    - Test filtering by sessionId
    - Test pagination behavior
    - _Requirements: 8.2, 8.3_

- [x] 15. Implement main application layout
  - [x] 15.1 Create responsive App layout
    - Create main App component with responsive layout using Tailwind CSS
    - Implement mobile-first design with breakpoints for tablet and desktop
    - Add header with application title
    - Organize layout: upload zone at top, progress display in middle, history at bottom
    - _Requirements: 1.2, 10.7, 10.8_
  
  - [x] 15.2 Add toast notification system
    - Set up toast notification provider using shadcn/ui Toast component
    - Implement toast notifications for success, error, and info messages
    - Add toasts for upload success, upload errors, validation errors
    - _Requirements: 2.9, 7.1, 10.10_
  
  - [x] 15.3 Implement loading states
    - Add loading indicators for all async operations
    - Use shadcn/ui Spinner or Skeleton components
    - Show loading state during config fetch, upload, and history retrieval
    - _Requirements: 10.9, 11.1_
  
  - [x] 15.4 Write integration tests for App component
    - Test complete upload flow from file selection to history display
    - Test error handling and toast notifications
    - Test responsive layout at different breakpoints
    - _Requirements: 1.2, 2.9, 10.7_

- [x] 16. Implement accessibility features
  - [x] 16.1 Add ARIA labels and keyboard navigation
    - Add aria-label attributes to all interactive elements
    - Implement keyboard navigation for upload zone (Enter/Space to open file dialog)
    - Add focus indicators for all focusable elements
    - Ensure proper heading hierarchy (h1, h2, h3)
    - _Requirements: 10.8_
  
  - [x] 16.2 Add screen reader support
    - Add aria-live regions for dynamic content updates (progress, notifications)
    - Add descriptive alt text for icons
    - Ensure form labels are properly associated with inputs
    - _Requirements: 10.8_
  
  - [x] 16.3 Test accessibility compliance
    - Run automated accessibility tests using axe-core or similar tool
    - Test keyboard-only navigation
    - Test with screen reader (manual testing recommended)
    - _Requirements: 10.8_

- [x] 17. Implement performance optimizations
  - [x] 17.1 Add lazy loading for components
    - Use React.lazy() to lazy load HistoryView component
    - Add Suspense boundaries with loading fallbacks
    - _Requirements: 11.1_
  
  - [x] 17.2 Optimize image preview generation
    - Implement thumbnail generation with size limits (max 200x200px)
    - Use canvas API for efficient resizing
    - _Requirements: 11.2_
  
  - [x] 17.3 Configure concurrent upload limit
    - Implement queue system for multiple file uploads
    - Process uploads in batches based on concurrent_upload_limit configuration
    - _Requirements: 11.5_
  
  - [x] 17.4 Add static asset caching
    - Configure Vite build to generate cache-friendly filenames with hashes
    - Set up service worker for offline support (optional enhancement)
    - _Requirements: 11.7_
  
  - [x] 17.5 Write performance tests
    - Test upload performance with large files (up to 500MB)
    - Test concurrent upload limit enforcement
    - Measure and verify page load time
    - _Requirements: 11.1, 11.5_

- [x] 18. Checkpoint - Ensure frontend components are functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Integration and end-to-end wiring
  - [x] 19.1 Connect frontend to backend API
    - Configure frontend environment variables for API base URL
    - Test complete upload flow: select files → upload → display progress → show in history
    - Verify error handling across frontend and backend
    - _Requirements: 1.1, 2.1, 2.8, 2.9, 8.2_
  
  - [x] 19.2 Test category-based storage end-to-end
    - Upload files of each category (Photo, Video, Document, Audio, Archive, Other)
    - Verify files are stored in correct subfolders on disk
    - Verify category is displayed correctly in history view
    - _Requirements: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 8.5_
  
  - [x] 19.3 Test multiple file upload flow
    - Upload multiple files simultaneously
    - Verify each file is processed independently
    - Verify progress is tracked separately for each file
    - Verify all files appear in history
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 19.4 Test error scenarios end-to-end
    - Test upload with oversized file (expect client-side rejection)
    - Test upload with unsupported format (expect client-side rejection)
    - Test upload with network failure (expect error toast)
    - Test upload when target folder is inaccessible (expect server error)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 19.5 Write property test for error logging
    - **Property 13: Error Logging**
    - **Validates: Requirements 7.4**
    - Generate various error conditions and verify log entries are created
  
  - [x] 19.6 Write end-to-end integration tests
    - Test complete upload workflow from UI to storage
    - Test history retrieval after uploads
    - Test configuration loading on app startup
    - Test rate limiting across multiple requests
    - _Requirements: 1.1, 2.1, 3.1, 8.2, 11.3_

- [x] 20. Create deployment configuration
  - [x] 20.1 Create production build scripts
    - Add build scripts to package.json for both frontend and backend
    - Configure Vite for production build with optimizations
    - Create start script for production server
    - _Requirements: 9.2, 9.3_
  
  - [x] 20.2 Create environment configuration documentation
    - Document all required environment variables for backend (.env.example)
    - Document all required environment variables for frontend (.env.example)
    - Create README with setup instructions
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 20.3 Create database initialization script
    - Create SQL script to initialize database schema
    - Create script to seed initial configuration values
    - Add instructions for running migrations
    - _Requirements: 9.5, 4.1_

- [x] 21. Final checkpoint - Comprehensive testing and validation
  - Run all unit tests, property tests, and integration tests
  - Verify all 17 correctness properties pass
  - Test complete user workflows from multiple devices (mobile, tablet, desktop)
  - Verify file storage organization on disk
  - Verify upload history accuracy
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and error conditions
- Implementation uses TypeScript for type safety throughout frontend and backend
- Backend uses Node.js + Express + PostgreSQL as specified in requirements
- Frontend uses React + Vite + Tailwind + shadcn/ui as specified in requirements
- All 17 correctness properties from the design document are covered by property tests
- Checkpoints ensure incremental validation at key milestones
