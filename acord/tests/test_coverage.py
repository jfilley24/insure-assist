import json
import re
import os

def test_field_coverage():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    with open(os.path.join(base_dir, 'acord_fields.txt'), 'r') as f:
        all_fields = set(line.strip() for line in f if line.strip())

    with open(os.path.join(base_dir, 'main.py'), 'r') as f:
        main_content = f.read()

    with open(os.path.join(base_dir, 'prompts', 'completer.txt'), 'r') as f:
        prompt_content = f.read()

    all_fields = {f for f in all_fields if f not in ('F[0]', 'F[0].P1[0]')}

    missing = set()
    for field in all_fields:
        base_name = re.sub(r'_[A-Z]\[0\]$', '', field)
        base_name = re.sub(r'\[0\]$', '', base_name)
        base_name = base_name.split('.')[-1]
        
        if base_name not in main_content and base_name not in prompt_content:
            missing.add(field)

    print(f'Total fields defined: {len(all_fields)}')
    
    if missing:
        with open('missing_fields.txt', 'w') as f:
            for m in sorted(missing):
                f.write(m + '\n')
        print(f"Wrote {len(missing)} missing fields to missing_fields.txt")
        assert False, f"{len(missing)} fields are totally unmapped!"
    else:
        print('SUCCESS: All fields are mapped somewhere!')

if __name__ == "__main__":
    test_field_coverage()
