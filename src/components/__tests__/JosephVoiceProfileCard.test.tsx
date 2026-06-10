import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import JosephVoiceProfileCard from '../joseph/JosephVoiceProfileCard';

const {
  useAuthMock,
  getJosephVoiceHealthMock,
  getJosephVoiceProfileMock,
  getRuntimeReadinessMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getJosephVoiceHealthMock: vi.fn(),
  getJosephVoiceProfileMock: vi.fn(),
  getRuntimeReadinessMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../../lib/joseph/voice', () => ({
  createJosephVoiceProfile: vi.fn(),
  getJosephVoiceHealth: getJosephVoiceHealthMock,
  getJosephVoiceProfile: getJosephVoiceProfileMock,
  getJosephVoiceTrainingStatus: vi.fn(),
  startJosephVoiceTraining: vi.fn(),
  uploadJosephVoiceSample: vi.fn(),
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getCapability: (_readiness: any, capabilityId: string) => _readiness?.capability_map?.[capabilityId] || null,
}));

vi.mock('../joseph/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    audioBlob: null,
    durationSeconds: 0,
    error: null,
    isProcessing: false,
    isRecording: false,
    isSupported: true,
    previewUrl: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    clearRecording: vi.fn(),
  }),
}));

describe('JosephVoiceProfileCard', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    useAuthMock.mockReturnValue({
      loading: false,
      session: { access_token: 'live-token' },
      isDemoMode: false,
    });

    getJosephVoiceHealthMock.mockResolvedValue({
      available: true,
      configured: true,
      status: 'ok',
      guided_capture_sets: {
        calibration: [],
      },
      thresholds: {
        min_approved_samples: 3,
        min_approved_seconds: 30,
      },
    });

    getJosephVoiceProfileMock.mockResolvedValue({
      profile: null,
      samples: [],
      guided_capture_sets: {},
      sidecar: {
        available: true,
        configured: true,
        status: 'ok',
      },
    });

    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'joseph.voice': {
          id: 'joseph.voice',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });
  });

  it('waits for auth restoration before loading protected Joseph voice data', () => {
    useAuthMock.mockReturnValue({
      loading: true,
      session: null,
      isDemoMode: false,
    });

    render(
      <JosephVoiceProfileCard
        familyMemberId="member-1"
        familyMemberName="Bob Chen"
      />,
    );

    expect(getJosephVoiceHealthMock).not.toHaveBeenCalled();
    expect(getJosephVoiceProfileMock).not.toHaveBeenCalled();
  });

  it('passes the live session token into Joseph voice requests', async () => {
    render(
      <JosephVoiceProfileCard
        familyMemberId="member-1"
        familyMemberName="Bob Chen"
      />,
    );

    await waitFor(() => {
      expect(getJosephVoiceHealthMock).toHaveBeenCalledWith({ authToken: 'live-token' });
      expect(getJosephVoiceProfileMock).toHaveBeenCalledWith('member-1', { authToken: 'live-token' });
    });
  });

  it('does not render raw auth failure JSON when the protected profile request is unauthorized', async () => {
    getJosephVoiceProfileMock.mockRejectedValue(new Error('{"detail":"Not authenticated"}'));

    render(
      <JosephVoiceProfileCard
        familyMemberId="member-1"
        familyMemberName="Bob Chen"
      />,
    );

    await waitFor(() => {
      expect(getJosephVoiceProfileMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('{"detail":"Not authenticated"}')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Create voice profile/i)).toBeInTheDocument();
  });

  it('blocks the voice panel when runtime readiness reports Joseph voice as unavailable', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'joseph.voice': {
          id: 'joseph.voice',
          status: 'unavailable',
          blocking: true,
          deps: ['VOICE_AI_BASE_URL'],
          reason: 'Voice AI sidecar is not configured.',
          checked_at: new Date().toISOString(),
        },
      },
    });

    render(
      <JosephVoiceProfileCard
        familyMemberId="member-1"
        familyMemberName="Bob Chen"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Voice AI sidecar is not configured/i)).toBeInTheDocument();
    });

    expect(getJosephVoiceHealthMock).not.toHaveBeenCalled();
    expect(getJosephVoiceProfileMock).not.toHaveBeenCalled();
  });
});
