import os

target_dirs = ["app", "components", "lib", "hooks"]
replacements = [
    ("lucy_os", "lucy_academia"),
    ("LUCY_OS", "LUCY_ACADEMIA"),
    ("Lucy_OS", "Lucy_Academia"),
    ("lucy os", "lucy academia"),
    ("LUCY OS", "LUCY ACADEMIA"),
    ("Lucy OS", "Lucy Academia"),
    ("lucy-os", "lucy-academia"),
    ("LUCY-OS", "LUCY-ACADEMIA"),
    ("Lucy-OS", "Lucy-Academia")
]

workspace = "/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede"

count = 0
modified_files = []

for folder in target_dirs:
    full_path = os.path.join(workspace, folder)
    if not os.path.exists(full_path):
        continue
    for root, dirs, files in os.walk(full_path):
        # Exclude hidden or build directories
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "out", ".next"]]
        for file in files:
            if not file.endswith((".ts", ".tsx", ".json", ".js", ".jsx", ".md")):
                continue
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                file_changed = False
                for target, replacement in replacements:
                    if target in new_content:
                        new_content = new_content.replace(target, replacement)
                        file_changed = True
                
                if file_changed:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    modified_files.append(file_path)
                    count += 1
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

print(f"Replacement complete. Modified {count} files.")
print("Modified files:")
for f in modified_files:
    print(f"- {f}")
