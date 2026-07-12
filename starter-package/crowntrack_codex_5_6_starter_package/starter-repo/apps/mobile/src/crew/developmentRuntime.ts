import { validateCrewLinkMessage } from '@crowntrack/crew-protocol';
import {
  MockCloudTransport,
  MockMeshRadioTransport,
  MockNearbyTransport,
  SimulatedTransportNetwork,
} from '@crowntrack/crewlink';
import type { LinkState, TransportKind } from './types';

type SimulatedKind = 'cloud' | 'nearby' | 'mesh_radio';

export class CrewDevelopmentRuntime {
  private readonly network = new SimulatedTransportNetwork();
  private readonly transports = {
    cloud: new MockCloudTransport(this.network),
    nearby: new MockNearbyTransport(this.network),
    mesh_radio: new MockMeshRadioTransport(this.network),
  };
  private sequence = 0;

  setAvailable(kind: SimulatedKind, available: boolean) {
    this.transports[kind].setAvailable(available);
  }

  reconnect(kind: SimulatedKind) {
    this.transports[kind].reconnect();
  }

  getState(kind: SimulatedKind): LinkState {
    return this.transports[kind].getState();
  }

  getConnectedKinds(): TransportKind[] {
    return (Object.keys(this.transports) as SimulatedKind[])
      .filter((kind) => this.getState(kind) === 'connected');
  }

  validateQueuedDevelopmentUpdate(groupId: string) {
    this.sequence += 1;
    const now = '2026-07-11T18:32:00.000Z';
    return validateCrewLinkMessage({
      version: 1,
      type: 'location',
      messageId: `mobile-dev-${this.sequence}`,
      groupId,
      deviceId: 'mobile-simulator',
      streamId: 'crew-development',
      sequence: this.sequence,
      sentAt: now,
      ttlSeconds: 120,
      payload: {
        latitude: 53.533,
        longitude: -115.281,
        accuracyMeters: 8,
        capturedAt: now,
      },
    }, { expectedGroupId: groupId, now: new Date(now) });
  }
}
