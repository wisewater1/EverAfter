import sys

log_path = r"C:\Users\wisea\.pm2\logs\fastapi-backend-error.log"

try:
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if "UnboundLocalError:" in line and "datetime" in line:
            print(f"--- MATCH FOUND AT LINE {i} ---")
            start = max(0, i - 20)
            end = min(len(lines), i + 2)
            for j in range(start, end):
                sys.stdout.write(lines[j])
            print("-" * 50)
except Exception as e:
    print(f"Script Error: {e}")
