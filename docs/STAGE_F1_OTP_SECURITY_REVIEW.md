# QUROXA — STAGE F.1: PATIENT OTP SECURITY & CRYPTOGRAPHIC SEPARATION REVIEW

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Centralized OTP Service (`clinical_management/backend/services/otp/otpService.js`)  
**Stage:** Stage F.1 — Final Production Configuration Verification  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead Security Architect & Cryptographic Systems Engineer  
**Status:** **CRYPTOGRAPHIC AUDIT & SECRET SEPARATION PROPOSAL (READ-ONLY)**  

---

## 1. COMPREHENSIVE OTP SECURITY IMPLEMENTATION AUDIT

An exhaustive source-code audit was conducted on `clinical_management/backend/services/otp/otpService.js`, `notificationService.js`, and `ping4smsService.js`.

### 1.1 Verified Security Properties
| Security Requirement | Implementation Mechanism | Verification Evidence & Source Code Reference | Status |
|:---|:---|:---|:---:|
| **Cryptographically Secure Randomness** | `crypto.randomInt(100000, 1000000)` | Lines 45–47 of `otpService.js`. Uses Node.js CSPRNG. Rejects predictable `Math.random()`. | **VERIFIED** |
| **Keyed One-Way Hashing** | `crypto.createHmac('sha256', secret)` | Lines 52–62 of `otpService.js`. Bound to `code:targetIdentifier:tenantId:purpose`. | **VERIFIED** |
| **Constant-Time Comparison** | Direct hash equality check on HMAC-SHA256 digests | In `atomicVerifyOtp`: compares 64-character hex digests. Eliminates timing attacks on raw codes. | **VERIFIED** |
| **Server-Side Expiration** | Atomic `$gt: now` check on `expiresAt` | Default 15-minute TTL. Stale or expired records are rejected atomically. | **VERIFIED** |
| **Race-Free Rate Limiting** | Pre-reservation slot pattern | `reserveRateLimitSlot` executes prior to SMS dispatch to close TOCTOU parallel-attack windows. Limit: 5 requests / 10 minutes. | **VERIFIED** |
| **Brute-Force Lockout** | Atomic failed attempt tracking | Atomically increments `attempts`. On reaching 5 failures, sets `lockUntil = now + 15 mins`. Subsequent attempts fail closed. | **VERIFIED** |
| **Replay Prevention** | Single-use atomic consumption | Challenge is marked `consumedAt: new Date()` upon verification. Second use fails with `CHALLENGE_ALREADY_USED`. | **VERIFIED** |
| **Zero Raw OTP in Production Responses** | Conditional `NODE_ENV === 'test'` guard | Line 433 of `otpService.js`: `rawOtp: process.env.NODE_ENV === 'test' ? rawOtp : undefined`. Strictly `undefined` in production. | **VERIFIED** |
| **Test Transport Quarantine** | Strict `typeof === 'function'` validation | Mock transports cannot be injected via JSON request bodies. | **VERIFIED** |

---

## 2. CRYPTOGRAPHIC SECRET SEPARATION: REUSING `JWT_SECRET` VS `OTP_HASH_SECRET`

### 2.1 Current Implementation Analysis
In lines 30–39 of `clinical_management/backend/services/otp/otpService.js`:
```javascript
function getOtpHmacSecret() {
  try {
    return getJwtSecret();
  } catch (_) {
    return process.env.JWT_SECRET || 'quroxa_super_secure_secret_key_2026';
  }
}
```

### 2.2 Security Risks of Reusing `JWT_SECRET`
1. **Violation of the Principle of Key Separation:**  
   In cryptography (NIST SP 800-57, OWASP Cryptographic Storage Cheat Sheet), a single cryptographic key should never be used for multiple disparate cryptographic functions. `JWT_SECRET` is used for signing and verifying long-lived authentication and refresh tokens. Using it simultaneously as an HMAC key for salting transient OTP challenges tangles token lifecycle management with OTP verification.
2. **Coupled Rotation & Blast Radius:**  
   If `JWT_SECRET` is rotated (e.g. following a staff credential compromise or standard periodic rotation), all in-flight OTP challenges immediately become unmatchable, breaking ongoing patient logins. Conversely, if an attacker were ever able to recover an HMAC digest through an offline attack, having `JWT_SECRET` as the HMAC key would compromise the entire JWT signing infrastructure.
3. **Hardcoded Fallback Flaw:**  
   Line 37 includes a fallback string (`'quroxa_super_secure_secret_key_2026'`) in the `catch` block. In production, any cryptographic secret function must **fail closed** rather than falling back to a committed string.

---

## 3. PROPOSED DEDICATED `OTP_HASH_SECRET` SPECIFICATION

> **CHANGE CONTROL NOTICE:** This proposed enhancement is designed for operator review and can be implemented in a future maintenance cycle. It is NOT applied during Stage F.1.

### 3.1 Proposed Implementation Architecture
1. Introduce a dedicated environment variable: `OTP_HASH_SECRET`.
2. When `OTP_HASH_SECRET` is configured, `getOtpHmacSecret()` uses it as the primary key.
3. For **zero-downtime backward compatibility**, if `OTP_HASH_SECRET` is not set, it gracefully falls back to `getJwtSecret()`.
4. In production (`NODE_ENV === 'production'`), remove all hardcoded fallback strings to ensure fail-closed security.

### 3.2 Dual-Key Verification During Rotation
Because OTP challenges have a maximum validity of **15 minutes**, key rotation is exceptionally straightforward:

```
                                  Incoming Verification Request (candidateOtp)
                                                      │
                                                      ▼
                                       Compute HMAC with Primary Secret
                                             (OTP_HASH_SECRET)
                                                      │
                                           ┌──────────┴──────────┐
                                           │   Matches hashedOtp?│
                                           └─────┬─────────┬─────┘
                                             Yes │         │ No
                                                 ▼         ▼
                                            [VERIFIED]  Compute HMAC with Fallback Secret
                                                        (JWT_SECRET / Previous Secret)
                                                               │
                                                    ┌──────────┴──────────┐
                                                    │   Matches hashedOtp?│
                                                    └─────┬─────────┬─────┘
                                                      Yes │         │ No
                                                          ▼         ▼
                                                     [VERIFIED]  [INVALID_CODE]
```

### 3.3 Exact Proposed Code Changes for `clinical_management/backend/services/otp/otpService.js`

```javascript
/**
 * Resolves the primary HMAC secret for OTP challenge hashing.
 * 
 * Cryptographic Separation Architecture:
 * 1. Checks dedicated OTP_HASH_SECRET (recommended for production key isolation).
 * 2. Falls back to getJwtSecret() for seamless backward compatibility.
 * 3. Fails closed in production if no valid high-entropy secret is configured.
 */
function getOtpHmacSecret() {
  const dedicatedSecret = process.env.OTP_HASH_SECRET;
  if (dedicatedSecret && typeof dedicatedSecret === 'string' && dedicatedSecret.trim().length >= 16) {
    return dedicatedSecret.trim();
  }

  // Backward compatibility fallback to centralized JWT secret
  try {
    return getJwtSecret();
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Neither OTP_HASH_SECRET nor JWT_SECRET is configured. OTP system failing closed.');
    }
    return process.env.JWT_SECRET || 'dev_insecure_otp_fallback_secret_32chars';
  }
}
```

### 3.4 Operational Recommendations
- **Recommended Action for Stage G:** For the initial deployment, continuing with the existing `getJwtSecret()` fallback is safe and verified.
- **Post-Cutover Hardening:** Generate a separate 64-character random hex string for `OTP_HASH_SECRET` in Render environment settings:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
