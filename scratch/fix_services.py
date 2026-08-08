import os
import glob
import re

service_files = glob.glob('lib/services/*.ts') + ['lib/security.ts', 'lib/users.ts']

for file_path in service_files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Clean up any leftover comments or broken vars
    content = re.sub(r"// Replaced with top-level static import\n\s*const isEdge = !_prismaCheck;", "const isEdge = !prisma;", content)
    content = re.sub(r"// Replaced with top-level static import\n?", "", content)
    content = re.sub(r"const \{ prisma \} = require\('@/lib/prisma'\);\n?", "", content)
    content = re.sub(r'const \{ prisma \} = require\("@/lib/prisma"\);\n?', "", content)

    # Ensure top-level static import
    if "import { prisma } from '@/lib/prisma';" not in content and "import { prisma } from './prisma';" not in content:
        content = "import { prisma } from '@/lib/prisma';\n" + content

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Fixed {len(service_files)} service files.")
