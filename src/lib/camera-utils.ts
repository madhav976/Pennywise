/**
 * Camera activation, permission error classification, capability detection,
 * and MediaStream track cleanup utilities for Pennywise receipt scanning.
 */

export type CameraFacingMode = 'environment' | 'user';

export type CameraErrorCategory =
  | 'permission_denied'
  | 'device_not_found'
  | 'camera_in_use'
  | 'unsupported_context'
  | 'unknown_error';

export interface CameraErrorInfo {
  category: CameraErrorCategory;
  title: string;
  message: string;
  browserSettingsHint: string;
}

/**
 * Builds MediaStreamConstraints preferring the rear-facing ('environment') camera
 * on mobile devices while allowing fallback on devices with a single camera.
 */
export function buildCameraConstraints(
  facingMode: CameraFacingMode = 'environment'
): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}

/**
 * Stops all tracks on a MediaStream so the device camera never stays active
 * in the background after closing, switching, or unmounting.
 */
export function stopMediaStreamTracks(stream: MediaStream | null | undefined): number {
  if (!stream || typeof stream.getTracks !== 'function') {
    return 0;
  }
  const tracks = stream.getTracks();
  let stoppedCount = 0;
  for (const track of tracks) {
    try {
      track.stop();
      stoppedCount++;
    } catch {
      // Ignore individual track stop errors
    }
  }
  return stoppedCount;
}

/**
 * Classifies DOMException / browser MediaDevices errors into clear, actionable
 * user-facing states without technical stack traces.
 */
export function classifyCameraError(error: unknown): CameraErrorInfo {
  const errName =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name?: unknown }).name)
      : '';
  const errMessage =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';

  if (
    errName === 'NotAllowedError' ||
    errName === 'PermissionDeniedError' ||
    errName === 'SecurityError' ||
    /permission|denied|not allowed/i.test(errMessage)
  ) {
    return {
      category: 'permission_denied',
      title: 'Camera access is required to scan receipts.',
      message:
        'Pennywise needs permission to use your camera so you can snap and extract receipt details automatically.',
      browserSettingsHint:
        'Tap the lock or site-settings icon in your browser address bar, set Camera to "Allow", and tap Try Again — or upload a receipt image from your device.',
    };
  }

  if (
    errName === 'NotFoundError' ||
    errName === 'DevicesNotFoundError' ||
    errName === 'OverconstrainedError' ||
    /not found|no device|requested device/i.test(errMessage)
  ) {
    return {
      category: 'device_not_found',
      title: 'Camera access is required to scan receipts.',
      message:
        'No compatible camera was found on this device. You can upload a receipt photo from your gallery instead.',
      browserSettingsHint:
        'Ensure your device has a working camera connected, or use "Upload Receipt Image" below.',
    };
  }

  if (
    errName === 'NotReadableError' ||
    errName === 'TrackStartError' ||
    errName === 'AbortError' ||
    /in use|not readable|could not start/i.test(errMessage)
  ) {
    return {
      category: 'camera_in_use',
      title: 'Camera is currently unavailable.',
      message:
        'Your camera appears to be in use by another application or tab. Close other camera apps and try again, or upload a receipt image manually.',
      browserSettingsHint:
        'Close any other app or browser tab using the camera, then tap Try Again.',
    };
  }

  if (errName === 'UnsupportedContextError' || /mediaDevices|https|secure/i.test(errMessage)) {
    return {
      category: 'unsupported_context',
      title: 'Camera access is required to scan receipts.',
      message:
        'Live camera access requires a secure connection (HTTPS or localhost) and a modern mobile browser.',
      browserSettingsHint:
        'Open Pennywise over HTTPS on your mobile browser, or upload a receipt image directly from your device.',
    };
  }

  return {
    category: 'unknown_error',
    title: 'Camera access is required to scan receipts.',
    message:
      'We could not initialize your camera right now. You can try again or upload a receipt image manually.',
    browserSettingsHint:
      'Check that camera access is enabled in your browser settings, or select "Upload Receipt Image" below.',
  };
}

/**
 * Checks whether the active video track supports hardware flash/torch.
 */
export function supportsCameraTorch(stream: MediaStream | null | undefined): boolean {
  if (!stream || typeof stream.getVideoTracks !== 'function') return false;
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') return false;
  try {
    const capabilities = videoTrack.getCapabilities() as Record<string, unknown>;
    return Boolean(capabilities && capabilities.torch);
  } catch {
    return false;
  }
}

/**
 * Toggles hardware flash/torch on the active video track when supported.
 */
export async function setCameraTorch(
  stream: MediaStream | null | undefined,
  enabled: boolean
): Promise<boolean> {
  if (!stream || typeof stream.getVideoTracks !== 'function') return false;
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack || typeof videoTrack.applyConstraints !== 'function') return false;
  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: enabled } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

