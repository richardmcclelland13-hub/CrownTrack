import { sha256 } from '@noble/hashes/sha2';
import { base64UrlToBytes, bytesToBase64Url, utf8 } from './encoding';
export const publicKeyFingerprint = (publicKey: string): string => { const value = bytesToBase64Url(sha256(base64UrlToBytes(publicKey))).slice(0, 20); return value.match(/.{1,4}/g)?.join('-') ?? value; };
export const authenticationCode = (transcript: string): string => ((((sha256(utf8(transcript))[0] << 16) | (sha256(utf8(transcript))[1] << 8) | sha256(utf8(transcript))[2]) % 1_000_000).toString().padStart(6, '0'));
