import React, { useState } from 'react';
import Button, { IconButton, FloatingActionButton, ButtonGroup, ToggleButton } from './Button';
import {
  Save,
  X,
  Check,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  Download,
  Upload,
  Edit,
  Share,
  Heart,
  Bell,
  BellOff,
  Loader
} from 'lucide-react';

/**
 * Button Showcase Component
 *
 * Demonstrates all button variants, sizes, states, and special types
 * with interactive examples and code snippets.
 */
export default function ButtonShowcase() {
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const simulateAsync = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Premium Button System
          </h1>
          <p className="text-xl text-gray-400">
            St. Raphael AI Design System - Complete Button Library
          </p>
          <p className="text-sm text-gray-500">
            WCAG 2.1 AA Compliant • Touch Optimized • Fully Accessible
          </p>
        </div>

        {/* Button Variants */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Button Variants</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Primary</h3>
              <p className="text-sm text-gray-400 mb-4">
                Main actions, CTAs, form submissions • Blue-Cyan gradient • 7.2:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="primary" size="md">
                  Save Changes
                </Button>
                <Button variant="primary" size="md" icon={<Check className="w-5 h-5" />}>
                  Confirm
                </Button>
                <Button variant="primary" size="md" icon={<Download className="w-5 h-5" />} iconPosition="right">
                  Download
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Secondary</h3>
              <p className="text-sm text-gray-400 mb-4">
                Alternative actions, cancel buttons • Gray gradient • 5.8:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="secondary" size="md">
                  Cancel
                </Button>
                <Button variant="secondary" size="md" icon={<X className="w-5 h-5" />}>
                  Close
                </Button>
                <Button variant="secondary" size="md" icon={<Upload className="w-5 h-5" />}>
                  Upload
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Tertiary</h3>
              <p className="text-sm text-gray-400 mb-4">
                Less prominent actions • Semi-transparent • Backdrop blur • 4.8:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="tertiary" size="md">
                  Learn More
                </Button>
                <Button variant="tertiary" size="md" icon={<Settings className="w-5 h-5" />}>
                  Settings
                </Button>
                <Button variant="tertiary" size="md" icon={<Edit className="w-5 h-5" />}>
                  Edit
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Ghost</h3>
              <p className="text-sm text-gray-400 mb-4">
                Minimal visual weight • Transparent background • 4.5:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="ghost" size="md">
                  Skip
                </Button>
                <Button variant="ghost" size="md" icon={<Share className="w-5 h-5" />}>
                  Share
                </Button>
                <Button variant="ghost" size="md" icon={<Heart className="w-5 h-5" />}>
                  Like
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Danger</h3>
              <p className="text-sm text-gray-400 mb-4">
                Destructive actions, deletions • Red-Pink gradient • 6.9:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="danger" size="md">
                  Delete Account
                </Button>
                <Button variant="danger" size="md" icon={<Trash2 className="w-5 h-5" />}>
                  Remove
                </Button>
                <Button variant="danger" size="md" icon={<X className="w-5 h-5" />}>
                  Reject
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Success</h3>
              <p className="text-sm text-gray-400 mb-4">
                Positive confirmations • Green-Emerald gradient • 6.5:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="success" size="md">
                  Approve
                </Button>
                <Button variant="success" size="md" icon={<Check className="w-5 h-5" />}>
                  Accept
                </Button>
                <Button variant="success" size="md" icon={<Save className="w-5 h-5" />}>
                  Save
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Warning</h3>
              <p className="text-sm text-gray-400 mb-4">
                Caution actions • Yellow-Orange gradient • 5.9:1 contrast
              </p>
              <ButtonGroup>
                <Button variant="warning" size="md">
                  Proceed with Caution
                </Button>
                <Button variant="warning" size="md" icon={<AlertTriangle className="w-5 h-5" />}>
                  Warning
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Button Sizes */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Size Variants</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">XS (32px) - Compact interfaces</h3>
              <ButtonGroup>
                <Button variant="primary" size="xs">Extra Small</Button>
                <Button variant="secondary" size="xs">Extra Small</Button>
                <Button variant="tertiary" size="xs">Extra Small</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">SM (40px) - Secondary actions</h3>
              <ButtonGroup>
                <Button variant="primary" size="sm">Small Button</Button>
                <Button variant="secondary" size="sm">Small Button</Button>
                <Button variant="tertiary" size="sm">Small Button</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">MD (44px) - Default, most UI elements</h3>
              <ButtonGroup>
                <Button variant="primary" size="md">Medium Button</Button>
                <Button variant="secondary" size="md">Medium Button</Button>
                <Button variant="tertiary" size="md">Medium Button</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">LG (52px) - Hero CTAs</h3>
              <ButtonGroup>
                <Button variant="primary" size="lg">Large Button</Button>
                <Button variant="secondary" size="lg">Large Button</Button>
                <Button variant="tertiary" size="lg">Large Button</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">XL (60px) - Marketing pages</h3>
              <ButtonGroup>
                <Button variant="primary" size="xl">Extra Large Button</Button>
                <Button variant="secondary" size="xl">Extra Large Button</Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Button States */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Button States</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Default State</h3>
              <Button variant="primary" size="md">
                Normal Button
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Hover State</h3>
              <p className="text-sm text-gray-400 mb-2">
                Hover over any button to see darker gradient and increased shadow
              </p>
              <Button variant="primary" size="md">
                Hover Me
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Disabled State</h3>
              <ButtonGroup>
                <Button variant="primary" size="md" disabled>
                  Disabled
                </Button>
                <Button variant="danger" size="md" disabled>
                  Disabled
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Loading State</h3>
              <ButtonGroup>
                <Button variant="primary" size="md" loading={loading} onClick={simulateAsync}>
                  {loading ? 'Loading...' : 'Simulate Async'}
                </Button>
                <Button variant="success" size="md" loading icon={<Save className="w-5 h-5" />}>
                  Saving...
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Focus State</h3>
              <p className="text-sm text-gray-400 mb-2">
                Tab to focus - visible 4px ring with offset
              </p>
              <Button variant="primary" size="md">
                Focus Me
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Active State</h3>
              <p className="text-sm text-gray-400 mb-2">
                Click and hold to see 2% scale reduction
              </p>
              <Button variant="primary" size="md">
                Click Me
              </Button>
            </div>
          </div>
        </section>

        {/* Icon Buttons */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Icon Buttons</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Icon Only Buttons</h3>
              <ButtonGroup>
                <IconButton icon={<Settings className="w-5 h-5" />} aria-label="Settings" variant="primary" size="md" />
                <IconButton icon={<Edit className="w-5 h-5" />} aria-label="Edit" variant="secondary" size="md" />
                <IconButton icon={<Share className="w-5 h-5" />} aria-label="Share" variant="tertiary" size="md" />
                <IconButton icon={<Trash2 className="w-5 h-5" />} aria-label="Delete" variant="danger" size="md" />
                <IconButton icon={<Heart className="w-5 h-5" />} aria-label="Like" variant="ghost" size="md" />
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Icon Sizes</h3>
              <ButtonGroup>
                <IconButton icon={<Settings className="w-3 h-3" />} aria-label="Settings" variant="primary" size="xs" />
                <IconButton icon={<Settings className="w-4 h-4" />} aria-label="Settings" variant="primary" size="sm" />
                <IconButton icon={<Settings className="w-5 h-5" />} aria-label="Settings" variant="primary" size="md" />
                <IconButton icon={<Settings className="w-6 h-6" />} aria-label="Settings" variant="primary" size="lg" />
                <IconButton icon={<Settings className="w-7 h-7" />} aria-label="Settings" variant="primary" size="xl" />
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Icon Position - Left</h3>
              <ButtonGroup>
                <Button variant="primary" size="md" icon={<Save className="w-5 h-5" />} iconPosition="left">
                  Save Changes
                </Button>
                <Button variant="success" size="md" icon={<Check className="w-5 h-5" />} iconPosition="left">
                  Confirm
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Icon Position - Right</h3>
              <ButtonGroup>
                <Button variant="primary" size="md" icon={<Download className="w-5 h-5" />} iconPosition="right">
                  Download
                </Button>
                <Button variant="secondary" size="md" icon={<Upload className="w-5 h-5" />} iconPosition="right">
                  Upload
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Button Groups */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Button Groups</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Horizontal Group</h3>
              <ButtonGroup orientation="horizontal">
                <Button variant="primary" size="md">Save</Button>
                <Button variant="secondary" size="md">Cancel</Button>
                <Button variant="ghost" size="md">Reset</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Vertical Group</h3>
              <ButtonGroup orientation="vertical">
                <Button variant="tertiary" size="md" icon={<Settings className="w-5 h-5" />}>
                  Account Settings
                </Button>
                <Button variant="tertiary" size="md" icon={<Bell className="w-5 h-5" />}>
                  Notifications
                </Button>
                <Button variant="tertiary" size="md" icon={<Heart className="w-5 h-5" />}>
                  Favorites
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Attached Group (Segmented Control)</h3>
              <ButtonGroup attached>
                <Button variant="tertiary" size="md">Day</Button>
                <Button variant="tertiary" size="md">Week</Button>
                <Button variant="tertiary" size="md">Month</Button>
                <Button variant="tertiary" size="md">Year</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Full Width Group</h3>
              <ButtonGroup orientation="horizontal" fullWidth>
                <Button variant="secondary" size="md">Cancel</Button>
                <Button variant="primary" size="md">Confirm</Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Toggle Buttons */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Toggle Buttons</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Toggle with Icon</h3>
              <ToggleButton
                active={notificationsEnabled}
                onToggle={setNotificationsEnabled}
                icon={notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                size="md"
              >
                {notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
              </ToggleButton>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Toggle Group</h3>
              <ButtonGroup>
                <ToggleButton active={true} onToggle={() => {}} size="md">
                  Bold
                </ToggleButton>
                <ToggleButton active={false} onToggle={() => {}} size="md">
                  Italic
                </ToggleButton>
                <ToggleButton active={false} onToggle={() => {}} size="md">
                  Underline
                </ToggleButton>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Special Layouts */}
        <section className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Special Layouts</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Full Width Button</h3>
              <Button variant="primary" size="md" fullWidth>
                Full Width Primary Action
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Modal Actions</h3>
              <div className="bg-gray-900/50 rounded-lg p-6 space-y-4">
                <p className="text-gray-300">Are you sure you want to delete this item?</p>
                <ButtonGroup fullWidth>
                  <Button variant="secondary" size="md">
                    Cancel
                  </Button>
                  <Button variant="danger" size="md">
                    Delete
                  </Button>
                </ButtonGroup>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Toolbar Actions</h3>
              <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                <span className="text-gray-300">Document.pdf</span>
                <ButtonGroup>
                  <IconButton icon={<Download className="w-5 h-5" />} aria-label="Download" variant="ghost" size="sm" />
                  <IconButton icon={<Share className="w-5 h-5" />} aria-label="Share" variant="ghost" size="sm" />
                  <IconButton icon={<Trash2 className="w-5 h-5" />} aria-label="Delete" variant="ghost" size="sm" />
                </ButtonGroup>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Accessibility Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-300">Keyboard Navigation</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Tab to focus buttons</li>
                <li>• Enter/Space to activate</li>
                <li>• Visible focus indicators</li>
                <li>• Proper tab order</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-300">Screen Readers</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Semantic HTML buttons</li>
                <li>• aria-label for icon buttons</li>
                <li>• aria-disabled states</li>
                <li>• aria-busy for loading</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-300">Touch Targets</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Minimum 44×44px (WCAG AAA)</li>
                <li>• Adequate spacing (8px)</li>
                <li>• Active state feedback</li>
                <li>• No accidental clicks</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-300">Color Contrast</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Primary: 7.2:1 (AAA)</li>
                <li>• Secondary: 5.8:1 (AA)</li>
                <li>• All variants meet AA</li>
                <li>• Focus rings high contrast</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center space-y-2 pb-8">
          <p className="text-gray-400">
            St. Raphael AI Healthcare Platform • Premium Button System v1.0
          </p>
          <p className="text-sm text-gray-500">
            WCAG 2.1 AA Compliant • Fully Accessible • Production Ready
          </p>
        </div>
      </div>

      {/* Floating Action Button Demo */}
      <FloatingActionButton
        icon={<Plus className="w-6 h-6" />}
        variant="primary"
        position="bottom-right"
        aria-label="Add new item"
      />
    </div>
  );
}
