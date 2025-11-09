#!/usr/bin/env python3
import os
import json

print("🔍 Checking for Firebase credentials in Python...")

project_id = os.environ.get('FIREBASE_PROJECT_ID')
service_account = os.environ.get('FIREBASE_SERVICE_ACCOUNT')

print(f"FIREBASE_PROJECT_ID: {'Found' if project_id else 'Not found'}")
print(f"FIREBASE_SERVICE_ACCOUNT: {'Found' if service_account else 'Not found'}")

if not service_account or not project_id:
    print("\n❌ Credentials not accessible from Python either")
    exit(1)

# Write to .env file
with open('.env', 'w') as f:
    f.write(f"FIREBASE_PROJECT_ID={project_id}\n")
    f.write(f"FIREBASE_SERVICE_ACCOUNT={service_account}\n")

print("\n✅ .env file created successfully!")
print("Now running deployment...")

import subprocess
subprocess.run(['bun', 'run', 'deploy'])
