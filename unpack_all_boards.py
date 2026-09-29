import os
import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

unpacked_dir = r'unpacked_design'
page_order_path = os.path.join(unpacked_dir, 'page_order.json')
template_path = os.path.join(unpacked_dir, 'template.html')

with open(page_order_path, 'r', encoding='utf-8') as f:
    page_order = json.load(f)

with open(template_path, 'r', encoding='utf-8') as f:
    template_content = f.read()

# Map uuid to board title
board_titles = {}
matches = re.findall(r'<h2>(.*?)</h2><iframe src=\"about:blank#([0-9a-f\-]+)\"', template_content)
for title, uuid in matches:
    board_titles[uuid] = title

out_dir = 'design_boards'
os.makedirs(out_dir, exist_ok=True)

print(f'Total boards in order: {len(page_order)}')

for idx, uuid in enumerate(page_order):
    fname = os.path.join(unpacked_dir, f'{uuid}.html')
    if not os.path.exists(fname):
        print(f'Missing {fname}')
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    title = board_titles.get(uuid, f'Board_{idx+1}')
    safe_title = re.sub(r'[^\w\s\-\.]', '_', title).strip()
    
    # Check if there is an inner __bundler/template
    inner_tpl = re.search(r'<script type=\"__bundler/template\">([\s\S]*?)</script>', content)
    if inner_tpl:
        try:
            rendered = json.loads(inner_tpl.group(1).strip())
        except Exception as e:
            rendered = inner_tpl.group(1)
    else:
        rendered = content
    
    out_file = os.path.join(out_dir, f'{idx+1:02d}_{safe_title}.html')
    with open(out_file, 'w', encoding='utf-8') as out:
        out.write(rendered)
    print(f'Wrote: {out_file} ({len(rendered)} bytes)')
