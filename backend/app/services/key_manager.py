"""
High-level helpers for deriving private keys and encrypting secrets
using the user's username + master password combination.

Security goals:
  * Derive a 256-bit symmetric key (K_master) via Argon2id
  * Use AES-GCM (AEAD) with random nonces per entry
  * Persist only KDF salt/parameters + ciphertext+nonce
"""
from __future__ import annotations

import base64
import hashlib
import os
from dataclasses import dataclass
from typing import Literal, Optional

from argon2.low_level import Type as Argon2Type, hash_secret_raw
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


DEFAULT_KEY_SIZE = 32  # 256-bit
DEFAULT_NONCE_SIZE = 12  # Recommended size for AES-GCM


def _decode_salt(salt_b64: str) -> bytes:
    try:
        return base64.b64decode(salt_b64.encode("ascii"))
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ValueError("Invalid salt encoding") from exc


def generate_user_salt(length: int = 16) -> str:
    """
    Create a random salt for a user record. Store alongside the user and
    use it for every KDF derivation.
    """
    if length < 16:
        raise ValueError("Encryption salt must be at least 16 bytes")
    return base64.b64encode(os.urandom(length)).decode("ascii")


def derive_master_key(
    *,
    username: str,
    master_password: str,
    user_salt_b64: str,
    hash_len: int = DEFAULT_KEY_SIZE,
    time_cost: Optional[int] = None,
    memory_cost: Optional[int] = None,
    parallelism: Optional[int] = None,
) -> bytes:
    """
    Run Argon2id over the master password using a salt that blends the
    stored random salt with the username. The username is public and
    simply ensures two users with identical passwords still yield
    independent keys.
    """
    if not username or not master_password:
        raise ValueError("Username and master password are required")

    salt_bytes = _decode_salt(user_salt_b64)
    username_bytes = username.strip().lower().encode("utf-8")

    # H = SHA-256(salt || ":" || username)
    mixed_salt = hashlib.sha256(salt_bytes + b":" + username_bytes).digest()

    return hash_secret_raw(
        secret=master_password.encode("utf-8"),
        salt=mixed_salt,
        time_cost=time_cost or settings.ARGON2_TIME_COST,
        memory_cost=memory_cost or settings.ARGON2_MEMORY_COST,
        parallelism=parallelism or settings.ARGON2_PARALLELISM,
        hash_len=hash_len,
        type=Argon2Type.ID,
    )


@dataclass(frozen=True)
class EncryptedPayload:
    """Serialized encrypted payload ready for storage."""

    nonce: str  # base64 encoded nonce
    ciphertext: str  # base64 encoded ciphertext (includes auth tag)

    def as_dict(self) -> dict[str, str]:
        return {"nonce": self.nonce, "ciphertext": self.ciphertext}


def encrypt_secret(master_key: bytes, plaintext: str) -> EncryptedPayload:
    """
    Encrypt plaintext using AES-GCM under the provided master key.
    """
    if len(master_key) != DEFAULT_KEY_SIZE:
        raise ValueError("master_key must be 32 bytes (256-bit)")

    aesgcm = AESGCM(master_key)
    nonce = os.urandom(DEFAULT_NONCE_SIZE)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), associated_data=None)

    return EncryptedPayload(
        nonce=base64.b64encode(nonce).decode("ascii"),
        ciphertext=base64.b64encode(ciphertext).decode("ascii"),
    )


def decrypt_secret(master_key: bytes, *, nonce_b64: str, ciphertext_b64: str) -> str:
    """
    Decrypt ciphertext that was produced by encrypt_secret.
    """
    if len(master_key) != DEFAULT_KEY_SIZE:
        raise ValueError("master_key must be 32 bytes (256-bit)")

    aesgcm = AESGCM(master_key)
    nonce = base64.b64decode(nonce_b64.encode("ascii"))
    ciphertext = base64.b64decode(ciphertext_b64.encode("ascii"))

    plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data=None)
    return plaintext.decode("utf-8")

