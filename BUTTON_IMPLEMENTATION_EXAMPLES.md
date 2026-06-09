# Button Implementation Examples

## Real-World Usage Examples for St. Raphael AI Platform

### 1. Form Submission

#### Basic Form with Primary Action
```tsx
import { useState } from 'react';
import Button, { ButtonGroup } from '@/components/Button';
import { Save } from 'lucide-react';

function UserProfileForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // API call
    await saveProfile();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <ButtonGroup className="justify-end mt-6">
        <Button
          variant="secondary"
          size="md"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          type="submit"
          loading={loading}
          icon={<Save className="w-5 h-5" />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </ButtonGroup>
    </form>
  );
}
```

### 2. Confirmation Dialogs

#### Delete Confirmation
```tsx
import Button, { ButtonGroup } from '@/components/Button';
import { Trash2, X } from 'lucide-react';

function DeleteConfirmationModal({ onConfirm, onCancel, itemName }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="modal">
      <h2>Delete {itemName}?</h2>
      <p>This action cannot be undone.</p>

      <ButtonGroup fullWidth className="mt-6">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={deleting}
        >
          No, Keep It
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={handleDelete}
          loading={deleting}
          icon={<Trash2 className="w-5 h-5" />}
        >
          Yes, Delete
        </Button>
      </ButtonGroup>
    </div>
  );
}
```

### 3. Navigation Actions

#### Dashboard Quick Actions
```tsx
import Button, { ButtonGroup } from '@/components/Button';
import { Plus, Upload, Download, Settings } from 'lucide-react';

function DashboardActions() {
  return (
    <ButtonGroup className="mb-6">
      <Button
        variant="primary"
        size="md"
        icon={<Plus className="w-5 h-5" />}
        onClick={onCreateNew}
      >
        New Patient
      </Button>
      <Button
        variant="secondary"
        size="md"
        icon={<Upload className="w-5 h-5" />}
        onClick={onImport}
      >
        Import
      </Button>
      <Button
        variant="secondary"
        size="md"
        icon={<Download className="w-5 h-5" />}
        onClick={onExport}
      >
        Export
      </Button>
      <IconButton
        icon={<Settings className="w-5 h-5" />}
        aria-label="Settings"
        variant="ghost"
        size="md"
        onClick={onSettings}
      />
    </ButtonGroup>
  );
}
```

### 4. Data Table Actions

#### Row Action Buttons
```tsx
import { IconButton, ButtonGroup } from '@/components/Button';
import { Edit, Trash2, Eye, MoreVertical } from 'lucide-react';

function TableRow({ item }) {
  return (
    <tr>
      <td>{item.name}</td>
      <td>{item.date}</td>
      <td>
        <ButtonGroup>
          <IconButton
            icon={<Eye className="w-4 h-4" />}
            aria-label="View details"
            variant="ghost"
            size="sm"
            onClick={() => onView(item.id)}
          />
          <IconButton
            icon={<Edit className="w-4 h-4" />}
            aria-label="Edit"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item.id)}
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            aria-label="Delete"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
          />
        </ButtonGroup>
      </td>
    </tr>
  );
}
```

### 5. Settings Panels

#### Notification Toggles
```tsx
import { ToggleButton } from '@/components/Button';
import { Bell, Mail, MessageSquare } from 'lucide-react';

function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  return (
    <div className="space-y-3">
      <ToggleButton
        active={pushEnabled}
        onToggle={setPushEnabled}
        icon={<Bell className="w-5 h-5" />}
        size="md"
      >
        Push Notifications
      </ToggleButton>

      <ToggleButton
        active={emailEnabled}
        onToggle={setEmailEnabled}
        icon={<Mail className="w-5 h-5" />}
        size="md"
      >
        Email Notifications
      </ToggleButton>

      <ToggleButton
        active={smsEnabled}
        onToggle={setSmsEnabled}
        icon={<MessageSquare className="w-5 h-5" />}
        size="md"
      >
        SMS Notifications
      </ToggleButton>
    </div>
  );
}
```

### 6. Floating Actions

#### Add Patient FAB
```tsx
import { FloatingActionButton } from '@/components/Button';
import { Plus } from 'lucide-react';

function PatientListPage() {
  return (
    <>
      {/* Page content */}

      <FloatingActionButton
        icon={<Plus className="w-6 h-6" />}
        variant="primary"
        position="bottom-right"
        aria-label="Add new patient"
        onClick={onAddPatient}
      />
    </>
  );
}
```

### 7. Segmented Controls

#### Time Period Selector
```tsx
import { ButtonGroup } from '@/components/Button';
import { useState } from 'react';

function TimePeriodSelector() {
  const [period, setPeriod] = useState('week');

  const periods = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' }
  ];

  return (
    <ButtonGroup attached>
      {periods.map(({ value, label }) => (
        <Button
          key={value}
          variant={period === value ? 'primary' : 'tertiary'}
          size="sm"
          onClick={() => setPeriod(value)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
```

### 8. Loading States

#### Async Data Fetch
```tsx
import Button from '@/components/Button';
import { RefreshCw } from 'lucide-react';

function DataRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLatestData();
    setRefreshing(false);
  };

  return (
    <Button
      variant="secondary"
      size="md"
      icon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
      loading={refreshing}
      onClick={handleRefresh}
    >
      {refreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
}
```

### 9. Upload Actions

#### File Upload with Progress
```tsx
import Button from '@/components/Button';
import { Upload, Check } from 'lucide-react';

function FileUploadButton() {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    await uploadFile();
    setUploading(false);
    setUploaded(true);
  };

  return (
    <Button
      variant={uploaded ? 'success' : 'primary'}
      size="md"
      icon={uploaded ? <Check className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
      loading={uploading}
      onClick={handleUpload}
      disabled={uploaded}
    >
      {uploaded ? 'Uploaded' : uploading ? 'Uploading...' : 'Upload File'}
    </Button>
  );
}
```

### 10. Multi-Step Wizards

#### Wizard Navigation
```tsx
import { ButtonGroup } from '@/components/Button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

function WizardNavigation({ currentStep, totalSteps, onNext, onPrev, onComplete }) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <ButtonGroup className="justify-between mt-8">
      <Button
        variant="ghost"
        size="md"
        icon={<ChevronLeft className="w-5 h-5" />}
        onClick={onPrev}
        disabled={isFirstStep}
      >
        Previous
      </Button>

      <span className="text-gray-400 self-center">
        Step {currentStep + 1} of {totalSteps}
      </span>

      {isLastStep ? (
        <Button
          variant="success"
          size="md"
          icon={<Check className="w-5 h-5" />}
          iconPosition="right"
          onClick={onComplete}
        >
          Complete
        </Button>
      ) : (
        <Button
          variant="primary"
          size="md"
          icon={<ChevronRight className="w-5 h-5" />}
          iconPosition="right"
          onClick={onNext}
        >
          Next
        </Button>
      )}
    </ButtonGroup>
  );
}
```

### 11. Toolbar with Icon Buttons

#### Rich Text Editor Toolbar
```tsx
import { ButtonGroup, IconButton } from '@/components/Button';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered
} from 'lucide-react';

function EditorToolbar({ formats, onFormatChange }) {
  return (
    <div className="border-b border-gray-700 p-2">
      <ButtonGroup>
        {/* Text Formatting */}
        <IconButton
          icon={<Bold className="w-4 h-4" />}
          aria-label="Bold"
          variant={formats.bold ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onFormatChange('bold')}
        />
        <IconButton
          icon={<Italic className="w-4 h-4" />}
          aria-label="Italic"
          variant={formats.italic ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onFormatChange('italic')}
        />
        <IconButton
          icon={<Underline className="w-4 h-4" />}
          aria-label="Underline"
          variant={formats.underline ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onFormatChange('underline')}
        />

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Alignment */}
        <IconButton
          icon={<AlignLeft className="w-4 h-4" />}
          aria-label="Align left"
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<AlignCenter className="w-4 h-4" />}
          aria-label="Align center"
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<AlignRight className="w-4 h-4" />}
          aria-label="Align right"
          variant="ghost"
          size="sm"
        />

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Lists */}
        <IconButton
          icon={<List className="w-4 h-4" />}
          aria-label="Bullet list"
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<ListOrdered className="w-4 h-4" />}
          aria-label="Numbered list"
          variant="ghost"
          size="sm"
        />
      </ButtonGroup>
    </div>
  );
}
```

### 12. Call-to-Action Section

#### Hero CTA
```tsx
import { ButtonGroup } from '@/components/Button';
import { Play, BookOpen } from 'lucide-react';

function HeroCTA() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-white mb-6">
        Transform Healthcare with AI
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        St. Raphael AI - Your personalized health companion
      </p>

      <ButtonGroup className="justify-center">
        <Button
          variant="primary"
          size="xl"
          icon={<Play className="w-6 h-6" />}
          onClick={onGetStarted}
        >
          Get Started Free
        </Button>
        <Button
          variant="secondary"
          size="xl"
          icon={<BookOpen className="w-6 h-6" />}
          onClick={onLearnMore}
        >
          Learn More
        </Button>
      </ButtonGroup>
    </div>
  );
}
```

### 13. Authentication Flow

#### Login Form Buttons
```tsx
import Button, { ButtonGroup } from '@/components/Button';
import { LogIn, UserPlus } from 'lucide-react';

function LoginForm() {
  const [logging, setLogging] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLogging(true);
    await authenticate();
    setLogging(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {/* Email and password inputs */}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        type="submit"
        loading={logging}
        icon={<LogIn className="w-5 h-5" />}
      >
        {logging ? 'Signing In...' : 'Sign In'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-900 text-gray-400">Or</span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        icon={<UserPlus className="w-5 h-5" />}
        onClick={onSignUp}
      >
        Create Account
      </Button>
    </form>
  );
}
```

### 14. Filter and Sort Controls

#### Data Filtering
```tsx
import { ButtonGroup, IconButton } from '@/components/Button';
import { Filter, SortAsc, SortDesc, X } from 'lucide-react';

function FilterControls({ filters, onClear }) {
  const [sortOrder, setSortOrder] = useState('asc');

  return (
    <div className="flex items-center justify-between mb-4">
      <ButtonGroup>
        <Button
          variant="tertiary"
          size="sm"
          icon={<Filter className="w-4 h-4" />}
        >
          Filter
        </Button>
        <IconButton
          icon={sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          variant="tertiary"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />
      </ButtonGroup>

      {filters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          icon={<X className="w-4 h-4" />}
          onClick={onClear}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
```

### 15. Responsive Mobile Menu

#### Mobile Action Sheet
```tsx
import Button from '@/components/Button';
import { Settings, User, HelpCircle, LogOut } from 'lucide-react';

function MobileMenuSheet({ onClose }) {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-gray-800 rounded-t-2xl p-4 space-y-2">
      <Button
        variant="ghost"
        size="lg"
        fullWidth
        icon={<User className="w-5 h-5" />}
        onClick={onProfile}
      >
        My Profile
      </Button>
      <Button
        variant="ghost"
        size="lg"
        fullWidth
        icon={<Settings className="w-5 h-5" />}
        onClick={onSettings}
      >
        Settings
      </Button>
      <Button
        variant="ghost"
        size="lg"
        fullWidth
        icon={<HelpCircle className="w-5 h-5" />}
        onClick={onHelp}
      >
        Help & Support
      </Button>
      <Button
        variant="danger"
        size="lg"
        fullWidth
        icon={<LogOut className="w-5 h-5" />}
        onClick={onLogout}
      >
        Sign Out
      </Button>

      <Button
        variant="secondary"
        size="md"
        fullWidth
        onClick={onClose}
      >
        Cancel
      </Button>
    </div>
  );
}
```

## Best Practices Summary

### DO:
✅ Use loading states for async operations
✅ Provide proper aria-labels for icon-only buttons
✅ Use appropriate variants for context (danger for destructive actions)
✅ Disable buttons during processing
✅ Group related buttons together
✅ Use icons to enhance understanding
✅ Test keyboard navigation

### DON'T:
❌ Use multiple primary buttons in same context
❌ Forget to handle loading states
❌ Make buttons too small on mobile
❌ Remove focus indicators
❌ Use color alone to convey state
❌ Nest buttons inside other interactive elements

---

**For More Examples:** See `ButtonShowcase.tsx` for live interactive demonstrations
