"""Paste-and-run fix for the broken published worker.py in Colab.

Two bugs in the published worker break generation on a T4:

1. /health calls torch.cuda.get_grad_device_name(0), which does not exist, so the
   endpoint raises AttributeError and returns HTTP 500. The interface rejects a
   worker whose /health fails, so the app can never connect.
2. The loader uses torch_dtype=torch.bfloat16 whenever CUDA is available. A
   Tesla T4 is sm_75 and has no bfloat16 support (it needs sm_80+), so
   from_pretrained raises, load_wan_pipeline returns None, and every job fails
   with "AI Pipeline is not loaded or unsupported hardware."

The notebook sometimes leaves several nested clones behind, so this script finds
the process actually serving port 8000, patches every worker.py copy, restarts
that process, and verifies /health returns 200 with real GPU details.
"""

import glob
import json
import os
import subprocess
import sys
import time
import urllib.request

FIXES = [
    # /health must not call a method that does not exist.
    ("get_grad_device_name", "get_device_name"),
    # T4 (sm_75) supports fp16/fp32 only; bf16 needs sm_80+.
    ("torch_dtype=torch.bfloat16 if torch.cuda.is_available()",
     "torch_dtype=torch.float16 if torch.cuda.is_available()"),
]


def worker_processes():
    """Return [(pid, cwd)] for every running worker.py."""
    found = []
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        try:
            cmdline = open("/proc/%s/cmdline" % entry, "rb").read().decode("utf-8", "ignore")
            cwd = os.readlink("/proc/%s/cwd" % entry)
        except OSError:
            continue
        if "worker.py" in cmdline and "python" in cmdline:
            found.append((int(entry), cwd))
    return found


print("Running worker processes:")
running = worker_processes()
for pid, cwd in running:
    print("  pid %-7s cwd %s" % (pid, cwd))
if not running:
    print("  (none -- the worker is not running)")

# Patch every copy that exists, so whichever one we restart is fixed.
copies = sorted(set(glob.glob("/content/**/worker.py", recursive=True)))
if not copies:
    raise SystemExit("No worker.py found under /content. Run the notebook's install cell first.")

for path in copies:
    source = open(path).read()
    original = source
    for bad, good in FIXES:
        source = source.replace(bad, good)
    if source != original:
        open(path, "w").write(source)
        print("Patched", path)
    else:
        print("Already clean", path)

# Restart from the directory of the process that was serving port 8000, falling
# back to the shallowest clone if that process is gone.
target = running[0][1] if running else os.path.dirname(copies[0])
if not os.path.exists(os.path.join(target, "worker.py")):
    target = os.path.dirname(copies[0])

print("\nStopping old worker(s)...")
subprocess.run("pkill -f 'worker.py'", shell=True)
time.sleep(3)

os.makedirs(os.path.join(target, "outputs"), exist_ok=True)
log_path = os.path.join(target, "worker.log")
log = open(log_path, "w")
print("Starting worker from", target)
subprocess.Popen([sys.executable, "worker.py"], cwd=target, stdout=log, stderr=subprocess.STDOUT)

print("Waiting for /health ...")
for _ in range(90):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=3) as response:
            health = json.loads(response.read())
    except Exception:
        continue
    print(json.dumps(health, indent=2))
    if health.get("device") != "cuda":
        print("\nWARNING: device is not cuda. Use Runtime > Change runtime type > T4 GPU.")
    else:
        print("\nOK: /health is 200 on %s" % health.get("gpu_name"))
    break
else:
    print("Still unhealthy. Tail of worker.log:")
    print(open(log_path).read()[-2000:])