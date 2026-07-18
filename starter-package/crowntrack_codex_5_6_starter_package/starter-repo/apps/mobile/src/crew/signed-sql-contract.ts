/**
 * Native SQLite projections that deliberately differ from presentation names.
 * Keep these alongside tests so a mobile-only schema mismatch fails before a
 * snapshot refresh reaches a device.
 */
export const TRUSTED_DEVICE_SNAPSHOT_SQL =
  'SELECT device_id, public_key, display_name, trusted_at AS paired_at, revoked_at FROM crew_trusted_peer';

/** Repository contract: rejection history is always oldest-to-newest. */
export const SIGNED_REJECTIONS_OLDEST_FIRST_SQL =
  'SELECT message_id, group_id, reason, received_at FROM crew_message_rejection ORDER BY id ASC LIMIT 128';
