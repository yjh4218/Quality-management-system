import os
import re

files_to_fix = [
    'src/ManufacturerManagementPage.jsx',
    'src/ManufacturerSearchModal.jsx',
    'src/ProductionAuditPage.jsx',
    'src/QualityManagementPage.jsx',
    'src/RoleManagementPage.jsx',
    'src/UserManagementPage.jsx'
]

for file in files_to_fix:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = re.sub(r'<AgGridReact(?!\s*theme="legacy")', '<AgGridReact theme="legacy"', content)
        
        if content != new_content:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Added legacy theme to', file)
    except Exception as e:
        print('Error on', file, e)
