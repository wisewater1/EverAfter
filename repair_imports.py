import os
import glob
import re

src_dir = r"c:\Users\wisea\EverAfter\EverAfter\src"
files = glob.glob(os.path.join(src_dir, "**", "*.ts*"), recursive=True)

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    changed = False
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect the specific corruption pattern
        if i + 1 < len(lines) and line.strip() == "import {" and lines[i+1].startswith("import { API_BASE_URL }"):
            # Move the API_BASE_URL import ABOVE the one it broke
            # AND fix the broken one (it was missing its '{')
            api_import = lines[i+1]
            # The broken import starts with 'import {' which we already found.
            # We just need to skip the redundant 'import {' on the next line if it exists
            # Wait, the next line IS the API import.
            new_lines.append(api_import)
            new_lines.append("import {\n") # Restore the 'import {'
            i += 2 # Skip both
            changed = True
        else:
            new_lines.append(line)
            i += 1

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print(f"Repaired: {filepath}")

print("Repair complete.")
