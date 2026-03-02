import os
import glob
import re

src_dir = r"c:\Users\wisea\EverAfter\EverAfter\src"

files = glob.glob(os.path.join(src_dir, "**", "*.ts*"), recursive=True)

# Centralize in env.ts
env_path = os.path.join(src_dir, "lib", "env.ts")
with open(env_path, "r", encoding="utf-8") as f:
    env_content = f.read()

if "API_BASE_URL" not in env_content:
    env_content += "\n// Use VITE_API_BASE_URL from env or fallback to localtunnel/localhost\n"
    env_content += "export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8001' : 'https://proud-days-tease.loca.lt');\n"
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    # Replace absolute hardcodings
    if "http://localhost:8001" in content or "https://proud-days-tease.loca.lt" in content:
        # Determine import depth
        rel_path = os.path.relpath(filepath, src_dir)
        depth = rel_path.count(os.sep)
        if depth == 0:
            import_str = "import { API_BASE_URL } from './lib/env';"
        else:
            import_str = "import { API_BASE_URL } from '" + ("../" * depth) + "lib/env';"
        
        # We might already have it imported
        if "API_BASE_URL" not in content and filepath != env_path:
            # Need to insert import
            # Find the last import statment
            lines = content.split('\n')
            last_import = -1
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    last_import = i
            if last_import != -1:
                lines.insert(last_import + 1, import_str)
            else:
                lines.insert(0, import_str)
            content = '\n'.join(lines)
            changed = True

        # Replace 'http://localhost:8001' with `${API_BASE_URL}` inside template literals
        new_content = re.sub(r'[\'"`]http://localhost:8001([^\'"`]*)[\'"`]', r'`${API_BASE_URL}\1`', content)
        new_content = re.sub(r'[\'"`]https://proud-days-tease.loca.lt([^\'"`]*)[\'"`]', r'`${API_BASE_URL}\1`', new_content)

        # Handle edge cases where it's not a template string but just the string itself inside fetch
        if new_content != content:
            changed = True
            content = new_content

    if changed and filepath != env_path:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {filepath}")

print("Done replacing API bases.")
