import json
import os
from app.services.diagnostic_service import diagnostic_service

def verify_system():
    print("EverAfter Native Stack Audit...")
    report = diagnostic_service.run_full_audit()
    
    print(f"\nOverall Status: {report['overall_status']}")
    print(f"Resources: {json.dumps(report['resources'], indent=2)}")
    print(f"Dependencies: {json.dumps(report['dependencies'], indent=2)}")
    print(f"Models Found: {len(report['models'])}")
    
    if report['overall_status'] == "READY":
        print("\nSUCCESS: All native components are functional.")
    else:
        print("\nWARNING: Some components are degraded. Check the report above.")

if __name__ == "__main__":
    # Ensure PYTHONPATH is correct
    import sys
    sys.path.append(os.getcwd())
    verify_system()
