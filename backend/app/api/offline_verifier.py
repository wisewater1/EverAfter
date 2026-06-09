# offline_verifier.py
import json
import hashlib
import hmac
import sys

# In a real auditor scenario, this secret would be securely provided out-of-band by EverAfter
# or verified via public-key cryptography (e.g. RSA/ECDSA). For this implementation, we use HMAC.
SIGNING_SECRET = b"fallback_system_secret_key"

def verify_ledger(ledger_file: str):
    """
    Stand-alone cryptographic verifier for St. Anthony's Audit Ledger.
    Does not require database access or EverAfter runtime.
    """
    try:
        with open(ledger_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load ledger file: {e}")
        sys.exit(1)
        
    logs = data.get("logs", [])
    if not logs:
        print("⚠️ No logs found to verify.")
        sys.exit(0)
        
    print(f"🔍 Analyzing {len(logs)} audit proof entries...")
    
    current_prev = logs[0].get("prevHash") if logs else "genesis_hash_0000000000000000"
    valid_count = 0
    
    for i, log in enumerate(logs):
        log_id = log.get("id")
        action = log.get("action")
        timestamp = log.get("ts")
        user_id = log.get("userId", "system")
        meta = log.get("metadata", {})
        claimed_hash = log.get("sha256")
        claimed_prev = log.get("prevHash")
        claimed_sig = log.get("signature")
        
        # 1. Check chronologic chain link
        if claimed_prev != current_prev:
            print(f"❌ CHAIN BROKEN at entry {i} (ID: {log_id}). Expected prev_hash {current_prev}, got {claimed_prev}")
            sys.exit(1)
            
        # 2. Recompute item hash
        payload = {
            "prevHash": claimed_prev,
            "ts": timestamp,
            "action": action,
            "userId": user_id,
            "metadata": meta
        }
        payload_str = json.dumps(payload, sort_keys=True)
        expected_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        
        if expected_hash != claimed_hash:
            print(f"❌ HASH TAMPERING DETECTED at entry {i} (ID: {log_id}).")
            sys.exit(1)
            
        # 3. Verify Signature
        expected_sig = hmac.new(SIGNING_SECRET, expected_hash.encode("utf-8"), hashlib.sha256).hexdigest()
        
        if expected_sig != claimed_sig:
            print(f"❌ SIGNATURE INVALID at entry {i} (ID: {log_id}). Identity not verified!")
            sys.exit(1)
            
        current_prev = claimed_hash
        valid_count += 1
        
    print(f"\n✅ AUDIT PASSED: {valid_count}/{len(logs)} entries cryptographically verified.")
    print(f"✅ Data flow integrity across {valid_count} hops is cryptographically bound and intact.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python offline_verifier.py <path_to_ledger_json>")
        sys.exit(1)
    verify_ledger(sys.argv[1])
