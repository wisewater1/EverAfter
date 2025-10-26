# Unified Chat Interface - Wireframe & Mockup

## 📐 Visual Wireframe

### View 1: Hub View (Conversation List)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chat Hub                                            [Settings Icon] │
│  Conversations with your AI assistants                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [🔍 Search conversations...]                                        │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [All ✓] [Favorites ⭐] [Health 🏥] [AI Assistants 🤖]             │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ [🏥 Icon]       │  │ [🤖 Icon]       │  │ [🤖 Icon]       │    │
│  │                 │  │                 │  │                 │    │
│  │ St. Raphael  ●  │  │ Sophia        ● │  │ Marcus          │    │
│  │ Health Guardian │  │ Philosopher     │  │ Strategist      │    │
│  │                 │  │                 │  │                 │    │
│  │ "Your health    │  │ "Let's explore" │  │ "Ready to plan" │    │
│  │  insights..."   │  │  🕐 Yesterday   │  │  🕐 2 days ago  │    │
│  │ 🕐 2 hours ago  │  │                 │  │                 │    │
│  │             [⭐]│  │             [⭐]│  │             [⭐]│    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ [🤖 Icon]       │  │ [🤖 Icon]       │  │ [➕ Add New]    │    │
│  │                 │  │                 │  │                 │    │
│  │ Luna          ● │  │ Viktor          │  │ Create AI       │    │
│  │ Creative Mind   │  │ Analyst         │  │ Assistant       │    │
│  │                 │  │                 │  │                 │    │
│  │ "I have an idea"│  │ "Analyzing..."  │  │                 │    │
│  │ 🕐 1 week ago   │  │ 🕐 2 weeks ago  │  │                 │    │
│  │             [⭐]│  │             [⭐]│  │                 │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### View 2: Chat View (Individual Conversation)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [← Back to Chats]        [🏥] St. Raphael               [⭐]       │
│                           Health Guardian                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                       Chat Component                             ││
│  │                    (Dynamic: RaphaelChat,                        ││
│  │              ArchetypalAIChat, or EngramChat)                    ││
│  │                                                                   ││
│  │  ┌─────────────────────────────────────────────────┐           ││
│  │  │ User: How is my glucose trending today?         │           ││
│  │  │ 🕐 10:23 AM                                      │           ││
│  │  └─────────────────────────────────────────────────┘           ││
│  │                                                                   ││
│  │          ┌───────────────────────────────────────────────────┐  ││
│  │          │ AI: Your glucose is stable at 95 mg/dL. Great!   │  ││
│  │          │ Keep up the balanced diet. 🕐 10:24 AM          │  ││
│  │          └───────────────────────────────────────────────────┘  ││
│  │                                                                   ││
│  │  ┌─────────────────────────────────────────────────┐           ││
│  │  │ User: What about my activity levels?            │           ││
│  │  │ 🕐 10:25 AM                                      │           ││
│  │  └─────────────────────────────────────────────────┘           ││
│  │                                                                   ││
│  │          ┌───────────────────────────────────────────────────┐  ││
│  │          │ AI: You've hit 8,234 steps today - excellent!    │  ││
│  │          │ Just 766 more for your goal. 🕐 10:26 AM        │  ││
│  │          └───────────────────────────────────────────────────┘  ││
│  │                                                                   ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │ [Type your message...]                         [Send →]   │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │                                                                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Annotated Mockup - Hub View

### Header Section
```
┌─────────────────────────────────────────────────────────────────────┐
│  Chat Hub                    ← [Title: 2xl font, bold, white]       │
│  Conversations with your AI assistants  ← [Subtitle: sm, slate-400] │
│                                                    [⚙️] ← [Settings] │
└─────────────────────────────────────────────────────────────────────┘
     ↑                                                      ↑
     Primary heading                              Secondary action
     with context text                           (hover: bg change)
```

### Search Bar
```
┌─────────────────────────────────────────────────────────────────────┐
│  [🔍] Search conversations...                                        │
│   ↑         ↑                                                        │
│  Icon   Placeholder text (slate-500)                                │
│         Real-time filtering                                          │
│         Focus: emerald border + ring                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Filter Chips
```
┌─────────────────────────────────────────────────────────────────────┐
│  [All ✓] [Favorites ⭐] [Health 🏥] [AI Assistants 🤖]             │
│    ↑         ↑             ↑              ↑                          │
│  Active   Favorites      Health         Custom                      │
│  State    Filter        Filter          AIs                         │
│  (emerald (amber        (emerald        (violet                     │
│   bg)     star)         gradient)       gradient)                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Conversation Card (Detailed Anatomy)
```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐                                                │
│  │ [AI Avatar]     │  ← [Icon in gradient background]              │
│  │  48×48px        │     Color coded by type                        │
│  │  Rounded 12px   │     - Raphael: emerald→teal                    │
│  │                 │     - Archetypal: violet→fuchsia               │
│  ├─────────────────┤                                                │
│  │                 │                                      [⭐]       │
│  │ AI Name       ● │  ← [White, font-medium]    Status dot  Star   │
│  │ Archetype       │  ← [Slate-400, text-xs]     (Active) (Fav)    │
│  │                 │                                                │
│  │ "Last message   │  ← [Slate-400, 2 lines max]                   │
│  │  preview here"  │     Truncate with ellipsis                     │
│  │ 🕐 Timestamp    │  ← [Slate-500, text-xs]                       │
│  │                 │                                                │
│  └─────────────────┘                                                │
│       ↑                                                              │
│   Hover effect: border color change, bg lighten                     │
│   Click: Navigate to chat view                                      │
│   Star click: Toggle favorite (stops propagation)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Annotated Mockup - Chat View

### Chat Header
```
┌─────────────────────────────────────────────────────────────────────┐
│  [← Back to Chats]  [🏥] St. Raphael        [⭐]                    │
│                          Health Guardian                             │
│   ↑                  ↑         ↑            ↑                        │
│   Back button      Icon     AI Name      Favorite                   │
│   (slate-800)      (48px)   (white)      (amber when active)        │
│                            Archetype                                 │
│                            (slate-400)                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Chat Container
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Dynamic Chat Component Loads Here]                                │
│                                                                       │
│  Based on conversation type:                                         │
│  - type: 'raphael' → <RaphaelChat />                                │
│  - type: 'archetypal' → <ArchetypalAIChat preselectedAIId={id} />  │
│  - type: 'engram' → <EngramChat engramId={id} />                    │
│                                                                       │
│  Component handles:                                                  │
│  - Message rendering                                                 │
│  - Input field                                                       │
│  - Send functionality                                                │
│  - Typing indicators                                                 │
│  - Scroll behavior                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile Wireframe

### Hub View (Mobile)
```
┌───────────────────────────┐
│  Chat Hub         [⚙️]    │
│  Your conversations        │
├───────────────────────────┤
│  [🔍 Search...]           │
├───────────────────────────┤
│  [All] [⭐] [🏥] [🤖] →  │
├───────────────────────────┤
│  ┌─────────────────────┐  │
│  │ [🏥] St. Raphael ● │  │
│  │ Health Guardian     │  │
│  │ "Your health..."    │  │
│  │ 🕐 2h ago       [⭐]│  │
│  └─────────────────────┘  │
│                            │
│  ┌─────────────────────┐  │
│  │ [🤖] Sophia       ● │  │
│  │ Philosopher         │  │
│  │ "Let's explore"     │  │
│  │ 🕐 Yesterday    [⭐]│  │
│  └─────────────────────┘  │
│                            │
│  ┌─────────────────────┐  │
│  │ [🤖] Marcus         │  │
│  │ Strategist          │  │
│  │ "Ready to plan"     │  │
│  │ 🕐 2 days ago   [⭐]│  │
│  └─────────────────────┘  │
│                            │
└───────────────────────────┘
     ↑
Single column
Full width cards
Touch optimized
```

### Chat View (Mobile)
```
┌───────────────────────────┐
│ [←] St. Raphael      [⭐] │
│     Health Guardian        │
├───────────────────────────┤
│                            │
│  User message bubble       │
│  Right aligned             │
│                            │
│        AI response         │
│        Left aligned        │
│        With avatar         │
│                            │
│  User message bubble       │
│  Right aligned             │
│                            │
│        AI response         │
│        Left aligned        │
│                            │
├───────────────────────────┤
│ [Type message...] [Send]  │
└───────────────────────────┘
     ↑
Full screen chat
Bottom input fixed
Swipe to go back
```

---

## 🎯 Interaction States

### Card Hover/Focus States
```
Default State:
┌─────────────────┐
│ bg-slate-800/30 │
│ border-slate-   │
│   700/30        │
└─────────────────┘

Hover State:
┌─────────────────┐
│ bg-slate-800/50 │  ← Background lightens
│ border-slate-   │  ← Border strengthens
│   600/50        │
│ [⭐] appears    │  ← Favorite star fades in
└─────────────────┘

Active/Selected State:
┌─────────────────┐
│ border-emerald- │  ← Border color changes
│   500/50        │
│ ring-emerald-   │  ← Ring appears
│   500/20        │
└─────────────────┘
```

### Filter Chip States
```
Inactive:
[All]
bg-slate-800/30
text-slate-400
border-slate-700/30

Active:
[All ✓]
bg-emerald-500/20
text-emerald-400
border-emerald-500/30
checkmark appears
```

### Search Bar States
```
Default:
┌─────────────────────────────┐
│ [🔍] Search conversations...│
│ border-slate-700/50         │
└─────────────────────────────┘

Focus:
┌─────────────────────────────┐
│ [🔍] |                       │
│ border-emerald-500/50       │
│ ring-emerald-500/20         │
└─────────────────────────────┘

With Input:
┌─────────────────────────────┐
│ [🔍] sophia          [×]    │
│ Real-time filtering active  │
└─────────────────────────────┘
```

---

## 🎨 Color Palette Reference

### Background Colors
```
Primary Background:    slate-950 → slate-900 (gradient)
Card Background:       slate-800/30 (default)
                      slate-800/50 (hover)
Card Border:          slate-700/30 (default)
                      slate-600/50 (hover)
```

### Text Colors
```
Primary Text:         white
Secondary Text:       slate-300
Tertiary Text:        slate-400
Muted Text:          slate-500
Disabled Text:       slate-600
```

### Accent Colors
```
Active/Selected:     emerald-400
Focus Ring:          emerald-500/20
Favorite:            amber-400
Online Status:       emerald-400
Unread Badge:        emerald-500
Error:               red-400
```

### Gradient Backgrounds
```
Raphael:             from-emerald-500 to-teal-500
Archetypal AI:       from-violet-500 to-fuchsia-500
Engram:              from-blue-500 to-cyan-500
```

---

## 📏 Spacing Grid

```
Component Spacing:
┌─────────────────────────────────────────┐
│ ← 24px padding →                        │
│                                          │
│  Content                                 │
│  ↕ 16px gap between sections            │
│  Content                                 │
│  ↕ 16px gap                              │
│  Content                                 │
│                                          │
│ ← 24px padding →                        │
└─────────────────────────────────────────┘

Card Grid:
┌───┐ ← 12px gap → ┌───┐ ← 12px gap → ┌───┐
│   │              │   │              │   │
│   │              │   │              │   │
└───┘              └───┘              └───┘
  ↕                  ↕                  ↕
12px gap           12px gap          12px gap
  ↕                  ↕                  ↕
┌───┐              ┌───┐              ┌───┐
│   │              │   │              │   │
└───┘              └───┘              └───┘
```

---

## 🔄 User Journey Map

### Journey 1: New User First Chat
```
Step 1: Dashboard
   ↓
Step 2: Click "Chat" tab
   ↓
Step 3: See conversation list (hub view)
   ↓
Step 4: See "St. Raphael" card (pre-loaded)
   ↓
Step 5: Click Raphael card
   ↓
Step 6: Chat opens with welcome message
   ↓
Step 7: Type first message
   ↓
Step 8: Receive response
   ✓ Success: User understands chat interface
```

### Journey 2: Returning User Quick Access
```
Step 1: Dashboard
   ↓
Step 2: Click "Chat" tab
   ↓
Step 3: Click "Favorites" filter
   ↓
Step 4: See only favorited conversations
   ↓
Step 5: Click favorite AI
   ↓
Step 6: Resume conversation immediately
   ✓ Success: Quick access to preferred AI
```

### Journey 3: Power User Search
```
Step 1: Dashboard → Chat tab
   ↓
Step 2: Type in search bar
   ↓
Step 3: Real-time filter results
   ↓
Step 4: Select from filtered list
   ↓
Step 5: Chat opens
   ✓ Success: Found specific conversation fast
```

---

## 📊 Layout Breakpoints

### Desktop (1024px+)
```
┌────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  Search                                                     │
│  Filters                                                    │
│  ┌────────┐  ┌────────┐  ┌────────┐  ← 3 columns         │
│  │ Card 1 │  │ Card 2 │  │ Card 3 │                       │
│  └────────┘  └────────┘  └────────┘                       │
│  ┌────────┐  ┌────────┐  ┌────────┐                       │
│  │ Card 4 │  │ Card 5 │  │ Card 6 │                       │
│  └────────┘  └────────┘  └────────┘                       │
└────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌──────────────────────────────────────────┐
│  Header                                   │
│  Search                                   │
│  Filters                                  │
│  ┌────────┐  ┌────────┐  ← 2 columns    │
│  │ Card 1 │  │ Card 2 │                  │
│  └────────┘  └────────┘                  │
│  ┌────────┐  ┌────────┐                  │
│  │ Card 3 │  │ Card 4 │                  │
│  └────────┘  └────────┘                  │
└──────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│  Header              │
│  Search              │
│  Filters (scroll →)  │
│  ┌────────────────┐  │
│  │    Card 1      │  │ ← 1 column
│  └────────────────┘  │   Full width
│  ┌────────────────┐  │
│  │    Card 2      │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │    Card 3      │  │
│  └────────────────┘  │
└──────────────────────┘
```

---

## 🎯 Component Hierarchy

```
UnifiedChatInterface
│
├─ Hub View (viewMode === 'list')
│  │
│  ├─ Header Section
│  │  ├─ Title & Subtitle
│  │  └─ Settings Button
│  │
│  ├─ Search Section
│  │  └─ Search Input with Icon
│  │
│  ├─ Filter Section
│  │  ├─ All Filter Chip
│  │  ├─ Favorites Filter Chip
│  │  ├─ Health Filter Chip
│  │  └─ AI Assistants Filter Chip
│  │
│  ├─ Conversation Grid
│  │  ├─ Raphael Card
│  │  │  ├─ Avatar (gradient icon)
│  │  │  ├─ Name & Status
│  │  │  ├─ Archetype Label
│  │  │  ├─ Last Message Preview
│  │  │  ├─ Timestamp
│  │  │  └─ Favorite Star (hover)
│  │  │
│  │  └─ Archetypal AI Cards (map)
│  │     ├─ Avatar (gradient icon)
│  │     ├─ Name & Status
│  │     ├─ Archetype Label
│  │     ├─ Last Message Preview
│  │     ├─ Timestamp
│  │     └─ Favorite Star (hover)
│  │
│  └─ Settings Panel (conditional)
│     ├─ Typing Indicators Toggle
│     ├─ Sound Notifications Toggle
│     └─ Auto-save Toggle
│
└─ Chat View (viewMode === 'chat')
   │
   ├─ Chat Header
   │  ├─ Back Button
   │  ├─ AI Info (icon, name, archetype)
   │  └─ Favorite Button
   │
   └─ Chat Component Container
      └─ Dynamic Component
         ├─ RaphaelChat (if type === 'raphael')
         ├─ ArchetypalAIChat (if type === 'archetypal')
         └─ EngramChat (if type === 'engram')
```

---

## ✅ Design Checklist

### Visual Design
- ✅ Consistent color scheme across all components
- ✅ Clear visual hierarchy (primary, secondary, tertiary)
- ✅ Adequate contrast ratios (WCAG AA)
- ✅ Readable typography at all sizes
- ✅ Appropriate spacing and padding
- ✅ Smooth transitions and animations

### Interaction Design
- ✅ Clear affordances (buttons look clickable)
- ✅ Immediate feedback on actions
- ✅ Logical navigation flow
- ✅ Consistent interaction patterns
- ✅ Error prevention and recovery
- ✅ Keyboard navigation support

### Responsive Design
- ✅ Works on all screen sizes
- ✅ Touch-optimized for mobile
- ✅ Appropriate breakpoints
- ✅ Flexible grid layouts
- ✅ Readable on small screens
- ✅ Efficient use of space

### Accessibility
- ✅ Semantic HTML structure
- ✅ ARIA labels where needed
- ✅ Keyboard accessible
- ✅ Screen reader friendly
- ✅ Focus indicators visible
- ✅ Color not sole indicator

### Performance
- ✅ Fast initial load
- ✅ Smooth scrolling
- ✅ Efficient re-renders
- ✅ Lazy loading where appropriate
- ✅ Optimized images
- ✅ Minimal bundle size

---

**Wireframe Status:** ✅ Complete
**Mockup Status:** ✅ Annotated
**Implementation Status:** ✅ Built
**Testing Status:** ✅ Verified
