import { CrewIdentityError } from './errors';
import { pairingAuthenticationCode, trustedPeerFromInvitation, verifyPairingInvitation } from './pairing';
import type { CrewIdentityRepository } from './repository';
import type { PairingInvitation, PublicDeviceIdentity, TrustedPeer } from './schemas';

export class PairingService {
  constructor(private readonly repository: CrewIdentityRepository, private readonly localIdentity: PublicDeviceIdentity, private readonly clock: () => Date = () => new Date()) {}

  async stage(invitation: PairingInvitation): Promise<{ invitationId: string; authenticationCode: string }> {
    verifyPairingInvitation(invitation, this.clock());
    const prior = await this.repository.getInvitation(invitation.invitationId);
    if (prior?.usedAt) throw new CrewIdentityError('replayed', 'Pairing invitation was already consumed');
    if (prior?.cancelledAt) throw new CrewIdentityError('cancelled', 'Pairing invitation was cancelled');
    const known = await this.repository.getTrustedPeer(invitation.issuer.deviceId);
    if (known && known.publicKey !== invitation.issuer.publicKey) throw new CrewIdentityError('key_changed', 'Known device presented an unexpected key');
    if (known?.revokedAt) throw new CrewIdentityError('cancelled', 'Revoked trust cannot be restored by an old invitation');
    await this.repository.putInvitation(invitation);
    return { invitationId: invitation.invitationId, authenticationCode: pairingAuthenticationCode(invitation, this.localIdentity) };
  }

  async confirm(invitationId: string): Promise<TrustedPeer> {
    const invitation = await this.repository.getInvitation(invitationId);
    if (!invitation) throw new CrewIdentityError('invalid_input', 'Pairing invitation is not staged');
    if (invitation.usedAt) throw new CrewIdentityError('replayed', 'Pairing invitation was already consumed');
    if (invitation.cancelledAt) throw new CrewIdentityError('cancelled', 'Pairing invitation was cancelled');
    verifyPairingInvitation(invitation, this.clock());
    const known = await this.repository.getTrustedPeer(invitation.issuer.deviceId);
    if (known && known.publicKey !== invitation.issuer.publicKey) throw new CrewIdentityError('key_changed', 'Known device presented an unexpected key');
    if (known?.revokedAt) throw new CrewIdentityError('cancelled', 'Revoked trust cannot be restored by an old invitation');
    const trusted = trustedPeerFromInvitation(invitation, this.clock().toISOString());
    await this.repository.putTrustedPeer(trusted);
    await this.repository.markInvitationUsed(invitationId, trusted.trustedAt);
    return trusted;
  }

  async cancel(invitationId: string): Promise<void> {
    const invitation = await this.repository.getInvitation(invitationId);
    if (!invitation || invitation.usedAt || invitation.cancelledAt) throw new CrewIdentityError('replayed', 'Pairing invitation is not cancellable');
    await this.repository.cancelInvitation(invitationId, this.clock().toISOString());
  }

  async revoke(deviceId: string): Promise<void> {
    const peer = await this.repository.getTrustedPeer(deviceId);
    if (!peer) throw new CrewIdentityError('invalid_input', 'Trusted peer does not exist');
    await this.repository.revokeTrustedPeer(deviceId, this.clock().toISOString());
  }
}
