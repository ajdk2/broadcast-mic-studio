import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

for b in ['12_12 _ Mic unplugged mid-meeting.html', '13_13 _ Voice too loud _clipping_.html', '14_14 _ Mic locked by another app.html', '27_27 _ Notifications.html']:
    with open('design_boards/' + b, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Let's search for alert banner in c
    alert = re.search(r'(<aside[^>]*aria-label=\"Alert\"[\s\S]*?</aside>|<div[^>]*role=\"alert\"[\s\S]*?</div>)', c)
    if not alert:
        alert = re.search(r'(<div style=\"[^\"]*background:\s*#(?:2A1215|2A1512|2A2111|1F1810)[^\"]*\"[\s\S]*?</div>\s*</div>)', c)
    if alert:
        print(f'=== Alert banner in {b} ===\n{alert.group(1)[:500]}\n')
    else:
        # Check diff with Board 01
        print(f'No direct alert match in {b}')
