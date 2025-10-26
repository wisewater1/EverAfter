import React, { useState } from 'react';
import RemoveButton from './RemoveButton';

export default function RemoveButtonShowcase() {
  const [items, setItems] = useState([
    { id: 1, name: 'Item 1', type: 'connection' },
    { id: 2, name: 'Item 2', type: 'goal' },
    { id: 3, name: 'Item 3', type: 'member' },
  ]);

  const [quickItems, setQuickItems] = useState(['Quick 1', 'Quick 2', 'Quick 3']);

  const handleRemove = async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleQuickRemove = (index: number) => {
    setQuickItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Remove Button Component</h1>
          <p className="text-slate-400">
            A comprehensive remove button with confirmation, error handling, and multiple variants
          </p>
        </div>

        {/* Variants */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Variants</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Icon Variant */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-white font-medium mb-2">Icon Variant</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Compact icon button, perfect for inline actions
                </p>
                <div className="flex items-center justify-center gap-2">
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="icon"
                    size="sm"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="icon"
                    size="md"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="icon"
                    size="lg"
                  />
                </div>
              </div>

              {/* Button Variant */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-white font-medium mb-2">Button Variant</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Full button with text, more prominent
                </p>
                <div className="space-y-2">
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="button"
                    size="sm"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="button"
                    size="md"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="button"
                    size="lg"
                  />
                </div>
              </div>

              {/* Text Variant */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-white font-medium mb-2">Text Variant</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Subtle text link, minimal footprint
                </p>
                <div className="space-y-2">
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="text"
                    size="sm"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="text"
                    size="md"
                  />
                  <RemoveButton
                    onRemove={async () => {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }}
                    itemName="Test Item"
                    itemType="item"
                    variant="text"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* With Confirmation */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">With Confirmation Dialog</h2>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-4">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/30"
                >
                  <div>
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-sm text-slate-400">Type: {item.type}</p>
                  </div>
                  <RemoveButton
                    onRemove={() => handleRemove(item.id)}
                    itemName={item.name}
                    itemType={item.type}
                    variant="icon"
                    size="md"
                  />
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  All items removed! Refresh to reset.
                </div>
              )}
            </div>
          </div>

          {/* Without Confirmation */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Without Confirmation (Quick Remove)
            </h2>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-3">
              {quickItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/30"
                >
                  <span className="text-white">{item}</span>
                  <RemoveButton
                    onRemove={() => handleQuickRemove(index)}
                    itemName={item}
                    variant="icon"
                    size="sm"
                    showConfirmation={false}
                  />
                </div>
              ))}
              {quickItems.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  All items removed! Refresh to reset.
                </div>
              )}
            </div>
          </div>

          {/* Simulated Error */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Error Handling Demo</h2>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div>
                  <h4 className="text-white font-medium">Item with Error</h4>
                  <p className="text-sm text-slate-400">This will fail to demonstrate error handling</p>
                </div>
                <RemoveButton
                  onRemove={async () => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    throw new Error('Simulated database error: Permission denied');
                  }}
                  itemName="Error Item"
                  itemType="item"
                  variant="button"
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* Disabled State */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Disabled State</h2>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <RemoveButton
                  onRemove={async () => {}}
                  itemName="Disabled Item"
                  variant="icon"
                  size="md"
                  disabled={true}
                />
                <RemoveButton
                  onRemove={async () => {}}
                  itemName="Disabled Item"
                  variant="button"
                  size="md"
                  disabled={true}
                />
                <RemoveButton
                  onRemove={async () => {}}
                  itemName="Disabled Item"
                  variant="text"
                  size="md"
                  disabled={true}
                />
              </div>
            </div>
          </div>

          {/* Real-World Example */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Real-World Example: Health Connections</h2>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between p-4 bg-teal-500/5 rounded-lg border border-teal-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-teal-400 text-lg">🏃</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Terra Health</h4>
                    <p className="text-sm text-slate-400">Connected on Oct 25, 2025</p>
                  </div>
                </div>
                <RemoveButton
                  onRemove={async () => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }}
                  itemName="Terra Health"
                  itemType="connection"
                  confirmationMessage="Disconnect Terra Health? You'll need to reconnect to sync your fitness data again."
                  variant="icon"
                  size="md"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-400 text-lg">📊</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Dexcom CGM</h4>
                    <p className="text-sm text-slate-400">Connected on Oct 20, 2025</p>
                  </div>
                </div>
                <RemoveButton
                  onRemove={async () => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }}
                  itemName="Dexcom CGM"
                  itemType="connection"
                  confirmationMessage="Disconnect Dexcom? Your glucose data will no longer sync automatically."
                  variant="icon"
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-xl p-6 border border-violet-500/20">
          <h3 className="text-white font-semibold mb-2">📖 Documentation</h3>
          <p className="text-slate-300 mb-4">
            See REMOVE_BUTTON_GUIDE.md for complete usage documentation, API reference, and more examples.
          </p>
          <div className="flex gap-2 text-sm">
            <code className="px-3 py-1 bg-slate-900/50 rounded text-violet-400 border border-violet-500/20">
              /src/components/RemoveButton.tsx
            </code>
            <code className="px-3 py-1 bg-slate-900/50 rounded text-violet-400 border border-violet-500/20">
              /src/components/RemoveButtonExamples.tsx
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
