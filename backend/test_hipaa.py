import asyncio
import json
import logging
import uuid
from termcolor import colored

# Configure simple logging
logging.basicConfig(level=logging.ERROR)

from app.services.hipaa_service import hipaa_service
from app.services.vulnerability_service import vulnerability_service

def print_header(title):
    print(colored(f"\n{'='*50}", "cyan"))
    print(colored(f"  {title}", "cyan", attrs=['bold']))
    print(colored(f"{'='*50}", "cyan"))

def print_success(msg):
    print(colored(f"  [PASS] {msg}", "green"))

def print_fail(msg):
    print(colored(f"  [FAIL] {msg}", "red"))

async def run_tests():
    user_id = str(uuid.uuid4())
    print_header("HIPAA COMPLIANCE VALIDATION SCRIPT")

    # ---------------------------------------------------------
    # Test 1: Minimum Necessary Standard (§164.514(d))
    # ---------------------------------------------------------
    print(colored("\n1. Testing Minimum Necessary Standard...", "yellow"))
    
    # RAPHAEL (Health domain) requesting biometrics
    st_raphael = "raphael"
    raphael_req = ["heart_rate", "blood_pressure"]
    res1 = hipaa_service.check_minimum_necessary(st_raphael, raphael_req, "Health Check")
    
    if res1["compliant"]:
        print_success("St. Raphael allowed to access biometric PHI.")
    else:
        print_fail("St. Raphael was denied biometric PHI.")

    # JOSEPH (Family domain) requesting clinical data
    st_joseph = "joseph"
    joseph_req = ["diagnosis", "medication"]
    res2 = hipaa_service.check_minimum_necessary(st_joseph, joseph_req, "Checking on Grandma")
    
    if not res2["compliant"] and "diagnosis" in res2["violations"]:
        print_success("St. Joseph correctly denied access to clinical PHI.")
    else:
        print_fail(f"St. Joseph bypass: {res2}")

    # ---------------------------------------------------------
    # Test 2: PHI Access Logging (§164.312(b))
    # ---------------------------------------------------------
    print(colored("\n2. Testing PHI Access Logs (St. Anthony's Ledger)...", "yellow"))
    
    # Log an event manually
    hipaa_service.log_phi_access(
        user_id=user_id,
        saint_id="raphael",
        action="read_vitals",
        data_types=["biometrics"],
        context="User asked for daily summary",
        outcome="allowed"
    )
    
    # Read the log back
    log = hipaa_service.get_access_log(user_id=user_id, limit=5)
    
    if len(log) >= 1 and log[0]["action"] == "read_vitals":
        print_success(f"Log written successfully. Event ID: {log[0]['event_id']}")
    else:
        print_fail("Failed to retrieve written log.")

    # ---------------------------------------------------------
    # Test 3: Vulnerability Scanner PHI Detection
    # ---------------------------------------------------------
    print(colored("\n3. Testing Vulnerability Scanner PHI Rules...", "yellow"))

    test_strings = [
        ("My MRN 123456 got leaked.", "Medical Record Number [PHI]"),
        ("I take 10mg of lisinopril every day.", "Prescription/Medication [PHI]"),
        ("My recent blood pressure was 140/90.", "Biometric Identifier [PHI]"),
        ("Just got an ICD code E11.9 diagnosis", "ICD/CPT Code [PHI]")
    ]

    all_pass = True
    for text, expected in test_strings:
        leaks = vulnerability_service._scan_text_for_pii(text)
        if expected in leaks:
            print_success(f"Detected: {expected} in text")
        else:
            print_fail(f"Failed to detect {expected} in: '{text}'")
            all_pass = False

    # ---------------------------------------------------------
    # Test 4: Compliance Report Generation
    # ---------------------------------------------------------
    print(colored("\n4. Testing Aggregated Compliance Report...", "yellow"))
    
    report = hipaa_service.get_compliance_report(user_id)
    
    if report["certifying_saints"]["security_officer"] == "St. Michael — §164.308(a)(2)":
        print_success("St. Michael recognized as Security Officer.")
    else:
        print_fail("St. Michael missing from report.")

    if report["certifying_saints"]["audit_officer"] == "St. Anthony — §164.312(b)":
        print_success("St. Anthony recognized as Audit Officer.")
    else:
        print_fail("St. Anthony missing from report.")

    if report["total_phi_events"] > 0:
        print_success(f"Report correctly aggregated {report['total_phi_events']} events.")
    else:
        print_fail("Report failed to aggregate events.")

    score = report["compliance_score"]
    print(f"  [INFO] Simulated Compliance Score: {score}")

    print_header("VALIDATION COMPLETE")

if __name__ == "__main__":
    asyncio.run(run_tests())
