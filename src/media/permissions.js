/** @returns {Promise<PermissionState | 'unknown'>} */
export async function getCameraPermissionState() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    return status.state;
  } catch {
    return 'unknown';
  }
}
