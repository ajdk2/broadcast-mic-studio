import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

for b in os.listdir('design_boards'):
    if not b.endswith('.html'):
        continue
    with open(os.path.join('design_boards', b), 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Check for modals or overlays
    modal = re.search(r'(<div[^>]*aria-modal=\"true\"[\s\S]*?</div>\s*</div>\s*</div>)', c)
    if not modal:
        modal = re.search(r'(<div[^>]*role=\"dialog\"[\s\S]*?</div>\s*</div>\s*</div>)', c)
    if modal:
        name = b.replace('.html', '_modal.html')
        with open(os.path.join('extracted_views', name), 'w', encoding='utf-8') as out:
            out.write(modal.group(1))
        print('Found modal in', b)
