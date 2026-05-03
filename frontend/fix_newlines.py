import json

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if content.startswith('\"import '):
            content = json.loads(content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Fixed', filepath)
        else:
            print('Already fixed or format mismatch', filepath)
    except Exception as e:
        print('Error:', e)

fix_file('e:/AI/internal-management-system/frontend/src/ManufacturerAuditDashboard.jsx')
fix_file('e:/AI/internal-management-system/frontend/src/ManufacturerAuditPage.jsx')
