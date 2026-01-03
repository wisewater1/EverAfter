import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Camera,
  Image,
  Video,
  Scan,
  Smile,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface MediaConsentData {
  photoLibraryAccess: boolean;
  cameraAccess: boolean;
  videoAccess: boolean;
  allowFaceDetection: boolean;
  allowExpressionAnalysis: boolean;
}

interface MediaPermissionsStepProps {
  data: MediaConsentData;
  onUpdate: (data: MediaConsentData) => void;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  userId: string;
}

interface PermissionToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  color: string;
  bgColor: string;
}

function PermissionToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
  color,
  bgColor,
}: PermissionToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-full p-4 rounded-xl border transition-all text-left ${
        enabled
          ? 'bg-indigo-500/10 border-indigo-500/50'
          : 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <h4 className="font-medium text-white">{title}</h4>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
        </div>
        {enabled ? (
          <ToggleRight className="w-8 h-8 text-indigo-400 flex-shrink-0" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-gray-500 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

export default function MediaPermissionsStep({
  data,
  onUpdate,
  onNext,
  onBack,
  saving,
  userId,
}: MediaPermissionsStepProps) {
  const [localData, setLocalData] = useState<MediaConsentData>(data);
  const [savingConsent, setSavingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof MediaConsentData, value: boolean) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleContinue = async () => {
    setSavingConsent(true);
    setError(null);

    try {
      // Save consent to database
      const { error: dbError } = await supabase.from('media_consent').upsert(
        {
          user_id: userId,
          photo_library_access: localData.photoLibraryAccess,
          camera_access: localData.cameraAccess,
          video_access: localData.videoAccess,
          allow_face_detection: localData.allowFaceDetection,
          allow_expression_analysis: localData.allowExpressionAnalysis,
          consent_given_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (dbError) throw dbError;

      onNext();
    } catch (err) {
      console.error('Error saving media consent:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSavingConsent(false);
    }
  };

  const enabledCount = Object.values(localData).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Media Permissions</h2>
        <p className="text-gray-400 text-sm">
          Help EverAfter preserve your memories. All permissions are optional.
        </p>
      </div>

      {/* Permission Toggles */}
      <div className="space-y-3 mb-6">
        <PermissionToggle
          icon={Image}
          title="Photo Library Access"
          description="Allow access to your photos for memory albums and sharing"
          enabled={localData.photoLibraryAccess}
          onChange={(v) => updateField('photoLibraryAccess', v)}
          color="text-blue-400"
          bgColor="bg-blue-500/20"
        />

        <PermissionToggle
          icon={Camera}
          title="Camera Access"
          description="Take photos directly in the app for quick captures"
          enabled={localData.cameraAccess}
          onChange={(v) => updateField('cameraAccess', v)}
          color="text-green-400"
          bgColor="bg-green-500/20"
        />

        <PermissionToggle
          icon={Video}
          title="Video Recording"
          description="Record video messages for your digital legacy"
          enabled={localData.videoAccess}
          onChange={(v) => updateField('videoAccess', v)}
          color="text-red-400"
          bgColor="bg-red-500/20"
        />
      </div>

      {/* Advanced AI Features */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">AI Features (Optional)</h3>
        <div className="space-y-3">
          <PermissionToggle
            icon={Scan}
            title="Face Detection"
            description="Automatically organize photos by recognizing faces"
            enabled={localData.allowFaceDetection}
            onChange={(v) => updateField('allowFaceDetection', v)}
            color="text-amber-400"
            bgColor="bg-amber-500/20"
          />

          <PermissionToggle
            icon={Smile}
            title="Expression Analysis"
            description="Detect emotions in photos to find your happiest moments"
            enabled={localData.allowExpressionAnalysis}
            onChange={(v) => updateField('allowExpressionAnalysis', v)}
            color="text-pink-400"
            bgColor="bg-pink-500/20"
          />
        </div>
      </div>

      {/* Privacy Assurance */}
      <div className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50 mb-6">
        <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-white mb-1">Your Privacy is Protected</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• All media processing happens on your device when possible</li>
            <li>• Face data is never shared with third parties</li>
            <li>• You can revoke any permission at any time in settings</li>
          </ul>
        </div>
      </div>

      {/* Status */}
      {enabledCount > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 mb-6">
          <p className="text-indigo-300 text-sm text-center">
            {enabledCount} permission{enabledCount > 1 ? 's' : ''} enabled
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={saving || savingConsent}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={saving || savingConsent}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {savingConsent ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
