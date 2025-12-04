# FoodShare Claude Code Skills

This directory contains custom Claude Code skills tailored for the FoodShare project. These skills provide expert guidance and best practices for our specific tech stack.

## Available Skills

### 1. react-typescript
Expert guidance for React 19 + TypeScript development with Vite and Chakra UI.

**Topics Covered:**
- Modern React patterns and hooks
- TypeScript best practices
- Chakra UI integration
- Performance optimization
- Component architecture
- Error boundaries and error handling

**When to Use:** Creating components, refactoring code, implementing React features

---

### 2. supabase-backend
Comprehensive Supabase integration for authentication, database, and storage.

**Topics Covered:**
- Authentication (email/password, OAuth)
- Database CRUD operations
- Real-time subscriptions
- File storage and uploads
- Row Level Security (RLS)
- Custom React hooks for Supabase

**When to Use:** Backend operations, authentication, database queries, real-time features

---

### 3. vitest-testing
Testing React applications with Vitest and React Testing Library.

**Topics Covered:**
- Component testing
- Hook testing
- Async behavior testing
- Mocking (Supabase, React Router, Leaflet)
- Coverage configuration
- Testing best practices

**When to Use:** Writing tests, improving coverage, debugging test failures

---

### 4. leaflet-maps
Interactive mapping with React Leaflet for location-based features.

**Topics Covered:**
- Map setup and configuration
- Marker clustering
- Custom markers and popups
- Geolocation and user tracking
- Location search
- Map events and interactions
- Performance optimization

**When to Use:** Map features, location tracking, marker customization, geospatial queries

---

### 5. redux-toolkit
Modern state management with Redux Toolkit and React Redux.

**Topics Covered:**
- Store configuration
- Creating slices and reducers
- Async thunks for data fetching
- Memoized selectors
- RTK Query (optional)
- Performance optimization
- Testing Redux logic

**When to Use:** State management, global state, async data fetching, Redux debugging

---

### 6. i18n-lingui
Internationalization with Lingui for multi-language support.

**Topics Covered:**
- Lingui setup and configuration
- Translation macros (Trans, msg)
- Pluralization and formatting
- Language switching
- Dynamic loading of translations
- CLI commands (extract, compile)
- Testing multilingual features

**When to Use:** Adding translations, language switching, pluralization, date/number formatting

---

### 7. react-router
React Router v7 navigation, routing, and data loading.

**Topics Covered:**
- Route configuration and navigation
- Data loaders and actions
- Nested routes and layouts
- Protected routes
- URL and query parameters
- Error boundaries
- Type-safe navigation

**When to Use:** Setting up routes, navigation, data loading, form submissions

---

### 8. form-handling
Form handling with React Hook Form and Chakra UI integration.

**Topics Covered:**
- Form setup and validation
- Error handling and display
- Dynamic fields (arrays)
- Controlled components
- File uploads
- Multi-step forms
- Chakra UI integration
- Testing forms

**When to Use:** Building forms, validation, complex form state, file uploads

---

### 9. code-quality
Code quality tools: ESLint, Prettier, and Lefthook.

**Topics Covered:**
- ESLint configuration and rules
- Prettier formatting setup
- Lefthook git hooks
- Conventional commits
- CI/CD integration
- VSCode integration
- Troubleshooting linting issues

**When to Use:** Setting up linting, formatting code, git hooks, enforcing code standards

---

## How to Use Skills in Claude Code

Skills are automatically available when you're working with Claude Code. The AI will reference these guidelines when helping with related tasks.

You can also explicitly reference skills in your questions:
- "Help me create a Supabase query for fetching nearby products"
- "How do I add marker clustering to my Leaflet map?"
- "Write tests for this React component using Vitest"
- "Set up a Redux slice for managing user authentication"

## Installing Skills for Team Members

Team members automatically get these skills when they clone the repository! Claude Code automatically detects skills in `.claude/skills/`.

Optionally, team members can also copy to their global skills directory:
```bash
cp -r .claude/skills/* ~/.claude/skills/
```

## Updating Skills

To update a skill:
1. Edit the `instructions.md` file in the skill directory
2. Commit changes to version control
3. Team members sync via `git pull`

## Adding New Skills

To add a new skill:
1. Create a new directory in `.claude/skills/`
2. Add `skill.json` with metadata
3. Add `instructions.md` with detailed guidelines
4. Commit and share with the team

## Skill Structure

Each skill directory contains:
- `skill.json` - Metadata (name, version, description, tags)
- `instructions.md` - Detailed guidance, patterns, and examples
