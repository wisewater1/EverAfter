# EverAfter Implementation Roadmap

This document outlines all tasks needed to fill the gaps identified in the codebase compared to the product vision (rawfile.pdf).

**Last Updated:** January 2, 2026
**Reference:** Gap analysis comparing codebase to user flow document

---

## Table of Contents

1. [Phase 1: Onboarding Flow](#phase-1-onboarding-flow-critical)
2. [Phase 2: Background Automation & Notifications](#phase-2-background-automation--notifications)
3. [Phase 3: Visage/Visual System](#phase-3-visagevisual-system)
4. [Phase 4: Legacy & Family Access](#phase-4-legacy--family-access)
5. [Phase 5: Career Agent Deployment](#phase-5-career-agent-deployment)

---

## Phase 1: Onboarding Flow (Critical)

**Priority:** 🔴 Critical
**Estimated Scope:** 15-20 tasks
**Dependencies:** None (foundational)

### 1.1 Database Schema

- [ ] Create migration for `health_demographics` table
  ```sql
  -- Fields: user_id, age, gender, weight_kg, height_cm,
  -- health_conditions (jsonb), allergies (jsonb), medications (jsonb),
  -- health_goals (jsonb), created_at, updated_at
  ```
- [ ] Create migration for `onboarding_status` table
  ```sql
  -- Fields: user_id, step_completed (int),
  -- completed_steps (jsonb), started_at, completed_at
  ```
- [ ] Create migration for `media_consent` table
  ```sql
  -- Fields: user_id, photo_access, video_access, camera_access,
  -- consent_date, consent_version
  ```
- [ ] Add `has_completed_onboarding` boolean to `profiles` table

### 1.2 Onboarding Pages/Components

- [ ] Create `/src/pages/Onboarding.tsx` - Main onboarding wizard container
- [ ] Create `/src/components/onboarding/OnboardingProgress.tsx` - Step indicator
- [ ] Create `/src/components/onboarding/WelcomeStep.tsx` - Initial welcome screen
- [ ] Create `/src/components/onboarding/MeetRaphaelStep.tsx` - Introduce St. Raphael
- [ ] Create `/src/components/onboarding/HealthProfileStep.tsx` - Demographics questionnaire
- [ ] Create `/src/components/onboarding/HealthConnectionStep.tsx` - Connect health sources
- [ ] Create `/src/components/onboarding/MediaPermissionsStep.tsx` - Photo/video permissions
- [ ] Create `/src/components/onboarding/FirstEngramStep.tsx` - Create first engram
- [ ] Create `/src/components/onboarding/OnboardingComplete.tsx` - Success screen

### 1.3 Backend/Edge Functions

- [ ] Create `supabase/functions/onboarding-status/index.ts` - Track onboarding progress
- [ ] Create `supabase/functions/save-health-demographics/index.ts` - Save health profile
- [ ] Update `AuthContext.tsx` to check onboarding status on login

### 1.4 Routing & Navigation

- [ ] Add `/onboarding` route to `App.tsx`
- [ ] Add `/onboarding/:step` dynamic routes
- [ ] Implement conditional redirect: signup → onboarding → dashboard
- [ ] Add "Skip onboarding" option with confirmation
- [ ] Prevent dashboard access until onboarding complete (or skipped)

### 1.5 Health Profile Questionnaire Fields

- [ ] Age input with validation (13-120)
- [ ] Gender/sex selection (with prefer not to say option)
- [ ] Weight input (kg/lbs toggle)
- [ ] Height input (cm/ft-in toggle)
- [ ] Health conditions multi-select (diabetes, heart disease, etc.)
- [ ] Allergies input (free-form tags)
- [ ] Current medications list
- [ ] Primary health goals selection (lose weight, sleep better, manage stress, etc.)
- [ ] Activity level selector

### 1.6 Testing

- [ ] Write unit tests for onboarding components
- [ ] Write E2E test for complete onboarding flow
- [ ] Test onboarding skip and resume functionality

---

## Phase 2: Background Automation & Notifications

**Priority:** 🟡 High
**Estimated Scope:** 20-25 tasks
**Dependencies:** Phase 1 (user preferences)

### 2.1 Push Notification Infrastructure

- [ ] Research and select push service (Firebase Cloud Messaging vs OneSignal vs Pushover)
- [ ] Create Supabase secret for push service API key
- [ ] Create `supabase/functions/send-push-notification/index.ts`
- [ ] Create migration for `notification_queue` table
  ```sql
  -- Fields: id, user_id, type, title, body, data (jsonb),
  -- status (pending/sent/failed), sent_at, error_message
  ```
- [ ] Create migration for `notification_preferences` table
  ```sql
  -- Fields: user_id, push_enabled, email_enabled, sms_enabled,
  -- quiet_hours_start, quiet_hours_end, timezone,
  -- health_alerts, engagement_nudges, legacy_reminders
  ```
- [ ] Create migration for `user_devices` table (FCM tokens)

### 2.2 Notification Triggers

- [ ] Create `supabase/functions/trigger-health-alert/index.ts`
  - Glucose urgent low (<55 mg/dL) → immediate push
  - Glucose low (<70 mg/dL) sustained → push after 20 min
  - Glucose high (>180 mg/dL) sustained → push after 60 min
  - Sleep collapse (3+ nights <5 hours) → morning nudge
  - Activity drop (50%+ reduction) → afternoon check-in
- [ ] Create `supabase/functions/trigger-engagement-nudge/index.ts`
  - No app open in 3 days → "We miss you" nudge
  - Daily question streak about to break → reminder
  - Health goal milestone reached → celebration
- [ ] Create `supabase/functions/trigger-legacy-reminder/index.ts`
  - Scheduled message approaching delivery date
  - Vault item needs attention
  - Family member responded to question

### 2.3 Proactive Check-ins

- [ ] Create `engagement_templates` table with message templates
- [ ] Create `supabase/functions/send-checkin/index.ts`
- [ ] Implement "You ok?" nudge based on health anomalies
- [ ] Implement sleep quality check-in
- [ ] Implement stress level check-in
- [ ] Implement legacy prompt ("Tell me about your grandmother...")

### 2.4 Email Delivery

- [ ] Set up email service (Resend, SendGrid, or Postmark)
- [ ] Create `supabase/functions/send-email/index.ts`
- [ ] Create email templates for health alerts
- [ ] Create email templates for engagement
- [ ] Create email templates for legacy notifications

### 2.5 Notification Preferences UI

- [ ] Create `/src/components/NotificationSettings.tsx`
- [ ] Add notification preferences to user portal
- [ ] Implement quiet hours configuration
- [ ] Implement per-category opt-in/opt-out
- [ ] Add timezone selector

### 2.6 Background Job Enhancements

- [ ] Add timezone awareness to Raphael 9 AM job
- [ ] Implement notification rate limiting (max 5/day)
- [ ] Add retry logic with exponential backoff
- [ ] Create dead-letter queue for failed notifications
- [ ] Add notification analytics tracking

### 2.7 Real-time Alerts (Optional Enhancement)

- [ ] Evaluate WebSocket vs polling for real-time
- [ ] Implement critical alert bypass (ignore quiet hours)
- [ ] Add alert acknowledgment tracking

---

## Phase 3: Visage/Visual System

**Priority:** 🟡 High
**Estimated Scope:** 25-30 tasks
**Dependencies:** Phase 1 (media permissions)

### 3.1 AI Vision Integration

- [ ] Add `OPENAI_API_KEY` to Supabase secrets (if not already)
- [ ] Create `supabase/functions/analyze-photo/index.ts`
  - Use OpenAI Vision API
  - Detect faces, expressions, activities
  - Extract scene context (location, event type)
  - Return structured analysis JSON
- [ ] Create `supabase/functions/analyze-photo-batch/index.ts` for bulk processing

### 3.2 Database Schema for Visual Data

- [ ] Create migration for `photo_analysis` table
  ```sql
  -- Fields: id, user_id, media_id, faces_detected (int),
  -- primary_emotion, confidence_score, scene_description,
  -- detected_activities (jsonb), detected_objects (jsonb),
  -- location_context, event_type, analyzed_at
  ```
- [ ] Create migration for `facial_features` table
  ```sql
  -- Fields: id, user_id, photo_id, face_index,
  -- landmarks (jsonb), age_estimate, gender_estimate,
  -- emotion, emotion_confidence, created_at
  ```
- [ ] Create migration for `expression_timeline` table
  ```sql
  -- Fields: id, user_id, date, dominant_emotion,
  -- emotion_distribution (jsonb), photo_count, created_at
  ```
- [ ] Create migration for `visual_profile` table
  ```sql
  -- Fields: id, user_id, typical_expressions (jsonb),
  -- style_descriptors (jsonb), environment_preferences (jsonb),
  -- updated_at
  ```

### 3.3 Photo Analysis Pipeline

- [ ] Create background job to analyze new photos
- [ ] Implement face detection and cropping
- [ ] Implement expression classification
- [ ] Implement scene understanding
- [ ] Store analysis results in database
- [ ] Link analysis to personality profile

### 3.4 Video Processing (Future Phase)

- [ ] Research video processing options (RunwayML, custom FFmpeg)
- [ ] Create `supabase/functions/extract-video-frames/index.ts`
- [ ] Implement key frame extraction
- [ ] Analyze extracted frames
- [ ] Create video metadata table

### 3.5 Expression Timeline UI

- [ ] Create `/src/components/ExpressionTimeline.tsx`
- [ ] Display emotion trends over time
- [ ] Show photo samples for each emotion
- [ ] Correlate with health data (mood vs sleep)

### 3.6 Visual Profile Dashboard

- [ ] Create `/src/components/VisualProfile.tsx`
- [ ] Show aggregated visual analysis
- [ ] Display typical expressions pie chart
- [ ] Show style/environment preferences
- [ ] Privacy controls for visual data

### 3.7 3D Avatar System (Future Phase)

- [ ] Research 3D avatar services (Meshy, Ready Player Me)
- [ ] Create `supabase/functions/generate-avatar/index.ts`
- [ ] Create `avatar_models` table
- [ ] Implement avatar viewer component (Three.js/Babylon.js)
- [ ] Implement voice synthesis integration (ElevenLabs)

### 3.8 Privacy & Consent

- [ ] Add visual data consent to onboarding
- [ ] Implement visual data deletion
- [ ] Add granular permissions (face analysis on/off)
- [ ] Create visual data export

---

## Phase 4: Legacy & Family Access

**Priority:** 🟡 High
**Estimated Scope:** 20-25 tasks
**Dependencies:** Phase 2 (notifications)

### 4.1 Death Trigger Mechanism

- [ ] Create migration for `life_status` table
  ```sql
  -- Fields: user_id, status (alive/deceased/unknown),
  -- last_heartbeat, heartbeat_interval_days,
  -- death_certificate_url, death_verified_at,
  -- verified_by (user_id of verifier)
  ```
- [ ] Create `supabase/functions/record-heartbeat/index.ts`
- [ ] Create `supabase/functions/check-heartbeat-timeout/index.ts` (cron)
- [ ] Create `supabase/functions/submit-death-certificate/index.ts`
- [ ] Create `supabase/functions/verify-death/index.ts` (admin)
- [ ] Implement heartbeat timeout auto-trigger

### 4.2 Beneficiary Access Policies

- [ ] Update RLS policies for `vault_items` - allow beneficiary read
- [ ] Update RLS policies for `archetypal_ais` - allow beneficiary read
- [ ] Update RLS policies for `daily_question_responses` - allow beneficiary read
- [ ] Create `supabase/functions/claim-beneficiary-access/index.ts`
- [ ] Create beneficiary authentication flow (email verification)

### 4.3 Family Engram Access

- [ ] Add `shared_with_family` boolean to `archetypal_ais`
- [ ] Create RLS policy for family access to engrams
- [ ] Update `engram-chat` to allow family member queries
- [ ] Add context: "You are speaking with [user]'s family member"
- [ ] Implement family-safe response filtering

### 4.4 Notification to Beneficiaries

- [ ] Create email template: "You've been named as beneficiary"
- [ ] Create email template: "A vault item has been unlocked"
- [ ] Create email template: "Legacy message delivered"
- [ ] Implement SMS notification option for urgent items
- [ ] Create beneficiary notification preferences

### 4.5 Public Memorial Features

- [ ] Add `public_url_token` to `vault_items` for MEMORIAL type
- [ ] Create `/src/pages/PublicMemorial.tsx` - Public memorial page
- [ ] Create `supabase/functions/get-public-memorial/index.ts`
- [ ] Implement guest book / condolence submission
- [ ] Implement photo gallery for memorials
- [ ] Add QR code generation for memorial URLs

### 4.6 Voice/Audio Legacy

- [ ] Create `/src/components/VoiceRecorder.tsx` - Audio recording
- [ ] Create `supabase/functions/save-voice-recording/index.ts`
- [ ] Add voice recording option to vault items
- [ ] Implement "voice will" feature
- [ ] Create audio message player for beneficiaries

### 4.7 Digital Will Features

- [ ] Create `/src/components/DigitalWillBuilder.tsx`
- [ ] Add digital asset inventory section
- [ ] Add password/account instructions (encrypted)
- [ ] Add executor instructions
- [ ] Implement document attachment

### 4.8 Family Dashboard

- [ ] Create `/src/pages/FamilyPortal.tsx` - For beneficiaries
- [ ] Show accessible vault items
- [ ] Show shared engrams
- [ ] Show memorial pages
- [ ] Implement access analytics (who viewed what)

### 4.9 Encryption & Security

- [ ] Implement encryption key generation for vault items
- [ ] Create key distribution mechanism to beneficiaries
- [ ] Add decryption UI for beneficiaries
- [ ] Implement audit logging for all family access

---

## Phase 5: Career Agent Deployment

**Priority:** 🟢 Ready to Deploy
**Estimated Scope:** 5 tasks
**Dependencies:** None (already implemented)

### 5.1 Database

- [ ] Apply migration: `supabase db push` or run `20260102100000_create_career_agent_system.sql`

### 5.2 Edge Functions

- [ ] Deploy: `supabase functions deploy career-chat`
- [ ] Deploy: `supabase functions deploy career-profile-update`
- [ ] Verify `OPENAI_API_KEY` is set in Supabase secrets

### 5.3 Testing

- [ ] Test authenticated career chat flow
- [ ] Test public career chat with token
- [ ] Test profile creation and editing
- [ ] Test goal creation via chat
- [ ] Test lead capture for visitors

### 5.4 Navigation (Optional)

- [ ] Add "Career" link to main navigation menu
- [ ] Add Career card to user portal/dashboard

---

## Appendix A: File Locations Reference

### New Files to Create

```
src/pages/
├── Onboarding.tsx
├── PublicMemorial.tsx
├── FamilyPortal.tsx

src/components/
├── onboarding/
│   ├── OnboardingProgress.tsx
│   ├── WelcomeStep.tsx
│   ├── MeetRaphaelStep.tsx
│   ├── HealthProfileStep.tsx
│   ├── HealthConnectionStep.tsx
│   ├── MediaPermissionsStep.tsx
│   ├── FirstEngramStep.tsx
│   └── OnboardingComplete.tsx
├── NotificationSettings.tsx
├── ExpressionTimeline.tsx
├── VisualProfile.tsx
├── VoiceRecorder.tsx
├── DigitalWillBuilder.tsx

supabase/functions/
├── onboarding-status/index.ts
├── save-health-demographics/index.ts
├── send-push-notification/index.ts
├── trigger-health-alert/index.ts
├── trigger-engagement-nudge/index.ts
├── send-email/index.ts
├── analyze-photo/index.ts
├── record-heartbeat/index.ts
├── check-heartbeat-timeout/index.ts
├── submit-death-certificate/index.ts
├── claim-beneficiary-access/index.ts
├── get-public-memorial/index.ts
├── save-voice-recording/index.ts

supabase/migrations/
├── YYYYMMDDHHMMSS_create_health_demographics.sql
├── YYYYMMDDHHMMSS_create_onboarding_status.sql
├── YYYYMMDDHHMMSS_create_notification_system.sql
├── YYYYMMDDHHMMSS_create_visual_analysis_system.sql
├── YYYYMMDDHHMMSS_create_life_status_system.sql
├── YYYYMMDDHHMMSS_update_beneficiary_access_policies.sql
```

---

## Appendix B: Environment Variables Needed

```bash
# Push Notifications
FIREBASE_SERVER_KEY=xxx          # If using FCM
ONESIGNAL_APP_ID=xxx             # If using OneSignal
ONESIGNAL_API_KEY=xxx
PUSHOVER_USER_KEY=xxx            # If using Pushover
PUSHOVER_API_TOKEN=xxx

# Email Service
RESEND_API_KEY=xxx               # If using Resend
SENDGRID_API_KEY=xxx             # If using SendGrid

# AI Vision (may already exist)
OPENAI_API_KEY=xxx

# Voice Synthesis (future)
ELEVENLABS_API_KEY=xxx
```

---

## Appendix C: Estimated Effort

| Phase | Tasks | Complexity | Estimated Days |
|-------|-------|------------|----------------|
| Phase 1: Onboarding | 20 | Medium | 5-7 days |
| Phase 2: Notifications | 25 | High | 7-10 days |
| Phase 3: Visage | 30 | High | 10-14 days |
| Phase 4: Legacy | 25 | Medium | 7-10 days |
| Phase 5: Career Deploy | 5 | Low | 1 day |

**Total Estimated:** 30-42 days of development

---

## Progress Tracking

Use this section to track completion:

- [ ] Phase 1 Complete
- [ ] Phase 2 Complete
- [ ] Phase 3 Complete
- [ ] Phase 4 Complete
- [ ] Phase 5 Complete

**Overall Progress:** 0/105 tasks (0%)
