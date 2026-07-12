import type { CrewAck, LinkState, LocationEnvelope, TransportKind } from './entities';
import type { CrewTransport, SendResult, TransportContext, Unsubscribe } from './transport';

export type SimulationScenario = 'normal' | 'delayed' | 'drop' | 'duplicate' | 'out_of_order' | 'unavailable';
export interface SimulationOptions { delayMs?: number; scenario?: SimulationScenario }
type Frame = { type: 'location'; groupId: string; value: LocationEnvelope } | { type: 'ack'; groupId: string; value: CrewAck };

export class SimulatedTransportNetwork {
  private readonly endpoints = new Set<SimulatedCrewTransport>();
  attach(endpoint: SimulatedCrewTransport) { this.endpoints.add(endpoint); }
  detach(endpoint: SimulatedCrewTransport) { this.endpoints.delete(endpoint); }
  deliver(sender: SimulatedCrewTransport, frame: Frame, delayMs: number) {
    for (const endpoint of this.endpoints) {
      if (endpoint !== sender && endpoint.accepts(frame.groupId)) endpoint.receive(frame, delayMs);
    }
  }
}

export abstract class SimulatedCrewTransport implements CrewTransport {
  abstract readonly kind: TransportKind;
  private state: LinkState = 'disconnected';
  private context?: TransportContext;
  private readonly locationHandlers = new Set<(message: LocationEnvelope) => void | Promise<void>>();
  private readonly ackHandlers = new Set<(ack: CrewAck) => void | Promise<void>>();
  private readonly stateHandlers = new Set<(state: LinkState) => void | Promise<void>>();
  private scenarios: SimulationScenario[];
  private readonly delayMs: number;
  private held?: Frame;

  constructor(private readonly network: SimulatedTransportNetwork, options: SimulationOptions = {}) {
    this.delayMs = options.delayMs ?? 20;
    this.scenarios = options.scenario ? [options.scenario] : [];
  }
  getState() { return this.state; }
  async start(context: TransportContext) { this.context = structuredClone(context); this.network.attach(this); this.setState('connected'); }
  async stop() { this.network.detach(this); this.context = undefined; this.setState('disconnected'); }
  setScenario(...scenarios: SimulationScenario[]) { this.scenarios.push(...scenarios); }
  setAvailable(available: boolean) { this.setState(available ? 'connected' : 'unavailable'); }
  reconnect() { this.setState('connecting'); this.setState('connected'); }
  accepts(groupId: string) { return this.state === 'connected' && !!this.context?.rideGroupIds.includes(groupId); }

  async send(message: LocationEnvelope) { return this.sendFrame({ type: 'location', groupId: message.groupId, value: message }); }
  async sendAck(ack: CrewAck, rideGroupId: string) { return this.sendFrame({ type: 'ack', groupId: rideGroupId, value: ack }); }
  private async sendFrame(frame: Frame): Promise<SendResult> {
    if (this.state !== 'connected') return { accepted: false, reason: 'unavailable' };
    const scenario = this.scenarios.shift() ?? 'normal';
    if (scenario === 'unavailable') { this.setState('unavailable'); return { accepted: false, reason: 'unavailable' }; }
    if (scenario === 'drop') return { accepted: false, reason: 'dropped' };
    if (scenario === 'out_of_order') { this.held = frame; return { accepted: true }; }
    const delay = scenario === 'delayed' ? this.delayMs : 0;
    this.network.deliver(this, frame, delay);
    if (scenario === 'duplicate') this.network.deliver(this, frame, delay + 1);
    if (this.held) { const held = this.held; this.held = undefined; this.network.deliver(this, held, delay + 2); }
    return { accepted: true };
  }
  receive(frame: Frame, delayMs: number) {
    const deliver = () => {
      const handlers = frame.type === 'location' ? this.locationHandlers : this.ackHandlers;
      for (const handler of handlers as Set<(value: LocationEnvelope | CrewAck) => void | Promise<void>>) void handler(frame.value);
    };
    if (delayMs > 0) setTimeout(deliver, delayMs); else queueMicrotask(deliver);
  }
  subscribe(handler: (message: LocationEnvelope) => void | Promise<void>): Unsubscribe { this.locationHandlers.add(handler); return () => this.locationHandlers.delete(handler); }
  subscribeAck(handler: (ack: CrewAck) => void | Promise<void>): Unsubscribe { this.ackHandlers.add(handler); return () => this.ackHandlers.delete(handler); }
  subscribeState(handler: (state: LinkState) => void | Promise<void>): Unsubscribe { this.stateHandlers.add(handler); return () => this.stateHandlers.delete(handler); }
  private setState(state: LinkState) { this.state = state; for (const handler of this.stateHandlers) void handler(state); }
}

export class MockCloudTransport extends SimulatedCrewTransport { readonly kind = 'cloud' as const; }
export class MockNearbyTransport extends SimulatedCrewTransport { readonly kind = 'nearby' as const; }
export class MockMeshRadioTransport extends SimulatedCrewTransport { readonly kind = 'mesh_radio' as const; }
