# Remove Button Component - Implementation Guide

## Overview

A comprehensive, reusable remove button component with confirmation dialog, error handling, and multiple styling variants. Fully integrated with your Supabase backend and design system.

## Features

✅ **Confirmation Dialog** - Prevents accidental deletions
✅ **Multiple Variants** - Icon, button, or text styles
✅ **Size Options** - Small, medium, or large
✅ **Error Handling** - Displays errors inline in confirmation modal
✅ **Loading States** - Shows spinner during removal
✅ **Async Support** - Handles promises from Supabase
✅ **Accessibility** - ARIA labels and keyboard navigation
✅ **Customizable** - Props for all common use cases
✅ **Type Safe** - Full TypeScript support

---

## Quick Start

### Basic Usage

```tsx
import RemoveButton from '../components/RemoveButton';
import { supabase } from '../lib/supabase';

function MyComponent() {
  const handleRemove = async () => {
    const { error } = await supabase
      .from('my_table')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  };

  return (
    <RemoveButton
      onRemove={handleRemove}
      itemName="My Item"
      itemType="item"
    />
  );
}
```

---

## Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onRemove` | `() => Promise<void> \| void` | **Required** | Function to execute when removal is confirmed |
| `itemName` | `string` | `'this item'` | Name of item being removed (shown in confirmation) |
| `itemType` | `string` | `'item'` | Type of item (e.g., 'connection', 'goal', 'member') |
| `confirmationMessage` | `string` | Auto-generated | Custom confirmation message |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `variant` | `'icon' \| 'button' \| 'text'` | `'icon'` | Button style variant |
| `disabled` | `boolean` | `false` | Disable the button |
| `className` | `string` | `''` | Additional CSS classes |
| `showConfirmation` | `boolean` | `true` | Show confirmation dialog before removing |

---

## Variants

### Icon Variant (Default)
Small icon button with trash icon - perfect for inline removal

```tsx
<RemoveButton
  onRemove={handleRemove}
  variant="icon"
  size="md"
/>
```

**Appearance:** 🗑️ (icon only, red background)

### Button Variant
Full button with text and icon - prominent removal action

```tsx
<RemoveButton
  onRemove={handleRemove}
  variant="button"
  size="md"
/>
```

**Appearance:** 🗑️ Remove (gradient red button)

### Text Variant
Text-only link style - subtle removal option

```tsx
<RemoveButton
  onRemove={handleRemove}
  variant="text"
  size="sm"
/>
```

**Appearance:** Remove (red text link)

---

## Size Options

### Small (`sm`)
```tsx
<RemoveButton size="sm" ... />
```
- Icon: 12px (w-3 h-3)
- Padding: 4px (p-1)
- Font: text-xs

### Medium (`md`) - Default
```tsx
<RemoveButton size="md" ... />
```
- Icon: 16px (w-4 h-4)
- Padding: 8px (p-2)
- Font: text-sm

### Large (`lg`)
```tsx
<RemoveButton size="lg" ... />
```
- Icon: 20px (w-5 h-5)
- Padding: 12px (p-3)
- Font: text-base

---

## Common Use Cases

### 1. Remove Health Connection

```tsx
import RemoveButton from '../components/RemoveButton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function ConnectionCard({ connection }) {
  const { user } = useAuth();

  const handleRemoveConnection = async () => {
    const { error } = await supabase
      .from('provider_accounts')
      .delete()
      .eq('id', connection.id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Refresh connections or update state
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
      <div>
        <h3 className="text-white">{connection.provider}</h3>
        <p className="text-sm text-slate-400">Connected</p>
      </div>
      <RemoveButton
        onRemove={handleRemoveConnection}
        itemName={connection.provider}
        itemType="connection"
        confirmationMessage={`Disconnect ${connection.provider}? You'll need to reconnect to sync data again.`}
        variant="icon"
        size="md"
      />
    </div>
  );
}
```

### 2. Remove Family Member

```tsx
function FamilyMemberCard({ member, onRemove }) {
  const { user } = useAuth();

  const handleRemove = async () => {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', member.id)
      .eq('user_id', user.id);

    if (error) throw error;

    onRemove(member.id);
  };

  return (
    <div className="relative group bg-slate-800/50 rounded-xl p-6">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <RemoveButton
          onRemove={handleRemove}
          itemName={member.name}
          itemType="family member"
          variant="icon"
          size="sm"
        />
      </div>
      {/* Member content */}
    </div>
  );
}
```

### 3. Remove Health Goal

```tsx
function HealthGoalItem({ goal, onRemove }) {
  const { user } = useAuth();

  const handleRemove = async () => {
    const { error } = await supabase
      .from('health_goals')
      .delete()
      .eq('id', goal.id)
      .eq('user_id', user.id);

    if (error) throw error;

    onRemove(goal.id);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
      <div className="flex-1">
        <h4 className="text-white">{goal.title}</h4>
        <p className="text-sm text-slate-400">{goal.description}</p>
      </div>
      <RemoveButton
        onRemove={handleRemove}
        itemName={`"${goal.title}"`}
        itemType="health goal"
        variant="icon"
        size="md"
      />
    </div>
  );
}
```

### 4. Remove Emergency Contact

```tsx
function EmergencyContactCard({ contact, onRemove }) {
  const { user } = useAuth();

  const handleRemove = async () => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contact.id)
      .eq('user_id', user.id);

    if (error) throw error;

    onRemove(contact.id);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg">
      <div>
        <h4 className="text-white">{contact.name}</h4>
        <p className="text-sm text-slate-400">{contact.phone}</p>
      </div>
      <RemoveButton
        onRemove={handleRemove}
        itemName={contact.name}
        itemType="emergency contact"
        variant="button"
        size="sm"
      />
    </div>
  );
}
```

### 5. Remove Archetypal AI

```tsx
function ArchetypalAICard({ ai, onRemove }) {
  const { user } = useAuth();

  const handleRemove = async () => {
    // Remove related conversations first
    const { error: convError } = await supabase
      .from('archetypal_conversations')
      .delete()
      .eq('archetypal_ai_id', ai.id);

    if (convError) throw convError;

    // Remove the AI
    const { error } = await supabase
      .from('archetypal_ais')
      .delete()
      .eq('id', ai.id)
      .eq('user_id', user.id);

    if (error) throw error;

    onRemove(ai.id);
  };

  return (
    <div className="relative group bg-violet-500/10 rounded-xl p-6">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <RemoveButton
          onRemove={handleRemove}
          itemName={ai.name}
          itemType="AI assistant"
          confirmationMessage={`Remove ${ai.name}? All conversation history will be permanently deleted.`}
          variant="icon"
          size="sm"
        />
      </div>
      {/* AI content */}
    </div>
  );
}
```

### 6. Quick Remove (No Confirmation)

For non-critical items or undo-able actions:

```tsx
function TodoItem({ item, onRemove }) {
  const handleQuickRemove = () => {
    onRemove(item.id);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
      <span className="text-white">{item.text}</span>
      <RemoveButton
        onRemove={handleQuickRemove}
        itemName={item.text}
        showConfirmation={false}
        variant="icon"
        size="sm"
      />
    </div>
  );
}
```

---

## Error Handling

The RemoveButton component automatically handles errors:

1. **Try-Catch**: Wraps the `onRemove` function
2. **Display**: Shows error message in confirmation modal
3. **Retry**: User can try again without closing modal

```tsx
const handleRemove = async () => {
  const { error } = await supabase
    .from('my_table')
    .delete()
    .eq('id', itemId);

  // If error occurs, throw it - RemoveButton will catch and display
  if (error) throw error;

  // On success, modal closes automatically
};
```

---

## Styling & Customization

### Custom Classes

```tsx
<RemoveButton
  onRemove={handleRemove}
  className="ml-4 shadow-xl"
  variant="icon"
/>
```

### Size Customization

The component uses Tailwind CSS classes. Sizes are predefined but you can override with `className`:

```tsx
<RemoveButton
  onRemove={handleRemove}
  size="md"
  className="p-4 w-12 h-12" // Override padding and size
/>
```

### Color Scheme

Default: Red theme for destructive actions
- Background: `bg-red-500/10`
- Hover: `hover:bg-red-500/20`
- Text: `text-red-400`
- Border: `border-red-500/20`

All colors follow your app's design system using Tailwind CSS.

---

## Best Practices

### 1. Always Use Confirmation for Permanent Actions

```tsx
// ✅ Good - Shows confirmation
<RemoveButton
  onRemove={handlePermanentDelete}
  showConfirmation={true}
/>

// ❌ Bad - No confirmation for permanent action
<RemoveButton
  onRemove={handlePermanentDelete}
  showConfirmation={false}
/>
```

### 2. Provide Clear Item Names

```tsx
// ✅ Good - Specific name
<RemoveButton
  itemName="Terra Health Connection"
  itemType="connection"
/>

// ❌ Bad - Generic name
<RemoveButton
  itemName="item"
  itemType="thing"
/>
```

### 3. Handle State Updates

```tsx
// ✅ Good - Updates state after removal
const handleRemove = async () => {
  await supabase.from('items').delete().eq('id', id);
  setItems(prev => prev.filter(item => item.id !== id));
};

// ❌ Bad - State not updated, UI out of sync
const handleRemove = async () => {
  await supabase.from('items').delete().eq('id', id);
  // UI still shows deleted item
};
```

### 4. Add User Context

```tsx
// ✅ Good - Checks authentication
const { user } = useAuth();
const handleRemove = async () => {
  if (!user?.id) throw new Error('Not authenticated');
  await supabase.from('items').delete()
    .eq('id', id)
    .eq('user_id', user.id); // RLS protection
};

// ❌ Bad - No auth check
const handleRemove = async () => {
  await supabase.from('items').delete().eq('id', id);
};
```

### 5. Cascade Deletions

When removing items with relationships:

```tsx
const handleRemove = async () => {
  // Remove child records first
  await supabase
    .from('child_table')
    .delete()
    .eq('parent_id', parentId);

  // Then remove parent
  await supabase
    .from('parent_table')
    .delete()
    .eq('id', parentId);
};
```

---

## Accessibility

The RemoveButton component includes:

- **ARIA Labels**: `aria-label` for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Focus rings on keyboard navigation
- **Disabled States**: Proper disabled attribute and styling
- **Modal Accessibility**: ESC to close, focus trap

---

## Testing

### Unit Test Example

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RemoveButton from './RemoveButton';

test('shows confirmation dialog on click', () => {
  const mockRemove = jest.fn();
  render(<RemoveButton onRemove={mockRemove} itemName="Test Item" />);

  const button = screen.getByRole('button');
  fireEvent.click(button);

  expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
});

test('calls onRemove when confirmed', async () => {
  const mockRemove = jest.fn();
  render(<RemoveButton onRemove={mockRemove} itemName="Test Item" />);

  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByText('Remove'));

  await waitFor(() => {
    expect(mockRemove).toHaveBeenCalled();
  });
});
```

---

## Performance Considerations

1. **Async Operations**: Component handles promises efficiently
2. **State Management**: Minimal re-renders
3. **Loading States**: Prevents double-clicks
4. **Error Recovery**: Keeps modal open on error for retry

---

## Migration Guide

### From Old Delete Buttons

**Before:**
```tsx
<button onClick={() => handleDelete(id)}>Delete</button>
```

**After:**
```tsx
<RemoveButton
  onRemove={() => handleDelete(id)}
  itemName={itemName}
/>
```

---

## Troubleshooting

### Modal Not Showing

Ensure Modal component is imported and working:
```tsx
import Modal from './Modal';
```

### Errors Not Displaying

Make sure to `throw` errors in your `onRemove` function:
```tsx
const handleRemove = async () => {
  const { error } = await supabase.from('table').delete().eq('id', id);
  if (error) throw error; // Must throw for RemoveButton to catch
};
```

### State Not Updating

Update state after successful removal:
```tsx
const handleRemove = async () => {
  await supabase.from('table').delete().eq('id', id);
  setItems(prev => prev.filter(item => item.id !== id)); // Update state
};
```

---

## Examples in Codebase

See `RemoveButtonExamples.tsx` for complete working examples:
- Remove health connections
- Remove family members
- Remove health goals
- Remove emergency contacts
- Remove archetypal AIs
- Quick remove without confirmation

---

## Summary

The RemoveButton component provides:
- ✅ Consistent UX across your application
- ✅ Built-in confirmation and error handling
- ✅ Multiple variants for different contexts
- ✅ Full TypeScript type safety
- ✅ Accessibility compliance
- ✅ Integration with your design system

**Location:** `/src/components/RemoveButton.tsx`
**Examples:** `/src/components/RemoveButtonExamples.tsx`
**Documentation:** This file

Ready to use throughout your health tracking application!
