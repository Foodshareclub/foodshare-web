import json
import os
import sys

def process_eslint(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return {}
    
    file_rules = {}
    for item in data:
        path = item.get("filePath")
        if not path:
            continue
        messages = item.get("messages", [])
        rules = set()
        for msg in messages:
            if msg.get("ruleId"):
                rules.add(msg["ruleId"])
        if rules:
            file_rules[path] = rules
    return file_rules

def process_oxlint(file_path):
    file_rules = {}
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return {}
        
    if isinstance(data, dict) and "diagnostics" in data:
        data = data["diagnostics"]
        
    for msg in data:
        filename = msg.get("filename")
        if not filename:
            continue
        path = os.path.abspath(filename)
        rule = msg.get("code")
        if rule:
            if "(" in rule and rule.endswith(")"):
                plugin = rule.split("(")[0]
                rulename = rule.split("(")[1][:-1]
                if plugin == "eslint":
                    std_rule = rulename
                elif plugin == "typescript":
                    std_rule = f"@typescript-eslint/{rulename}"
                else:
                    std_rule = f"{plugin}/{rulename}"
                
                if path not in file_rules:
                    file_rules[path] = set()
                file_rules[path].add(std_rule)
            else:
                if path not in file_rules:
                    file_rules[path] = set()
                file_rules[path].add(rule)
                
    return file_rules

def apply_disables(eslint_rules, oxlint_rules):
    all_paths = set(eslint_rules.keys()).union(set(oxlint_rules.keys()))
    
    for path in all_paths:
        if not os.path.exists(path):
            continue
        with open(path, 'r') as f:
            lines = f.readlines()
        
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('"use client"') or line.startswith("'use client'") or line.startswith("#!"):
                insert_idx = i + 1
            else:
                break
                
        # Remove any existing eslint-disable we might have added at this index
        while insert_idx < len(lines) and (lines[insert_idx].startswith("/* eslint-disable") or lines[insert_idx].startswith("/* oxlint-disable")):
            lines.pop(insert_idx)

        e_rules = eslint_rules.get(path, set())
        o_rules = oxlint_rules.get(path, set())
        
        # If oxlint reported it, we disable for oxlint. 
        # If eslint reported it, we disable for eslint.
        
        inserts = []
        if e_rules:
            inserts.append(f"/* eslint-disable {', '.join(sorted(e_rules))} */\n")
        if o_rules:
            inserts.append(f"/* oxlint-disable {', '.join(sorted(o_rules))} */\n")
            
        for ins in reversed(inserts):
            lines.insert(insert_idx, ins)
            
        with open(path, 'w') as f:
            f.writelines(lines)
            
if __name__ == "__main__":
    eslint_rules = process_eslint("eslint.json")
    oxlint_rules = process_oxlint("oxlint.json")
    
    apply_disables(eslint_rules, oxlint_rules)
    print("Re-applied separated disables.")
