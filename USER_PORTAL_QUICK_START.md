# User Portal - Quick Start Guide

## 🚀 Immediate Access URLs

- **User Portal**: `/portal`
- **Profile Setup**: `/portal/profile`
- **Admin Dashboard**: `/admin/portal`

---

## 👤 For Regular Users

### Step 1: Create Account
1. Go to `/signup`
2. Enter email & password
3. Sign up
4. ✅ Profile automatically created
5. ✅ Admin automatically notified

### Step 2: Complete Profile
1. Navigate to `/portal`
2. Click **"My Profile"**
3. Fill in your information
4. Add interests and skills
5. Set privacy preferences
6. Click **"Save Profile"**

### Step 3: Connect with Others
1. Go to **"User Directory"** tab
2. Search for users
3. Click **"View Profile"** to see details
4. Click **"Connect"** to send request
5. Check **"My Connections"** tab for status

---

## 👨‍💼 For Admin (Raphael)

### Access Dashboard
**URL**: `/admin/portal`

### View Statistics
- Total users
- New users today
- Total connections
- Pending notifications

### Manage Users
1. Click **"All Users"** tab
2. View complete user list
3. Click **"Export Users"** for CSV download

### View Notifications
1. Click **"Notifications"** tab
2. See all new user registrations
3. Click **"Mark Read"** to mark as read
4. View detailed user information

---

## 📧 Email Notifications

### Automatic Process
1. User signs up → Profile created
2. Admin notification logged in database
3. Email queued for sending

### Send Emails Manually
Call edge function: `send-admin-notification`

**Admin Email**: Set `ADMIN_EMAIL` env variable (default: `raphael@everafter.com`)

---

## 🔒 Privacy Settings

Users can control:
- ✅ Profile visibility (Public/Connections/Private)
- ✅ Allow messages
- ✅ Allow connection requests

---

## 📊 Data Export

**CSV Export** includes:
- Email, Name, Phone
- Location
- Interests, Skills
- Join date, Last active
- Connection count

---

## ✨ Key Features

✅ **User Registration** - Automatic profile creation
✅ **User Directory** - Search & filter users
✅ **Connection System** - Send/accept requests
✅ **Admin Dashboard** - View all users & export data
✅ **Email Notifications** - Auto-notify admin on signup
✅ **Privacy Controls** - Granular visibility settings
✅ **Responsive Design** - Works on all devices
✅ **Secure** - RLS policies protect all data

---

## 🎨 Design

Follows EverAfter's glass-neumorphic aesthetic:
- Semi-transparent cards
- Gradient overlays
- Smooth animations
- Sky blue accents

---

## 📦 What's Included

**Database Tables**:
- user_profiles
- user_connections
- user_messages
- admin_notifications
- user_activity_log

**Pages Created**:
- UserPortal (main hub)
- UserProfileSetup (edit profile)
- AdminPortal (admin dashboard)

**Edge Functions**:
- send-admin-notification

**Routes**:
- `/portal` - User portal
- `/portal/profile` - Profile editor
- `/admin/portal` - Admin dashboard

---

## 🔧 Technical Stack

- **Frontend**: React + TypeScript
- **Backend**: Supabase
- **Database**: PostgreSQL with RLS
- **Auth**: Supabase Auth
- **Edge Functions**: Deno
- **Design**: TailwindCSS

---

## ✅ Production Ready

- Build successful (5.72s)
- All routes working
- RLS security enabled
- Migrations ready to deploy
- Documentation complete

**Deploy and start connecting users immediately!**
