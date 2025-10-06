# EverAfter - Setup Instructions

## Prerequisites
- Node.js 18+ installed
- Supabase account (https://supabase.com)

## Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Run the `supabase_schema.sql` file to create all tables and policies
4. Copy your project URL and anon key from Settings > API

## Environment Configuration

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Add your Supabase credentials to `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Demo Mode

The application will run in demo mode if Supabase credentials are not configured.
In demo mode, all data is stored in local state and will be lost on page refresh.

## Features Implemented

- User authentication (Sign up/Sign in/Sign out)
- Daily question system with time-aware questions
- Memory storage and timeline
- Family member management
- Saints AI system with activity tracking
- Projection/Memorial environment settings
- Comprehensive settings panel
- Privacy and security controls
- Data export functionality

## Database Structure

- **profiles**: User account information
- **memories**: Stored question responses
- **family_members**: Family access control
- **saints_ai**: AI assistant configurations
- **saint_activities**: Activity log for AI assistants
- **user_settings**: User preferences
- **projection_settings**: Memorial projection configurations

## Security

- Row Level Security (RLS) enabled on all tables
- End-to-end encryption ready
- Granular privacy controls
- Secure authentication via Supabase Auth

## Next Steps

1. Configure Supabase credentials
2. Customize Saints AI behaviors
3. Add payment integration for premium features
4. Implement voice/video recording
5. Add email notification system
6. Deploy to production
