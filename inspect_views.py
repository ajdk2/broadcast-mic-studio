import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

boards = [
    '01_01 _ Studio _home_.html',
    '02_02 _ First run _ Voice check.html',
    '03_03 _ Fine-tune.html',
    '04_04 _ Connect apps.html',
    '05_05 _ Settings.html',
    '15_15 _ Profiles.html',
    '25_25 _ Save as new profile.html',
    '26_26 _ Delete profile.html',
    '27_27 _ Notifications.html',
    '28_28 _ Fine-tune _ Mic correction.html',
    '29_29 _ Test my sound _record _amp_ compare_.html',
]

os.makedirs('extracted_views', exist_ok=True)

for b in boards:
    path = os.path.join('design_boards', b)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract <main> or the container
    main_match = re.search(r'<main[\s\S]*?</main>', content)
    dialog_match = re.search(r'<div role=\"dialog\"[\s\S]*?</div>\s*</div>\s*</div>', content)
    script_match = re.search(r'<script type=\"text/x-dc\"[\s\S]*?</script>', content)

    base = b.split('.')[0]
    if main_match:
        with open(os.path.join('extracted_views', f'{base}_main.html'), 'w', encoding='utf-8') as out:
            out.write(main_match.group(0))
    if script_match:
        with open(os.path.join('extracted_views', f'{base}_script.js'), 'w', encoding='utf-8') as out:
            out.write(script_match.group(0))

print('Extracted views saved to extracted_views/')
