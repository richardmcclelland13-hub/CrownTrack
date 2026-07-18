import { SignedCrewLinkEnvelopeSchema, type SignedCrewLinkEnvelope } from '@crowntrack/crew-protocol';
import type { LinkState, TransportKind } from './entities';
import type { SignedCrewTransport } from './signed-coordinator';

export type SignedSimulationScenario = 'normal' | 'delayed' | 'drop' | 'duplicate' | 'out_of_order' | 'unavailable';

export interface SignedSimulationOptions {
  delayTicks?: number;
  scenario?: SignedSimulationScenario;
}

/**
 * Deterministic in-process v2-only transport fabric. Delivery is deferred until
 * drain() so tests await handlers (including ACKs emitted by those handlers).
 */
export class SignedSimulatedTransportNetwork {
  private readonly endpoints = new Set<SignedSimulatedCrewTransport>();
  private readonly pending: Array<{ endpoint: SignedSimulatedCrewTransport; message: SignedCrewLinkEnvelope; at: number; order: number }> = [];
  private tick = 0;
  private order = 0;

  attach(endpoint: SignedSimulatedCrewTransport) { this.endpoints.add(endpoint); }
  detach(endpoint: SignedSimulatedCrewTransport) { this.endpoints.delete(endpoint); }

  send(sender: SignedSimulatedCrewTransport, message: SignedCrewLinkEnvelope, delayTicks = 0) {
    for (const endpoint of this.endpoints) {
      if (endpoint !== sender && endpoint.kind === sender.kind && endpoint.acceptsSignedGroup(message.groupId)) {
        this.pending.push({ endpoint, message, at: this.tick + delayTicks, order: this.order++ });
      }
    }
  }

  /** Delivers until quiescent, including frames enqueued by awaited handlers. */
  async drain(): Promise<void> {
    while (this.pending.length > 0) {
      this.pending.sort((left, right) => left.at - right.at || left.order - right.order);
      const next = this.pending.shift();
      if (!next) return;
      this.tick = Math.max(this.tick, next.at);
      await next.endpoint.deliverSigned(next.message);
    }
  }

  get pendingCount() { return this.pending.length; }
}

export abstract class SignedSimulatedCrewTransport implements SignedCrewTransport {
  abstract readonly kind: TransportKind;
  private state: LinkState = 'disconnected';
  private readonly groups = new Set<string>();
  private readonly handlers = new Set<(message: unknown) => void | Promise<void>>();
  private readonly scenarios: SignedSimulationScenario[] = [];
  private held?: SignedCrewLinkEnvelope;
  private attached = false;
  private readonly delayTicks: number;

  constructor(private readonly network: SignedSimulatedTransportNetwork, options: SignedSimulationOptions = {}) {
    this.delayTicks = options.delayTicks ?? 1;
    if (options.scenario) this.scenarios.push(options.scenario);
  }

  getState() { return this.state; }

  async startSigned(groupIds: readonly string[]): Promise<void> {
    this.groups.clear();
    for (const groupId of groupIds) this.groups.add(groupId);
    this.attached = true;
    this.network.attach(this);
    this.state = 'connected';
  }

  async stopSigned(): Promise<void> {
    this.network.detach(this);
    this.attached = false;
    this.state = 'disconnected';
  }

  setScenario(...scenarios: SignedSimulationScenario[]) { this.scenarios.push(...scenarios); }

  setAvailable(available: boolean) {
    if (available) {
      if (this.attached) this.network.attach(this);
      this.state = this.attached ? 'connected' : 'disconnected';
    } else {
      this.state = 'unavailable';
    }
  }

  reconnect() {
    if (!this.attached) return;
    this.network.attach(this);
    this.state = 'connecting';
    this.state = 'connected';
  }

  acceptsSignedGroup(groupId: string) {
    return this.state === 'connected' && this.groups.has(groupId);
  }

  subscribeSigned(handler: (message: unknown) => void | Promise<void>) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async sendSigned(input: SignedCrewLinkEnvelope): Promise<{ accepted: boolean }> {
    if (!SignedCrewLinkEnvelopeSchema.safeParse(input).success) return { accepted: false };
    if (this.state !== 'connected') return { accepted: false };

    const scenario = this.scenarios.shift() ?? 'normal';
    if (scenario === 'unavailable') {
      this.state = 'unavailable';
      return { accepted: false };
    }
    if (scenario === 'drop') return { accepted: false };
    if (scenario === 'out_of_order') {
      this.held = input;
      return { accepted: true };
    }

    const delay = scenario === 'delayed' ? this.delayTicks : 0;
    this.network.send(this, input, delay);
    if (scenario === 'duplicate') this.network.send(this, input, delay + 1);
    if (this.held) {
      const held = this.held;
      this.held = undefined;
      this.network.send(this, held, delay + 1);
    }
    return { accepted: true };
  }

  async deliverSigned(message: SignedCrewLinkEnvelope): Promise<void> {
    for (const handler of this.handlers) await handler(message);
  }
}

export class SignedMockCloudTransport extends SignedSimulatedCrewTransport {
  readonly kind = 'cloud' as const;
}

export class SignedMockNearbyTransport extends SignedSimulatedCrewTransport {
  readonly kind = 'nearby' as const;
}

export class SignedMockMeshRadioTransport extends SignedSimulatedCrewTransport {
  readonly kind = 'mesh_radio' as const;
}
