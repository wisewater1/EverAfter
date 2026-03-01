import re
import os

filepath = 'src/lib/api-client.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace API_BASE
content = re.sub(
    r"const API_BASE = import\.meta\.env\.VITE_API_BASE_URL \|\|.*?;",
    "const API_BASE = 'https://proud-days-tease.loca.lt';",
    content
)

# Replace Headers
content = re.sub(
    r"'Content-Type': 'application/json'(,)?",
    r"'Content-Type': 'application/json',\n      'Bypass-Tunnel-Reminder': 'true'\1",
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("api-client.ts patched successfully.")
