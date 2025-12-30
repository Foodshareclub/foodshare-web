# Getting Started with FoodShare

Welcome! This section contains everything you need to get up and running with FoodShare development.

## Documentation in This Section

### [INSTALLATION.md](./INSTALLATION.md)

Complete installation and setup guide.

- Prerequisites
- Environment setup
- Development server
- Troubleshooting

### [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

Understanding the codebase organization.

- Folder structure
- File naming conventions
- Import patterns

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd foodshare
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Essential Commands

| Command              | Description              |
| -------------------- | ------------------------ |
| `npm run dev`        | Start development server |
| `npm run build`      | Build for production     |
| `npm run lint`       | Run ESLint               |
| `npm run type-check` | TypeScript checking      |

## Key Concepts

### Tech Stack

- **Next.js 16** with App Router
- **React 19** with React Compiler
- **TypeScript 5**
- **Tailwind CSS 4**
- **Supabase** for backend

### Environment Variables

- Use `NEXT_PUBLIC_` prefix for client-side variables
- Example: `NEXT_PUBLIC_SUPABASE_URL`
- Never commit `.env.local`

## Next Steps

After setup, explore:

- [Development Guide](../02-development/DEVELOPMENT_GUIDE.md)
- [Architecture](../02-development/ARCHITECTURE.md)
- [Style Guide](../02-development/STYLE_GUIDE.md)

---

[Back to Index](../00-INDEX.md)
