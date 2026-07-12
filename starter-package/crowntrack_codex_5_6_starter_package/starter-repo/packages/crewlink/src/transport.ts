import type { CrewAck, LinkState, LocationEnvelope, PeerIdentity, TransportKind } from './entities';

export type Unsubscribe = () => void;
export interface TransportContext { localPeer: PeerIdentity; rideGroupIds: string[] }
export interface SendResult { accepted: boolean; reason?: 'unavailable' | 'dropped' | 'stopped' }

export interface CrewTransport {
  readonly kind: TransportKind;
  getState(): LinkState;
  start(context: TransportContext): Promise<void>;
  stop(): Promise<void>;
  send(message: LocationEnvelope): Promise<SendResult>;
  sendAck(ack: CrewAck, rideGroupId: string): Promise<SendResult>;
  subscribe(handler: (message: LocationEnvelope) => void | Promise<void>): Unsubscribe;
  subscribeAck(handler: (ack: CrewAck) => void | Promise<void>): Unsubscribe;
  subscribeState(handler: (state: LinkState) => void | Promise<void>): Unsubscribe;
}
