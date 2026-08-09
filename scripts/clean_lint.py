import json
import os
import sys
import glob

def clean_file(path):
    with open(path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith("/* eslint-disable") or line.strip().startswith("/* oxlint-disable"):
            # skip it!
            continue
        new_lines.append(line)
        
    with open(path, 'w') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    for root, dirs, files in os.walk("src"):
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                clean_file(os.path.join(root, file))
                
    for root, dirs, files in os.walk("downloaded-artifact"):
        for file in files:
            if file.endswith(".js"):
                clean_file(os.path.join(root, file))
                
    for root, dirs, files in os.walk("scripts"):
        for file in files:
            if file.endswith(".ts") or file.endswith(".mjs"):
                clean_file(os.path.join(root, file))
