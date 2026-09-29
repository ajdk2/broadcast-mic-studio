import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

with open(r'unpacked_design\e86f178a-c23e-45d1-a2cc-844d759663ef.html', 'r', encoding='utf-8') as f:
    c = f.read()

template_match = re.search(r'<script type="__bundler/template">([\s\S]*?)</script>', c)
if template_match:
    tpl_json = template_match.group(1).strip()
    tpl = json.loads(tpl_json)
    print('Template type:', type(tpl), 'length:', len(tpl))
    with open('studio_home_rendered.html', 'w', encoding='utf-8') as out:
        out.write(tpl)
    print('Wrote studio_home_rendered.html')
else:
    print('No template match')

manifest_match = re.search(r'<script type="__bundler/manifest">([\s\S]*?)</script>', c)
if manifest_match:
    man = json.loads(manifest_match.group(1))
    print('Nested manifest keys:', len(man))
