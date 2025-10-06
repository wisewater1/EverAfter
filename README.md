# EverAfter - Digital Legacy Platform

A compassionate platform for preserving memories, stories, and wisdom through daily reflections. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### Core Functionality
- **Daily Questions**: Time-aware questions (morning, afternoon, evening, night)
- **Memory Timeline**: Beautiful chronological view of all memories
- **Family Dashboard**: Manage family access and permissions
- **Saints AI System**: Autonomous AI assistants for different needs
- **Memorial Projection**: Holographic presence system with geofencing
- **Privacy Controls**: Granular privacy and security settings

### Saints AI Engrams
- **St. Raphael (The Healer)**: Emotional support and grief counseling
- **St. Michael (The Protector)**: Security monitoring and privacy protection  
- **St. Martin (The Compassionate)**: Charitable giving and community building (Premium)
- **St. Agatha (The Resilient)**: Crisis support and family strength (Premium)

### User Experience
- Responsive design for all devices
- Dark mode support
- Smooth transitions and animations
- Accessible UI components
- Production-ready interface

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Build Tool**: Vite
- **State Management**: React Hooks

## Project Structure

```
src/
├── components/          # React components
│   ├── DailyQuestion.tsx
│   ├── MemoryTimeline.tsx
│   ├── FamilyDashboard.tsx
│   ├── MemorialEnvironment.tsx
│   ├── LandingPage.tsx
│   └── Header.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   └── useMemories.ts
├── lib/                # Third-party integrations
│   └── supabase.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── data/               # Static data and utilities
│   └── questions.ts
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## Getting Started

See [SETUP.md](./SETUP.md) for detailed setup instructions.

Quick start:
```bash
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The application uses Supabase with the following tables:
- **profiles**: User information
- **memories**: Stored responses
- **family_members**: Family access control
- **saints_ai**: AI assistant configurations  
- **saint_activities**: Activity logs
- **user_settings**: User preferences
- **projection_settings**: Memorial settings

Run `supabase_schema.sql` in your Supabase SQL editor to create all tables.

## Key Features

### Settings Panel
The comprehensive settings panel includes:
- Account profile management
- Daily question configuration
- Memory category preferences
- Notification settings (Email, SMS, Push, Digest)
- Privacy controls
- Data export/delete options

### Family Dashboard Tabs
1. **Overview**: Quick stats and recent activity
2. **Family Members**: Manage family access
3. **Saints AI**: Configure AI assistants
4. **Projection**: Memorial environment settings
5. **Privacy & Security**: Security controls
6. **Settings**: Comprehensive preferences

### Demo Mode
Without Supabase configuration, the app runs in demo mode with:
- Mock authentication
- Local state storage
- Full UI functionality
- Sample data

## Security

- Row Level Security (RLS) on all tables
- Secure authentication via Supabase Auth
- End-to-end encryption ready
- Granular privacy controls
- Audit logging

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Contributing

This is a private project. For inquiries, please contact the project owner.

## License

All rights reserved.

## Support

For setup help, see [SETUP.md](./SETUP.md)

---

Built with love for preserving memories and honoring legacies.
