# FoodShare Technology Stack

**Last Updated:** November 2025

## Frontend Framework

### **Vite 7.2.2**

- **Purpose**: Build tool and development server
- **Why**: Lightning-fast HMR, native ESM, optimized builds
- **Config**: `vite.config.ts`

### **React 19.2.0**

- **Purpose**: UI library for building components
- **Features**: Hooks, Suspense, Concurrent rendering
- **Why**: Industry standard, large ecosystem, excellent performance

### **TypeScript 5.9.3**

- **Purpose**: Type-safe JavaScript
- **Config**: `tsconfig.json`
- **Why**: Catch errors early, better IDE support, self-documenting code

---

## UI Framework

### **Chakra UI 3.29.0**

- **Purpose**: Component library and design system
- **Features**:
  - Pre-built accessible components
  - Dark mode support
  - Responsive design utilities
  - Theme customization
- **Why**: WCAG compliant, composable, well-documented

### **Emotion 11.14.0**

- **Purpose**: CSS-in-JS styling
- **Used by**: Chakra UI for dynamic styling
- **Features**: Runtime style injection, theme support

### **Framer Motion 12.23.24**

- **Purpose**: Animation library
- **Features**: Declarative animations, gesture support
- **Use Cases**: Page transitions, modal animations, interactive elements

---

## State Management

### **Redux Toolkit 2.10.1**

- **Purpose**: Global state management
- **Features**:
  - Simplified Redux setup
  - Built-in immutability
  - Redux DevTools integration
- **Structure**:
  - `userReducer` - Authentication and user state
  - `productReducer` - Product listings and filters
  - `chatReducer` - Chat rooms and messages

### **React Redux 9.2.0**

- **Purpose**: React bindings for Redux
- **Hooks**: `useSelector`, `useDispatch`

### **Redux Thunk 3.1.0**

- **Purpose**: Async action handling
- **Use Cases**: API calls, side effects

---

## Backend & Database

### **Supabase 2.81.1**

- **Purpose**: Backend-as-a-Service
- **Features**:
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage for images
  - Row Level Security
- **Config**: `src/lib/supabase/client.ts`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## Routing

### **React Router DOM 7.9.5**

- **Purpose**: Client-side routing
- **Features**:
  - Declarative routing
  - Nested routes
  - Route parameters
- **Routes**: Defined in `src/utils/ROUTES.ts`

---

## Maps & Geolocation

### **Leaflet 1.9.4**

- **Purpose**: Interactive maps
- **Why**: Open-source, no API keys, extensive plugins

### **React Leaflet 5.0.0**

- **Purpose**: React bindings for Leaflet
- **Components**: Map, Marker, Popup, TileLayer

### **React Leaflet Cluster 3.1.1**

- **Purpose**: Marker clustering for performance
- **Why**: Improves map performance with many markers

### **Leaflet Geosearch 4.2.2**

- **Purpose**: Address search and geocoding
- **Features**: Multiple provider support (OpenStreetMap, Google, etc.)

---

## Internationalization (i18n)

### **Lingui 5.6.0**

- **Purpose**: Internationalization framework
- **Features**:
  - Message extraction
  - Compiled catalogs (runtime performance)
  - Pluralization support
  - ICU MessageFormat
- **Supported Locales**:
  - English (en)
  - Czech (cs)
  - French (fr)
  - Russian (ru)
- **Commands**:
  ```bash
  npm run extract  # Extract translatable strings
  npm run compile  # Compile translations
  ```

---

## Forms

### **React Hook Form 7.66.0**

- **Purpose**: Form state management and validation
- **Features**:
  - Performance-focused (minimal re-renders)
  - Easy validation
  - TypeScript support
- **Use Cases**: Login, product creation, profile editing

---

## Icons

### **React Icons 5.5.0**

- **Purpose**: Icon library
- **Icon Sets**: Font Awesome, Material Icons, Chakra Icons
- **Why**: Single package for all icon needs

### **Chakra UI Icons 2.2.4**

- **Purpose**: Chakra-specific icons
- **Features**: Matches Chakra design system

---

## Additional UI Libraries

### **React Alice Carousel 2.9.1**

- **Purpose**: Image carousel/slider component
- **Use Cases**: Product image galleries
- **Features**: Touch support, autoplay, responsive

---

## Testing

### **Jest 30.0.0**

- **Purpose**: Testing framework
- **Config**: `jest.config.js`

### **React Testing Library 16.3.0**

- **Purpose**: Testing React components
- **Philosophy**: Test behavior, not implementation

### **Testing Library User Event 14.6.1**

- **Purpose**: Simulate user interactions
- **Features**: Fire events like real users

---

## Build & Development Tools

### **Vite Plugins**

#### **@vitejs/plugin-react 5.1.1**

- React Fast Refresh support

#### **vite-plugin-svgr 4.5.0**

- Import SVGs as React components

#### **vite-tsconfig-paths 5.1.4**

- Path alias support (`@/`)

#### **@lingui/vite-plugin 5.6.0**

- Lingui integration with Vite

### **Sass 1.94.0**

- **Purpose**: CSS preprocessing
- **Features**: Variables, nesting, mixins
- **Use Cases**: Global styles, complex styling

---

## Analytics & Monitoring

### **Vercel Analytics 1.5.0**

- **Purpose**: Web analytics
- **Features**: Pageviews, user tracking, performance metrics

### **Vercel Speed Insights 1.2.0**

- **Purpose**: Performance monitoring
- **Metrics**: Core Web Vitals, real user monitoring

---

## Development Dependencies

### **TypeScript Types**

- `@types/node` - Node.js types
- `@types/react` - React types
- `@types/react-dom` - React DOM types
- `@types/leaflet` - Leaflet types
- `@types/react-redux` - Redux types
- `@types/react-router-dom` - Router types

### **Babel**

- `babel-plugin-macros` - Macro support for Lingui

---

## Environment Variables

Required environment variables (`.env`):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Analytics
VITE_VERCEL_ANALYTICS_ID=your_analytics_id
```

---

## Browser Targets

### Production

- > 0.2% market share
- Not dead browsers
- Not Opera Mini

### Development

- Latest Chrome
- Latest Firefox
- Latest Safari

---

## Performance Optimizations

1. **Code Splitting**: Dynamic imports for routes
2. **Image Optimization**: Lazy loading, responsive images
3. **Bundle Optimization**: Vite's automatic code splitting
4. **Caching**: Redux persistence, Supabase client caching
5. **Realtime**: Debounced search, optimistic UI updates

---

## Security Measures

1. **Environment Variables**: Sensitive data not in code
2. **Row Level Security**: Database access control
3. **HTTPS**: Enforced in production
4. **XSS Protection**: React escapes by default
5. **CSRF Protection**: Supabase handles tokens
6. **Content Security Policy**: Configured for production

---

**Next Steps:**

- Review [Architecture](ARCHITECTURE.md) for system design
- See [Database Schema](DATABASE_SCHEMA.md) for data structure
- Read [Development Guide](DEVELOPMENT_GUIDE.md) for workflows
