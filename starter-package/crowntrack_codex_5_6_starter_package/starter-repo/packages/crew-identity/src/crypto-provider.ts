import { ed25519 } from '@noble/curves/ed25519';
import { base64UrlToBytes, bytesToBase64Url } from './encoding';
const assertLength = (value: Uint8Array, expected: number, label: string) => { if (value.length !== expected) throw new Error(label + ' has invalid length'); };
export const ED25519_SEED_BYTES = 32;
export const derivePublicKey = (seed: Uint8Array): Uint8Array => { assertLength(seed, ED25519_SEED_BYTES, 'Ed25519 seed'); return ed25519.getPublicKey(seed); };
export const signBytes = (seed: Uint8Array, payload: Uint8Array): Uint8Array => { assertLength(seed, ED25519_SEED_BYTES, 'Ed25519 seed'); return ed25519.sign(payload, seed); };
export const verifyBytes = (publicKey: Uint8Array, payload: Uint8Array, signature: Uint8Array): boolean => { try { assertLength(publicKey, 32, 'Ed25519 public key'); assertLength(signature, 64, 'Ed25519 signature'); return ed25519.verify(signature, payload, publicKey); } catch { return false; } };
export const publicKeyFromSeed = (seed: Uint8Array): string => bytesToBase64Url(derivePublicKey(seed));
export const signBase64Url = (seed: Uint8Array, payload: Uint8Array): string => bytesToBase64Url(signBytes(seed, payload));
export const verifyBase64Url = (publicKey: string, payload: Uint8Array, signature: string): boolean => { try { return verifyBytes(base64UrlToBytes(publicKey), payload, base64UrlToBytes(signature)); } catch { return false; } };

/** A narrow capability: callers submit bytes and never receive private seed material. */
export interface CanonicalSigner { readonly publicKey: string; sign(bytes: Uint8Array): Promise<string>; }
/** Test/development helper only. Production callers obtain a signer from the native SecureStore adapter. */
export const createCanonicalSigner = (seed: Uint8Array): CanonicalSigner => ({ publicKey: publicKeyFromSeed(seed), sign: async (bytes) => signBase64Url(seed, bytes) });
