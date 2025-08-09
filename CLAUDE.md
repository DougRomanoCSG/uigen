# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components based on user descriptions and provides real-time preview with a virtual file system.

## Development Commands

### Setup & Installation
```bash
npm run setup           # Install dependencies, generate Prisma client, run migrations
npm install            # Install dependencies only
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run database migrations
```

### Development
```bash
npm run dev            # Start development server with Turbopack on port 3000
npm run dev:daemon     # Start server in background, logs to logs.txt
```

### Testing
```bash
npm test               # Run all tests with Vitest
npm test <pattern>     # Run specific test files
```

### Build & Production
```bash
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run Next.js linter
```

### Database
```bash
npm run db:reset       # Reset database (force)
npx prisma studio      # Open Prisma Studio for database management
```

## Architecture

### Virtual File System
The application uses a **virtual file system** (`src/lib/file-system.ts`) that manages React components in memory without writing to disk. The `VirtualFileSystem` class handles:
- File/directory CRUD operations
- Path normalization and validation
- Serialization for persistence in SQLite via Prisma
- Text editor command implementations (view, replace, insert)

### AI Chat Pipeline
1. **Client**: `src/components/chat/ChatInterface.tsx` manages user input and message display
2. **API Route**: `src/app/api/chat/route.ts` processes requests:
   - Injects system prompt from `src/lib/prompts/generation.tsx`
   - Manages virtual file system instance
   - Provides AI tools: `str_replace_editor` and `file_manager`
   - Handles project persistence for authenticated users
3. **AI Provider**: Uses Anthropic Claude or mock provider (without API key)

### Tool System
Located in `src/lib/tools/`:
- **file-manager.ts**: Creates, deletes, renames files/directories
- **str-replace.ts**: String replacement operations in virtual files

### Authentication
- JWT-based authentication in `src/lib/auth.ts`
- Middleware protection in `src/middleware.ts`
- Anonymous users can use the app without persistence
- Registered users get project persistence

### Data Model (Prisma/SQLite)
- **User**: id, email, password, projects[]
- **Project**: id, name, userId, messages (JSON), data (JSON file system)
- Prisma client generated to `src/generated/prisma/`

### Component Structure
- **Editor**: Monaco editor (`src/components/editor/CodeEditor.tsx`) with file tree
- **Preview**: Live React component preview (`src/components/preview/PreviewFrame.tsx`)
- **Chat**: Message interface with markdown rendering
- **UI Components**: Radix UI primitives in `src/components/ui/`

### JSX Transformation
`src/lib/transform/jsx-transformer.ts` handles runtime JSX compilation using Babel standalone for live preview.

## Environment Variables

Required in `.env`:
```
ANTHROPIC_API_KEY=<optional - app works without it using mock responses>
```

## Testing Approach

Tests use Vitest with React Testing Library. Test files follow `__tests__/*.test.tsx` pattern. Mock server-only imports are configured in `vitest.config.mts`.

## Key Implementation Details

1. **No Real Files**: All generated code exists only in virtual file system
2. **Hot Reload**: Preview updates in real-time as AI generates code
3. **State Management**: React Context API for file system and chat state
4. **Streaming**: AI responses stream using Vercel AI SDK
5. **Mock Mode**: Works without API key using predetermined responses