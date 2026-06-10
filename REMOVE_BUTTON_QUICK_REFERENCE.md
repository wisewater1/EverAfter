# RemoveButton - Quick Reference Card

## Import
```tsx
import RemoveButton from '../components/RemoveButton';
```

## Basic Usage
```tsx
<RemoveButton
  onRemove={async () => {
    const { error } = await supabase
      .from('table')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }}
  itemName="Item Name"
  itemType="item"
/>
```

## Variants

| Variant | Use Case | Code |
|---------|----------|------|
| **Icon** | Inline, compact | `variant="icon"` |
| **Button** | Primary action | `variant="button"` |
| **Text** | Subtle, minimal | `variant="text"` |

## Sizes

| Size | Icon | Code |
|------|------|------|
| **Small** | 12px | `size="sm"` |
| **Medium** | 16px | `size="md"` (default) |
| **Large** | 20px | `size="lg"` |

## Common Props

```tsx
<RemoveButton
  onRemove={() => handleRemove()}           // Required
  itemName="Terra Connection"               // Optional
  itemType="connection"                     // Optional
  confirmationMessage="Custom message?"     // Optional
  variant="icon"                            // 'icon' | 'button' | 'text'
  size="md"                                 // 'sm' | 'md' | 'lg'
  showConfirmation={true}                   // true | false
  disabled={false}                          // true | false
  className="ml-4"                          // Additional classes
/>
```

## Quick Examples

### Health Connection
```tsx
<RemoveButton
  onRemove={() => removeConnection(id)}
  itemName="Terra"
  itemType="connection"
  variant="icon"
/>
```

### Family Member
```tsx
<RemoveButton
  onRemove={() => removeMember(id)}
  itemName={member.name}
  itemType="family member"
  variant="icon"
  size="sm"
/>
```

### Health Goal
```tsx
<RemoveButton
  onRemove={() => removeGoal(id)}
  itemName={goal.title}
  itemType="health goal"
  variant="button"
/>
```

### No Confirmation
```tsx
<RemoveButton
  onRemove={() => quickRemove(id)}
  itemName="Quick Item"
  showConfirmation={false}
  variant="icon"
/>
```

## Files

- **Component:** `/src/components/RemoveButton.tsx`
- **Examples:** `/src/components/RemoveButtonExamples.tsx`
- **Showcase:** `/src/components/RemoveButtonShowcase.tsx`
- **Guide:** `/REMOVE_BUTTON_GUIDE.md`

## Build Status

✅ Compiled successfully
✅ TypeScript validated
✅ Production ready
