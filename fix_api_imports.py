import os
import glob
import re

src_dir = r"c:\Users\wisea\EverAfter\EverAfter\src"
files = glob.glob(os.path.join(src_dir, "**", "*.ts*"), recursive=True)
env_path = os.path.join(src_dir, "lib", "env.ts")

for filepath in files:
    if filepath == env_path:
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Re-centralize localhost/localtunnel if any missed
    content = re.sub(r'[\'"`]http://localhost:8001([^\'"`]*)[\'"`]', r'`${API_BASE_URL}\1`', content)
    content = re.sub(r'[\'"`]https://proud-days-tease.loca.lt([^\'"`]*)[\'"`]', r'`${API_BASE_URL}\1`', content)

    if "API_BASE_URL" in content and "import { API_BASE_URL }" not in content:
        # Determine import depth
        rel_path = os.path.relpath(filepath, src_dir)
        depth = rel_path.count(os.sep)
        if depth == 0:
            import_str = "import { API_BASE_URL } from './lib/env';"
        else:
            import_str = "import { API_BASE_URL } from '" + ("../" * depth) + "lib/env';"
        
        lines = content.split('\n')
        # Insert at top or after last import
        last_import = -1
        for i, line in enumerate(lines):
            if line.strip().startswith("import "):
                last_import = i
        
        if last_import != -1:
            lines.insert(last_import + 1, import_str)
        else:
            lines.insert(0, import_str)
            
        content = '\n'.join(lines)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed import in: {filepath}")
    elif "API_BASE_URL" in content:
        # Just write in case re.sub made changes
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

print("Check complete.")
