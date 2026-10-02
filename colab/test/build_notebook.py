import json, pathlib

def md(*lines):
    return {"cell_type": "markdown", "metadata": {}, "source": list(lines)}

def code(*lines):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": list(lines)}

cells = []

cells.append(md(
    "# 🎬 Osamah Vids — Google Colab GPU Worker\n",
    "[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/alomriosamah1-eng/Osamah-vids/blob/main/colab/osamah_vids_wan21_worker.ipynb)\n",
    "\n",
    "This notebook runs the **real** Wan2.1 diffusion video model on a GPU and serves the rendered MP4 to your **Osamah Vids** web app. There is no placeholder renderer anywhere in the pipeline — if the GPU is missing, the worker refuses connections with an explicit error.\n",
    "\n",
    "### Before you start\n",
    "1. **Runtime → Change runtime type → GPU (T4)**. A CPU runtime cannot run video diffusion.\n",
    "2. Run the cells below **in order**.\n",
    "3. Copy the tunnel URL from step 4 into the app under **Connect GPU Worker**.\n",
    "\n",
    "### Reality check on timing\n",
    "Wan2.1 1.3B on a free T4 takes roughly **4–9 minutes** for a 5-second 480p clip (81 frames, 30 steps), and the first run downloads ~8 GB of weights. This is real diffusion sampling, not a fast filter.",
))

cells.append(md(
    "### ⚡ Step 1 — Verify the GPU runtime\n",
    "\n",
    "If this prints `NO GPU`, choose **Runtime → Change runtime type → GPU**, then **Runtime → Restart session** and re-run.",
))

cells.append(code(
    "import subprocess\n",
    "\n",
    "out = subprocess.run([\"nvidia-smi\"], capture_output=True, text=True)\n",
    "if out.returncode == 0:\n",
    "    print(out.stdout)\n",
    "else:\n",
    "    print(\"NO GPU DETECTED.\")\n",
    "    print(\"Runtime -> Change runtime type -> GPU (T4), then Runtime -> Restart session.\")\n",
    "    print(out.stderr)\n",
))

cells.append(md(
    "### 📦 Step 2 — Install the real inference stack\n",
    "\n",
    "Pinned from `colab/requirements.txt`. This is the same dependency set the web app documents, so a working local GPU box and this notebook behave identically.",
))

cells.append(code(
    "!git clone --depth 1 https://github.com/alomriosamah1-eng/Osamah-vids.git /content/osamah-vids 2>/dev/null || (cd /content/osamah-vids && git pull)\n",
    "!pip install -q -r /content/osamah-vids/colab/requirements.txt\n",
    "!pip install -q pyngrok\n",
    "\n",
    "import torch, diffusers\n",
    "print(\"torch     :\", torch.__version__)\n",
    "print(\"diffusers :\", diffusers.__version__)\n",
    "print(\"cuda      :\", torch.cuda.is_available())\n",
    "if torch.cuda.is_available():\n",
    "    cap = torch.cuda.get_device_capability(0)\n",
    "    print(\"gpu       :\", torch.cuda.get_device_name(0), \"sm_%d%d\" % cap)\n",
    "    bf16 = torch.cuda.is_bf16_supported()\n",
    "    print(\"bf16 ok   :\", bf16, \"-> worker dtype:\", \"bfloat16\" if bf16 else \"float16 (T4 safe)\")\n",
    "else:\n",
    "    print(\"No GPU. The worker will refuse connections until you switch runtime.\")\n",
))

cells.append(md(
    "### 🚀 Step 3 — Start the GPU worker\n",
    "\n",
    "Starts `colab/worker.py` on port 8000 and blocks until `/health` confirms it is running on a **real GPU**.",
))

cells.append(code(
    "import os, sys, time, subprocess, json, urllib.request\n",
    "\n",
    "WORKER_DIR = \"/content/osamah-vids/colab\"\n",
    "os.makedirs(os.path.join(WORKER_DIR, \"outputs\"), exist_ok=True)\n",
    "\n",
    "log = open(os.path.join(WORKER_DIR, \"worker.log\"), \"w\")\n",
    "worker_proc = subprocess.Popen([sys.executable, \"worker.py\"], cwd=WORKER_DIR,\n",
    "                               stdout=log, stderr=subprocess.STDOUT)\n",
    "print(\"worker pid\", worker_proc.pid, \"- waiting for /health ...\")\n",
    "\n",
    "health = None\n",
    "for _ in range(40):\n",
    "    time.sleep(1)\n",
    "    try:\n",
    "        with urllib.request.urlopen(\"http://127.0.0.1:8000/health\", timeout=3) as r:\n",
    "            health = json.loads(r.read())\n",
    "            break\n",
    "    except Exception:\n",
    "        if worker_proc.poll() is not None:\n",
    "            print(open(os.path.join(WORKER_DIR, \"worker.log\")).read()[-2000:])\n",
    "            raise SystemExit(\"worker died during startup\")\n",
    "\n",
    "if not health:\n",
    "    raise SystemExit(\"worker did not become healthy within 40s\")\n",
    "\n",
    "print(json.dumps(health, indent=2))\n",
    "if health[\"device\"] != \"cuda\":\n",
    "    raise SystemExit(\"Worker is on CPU. Switch the runtime to a GPU and re-run this cell.\")\n",
    "print()\n",
    "print(\"OK: worker live on\", health[\"gpu_name\"], \"with\", health[\"vram_total_gb\"], \"GB VRAM\")\n",
))

cells.append(md(
    "### 🌐 Step 4 — Expose the worker and copy its URL\n",
    "\n",
    "The web app runs on your own machine, so the worker needs a public URL.\n",
    "\n",
    "**Option A — ngrok (recommended).** Paste a free authtoken from https://dashboard.ngrok.com into `NGROK_TOKEN` below.\n",
    "\n",
    "**Option B — localtunnel.** No account needed, but rate-limited and sometimes throttled by Colab's shared egress IP.",
))

cells.append(code(
    "NGROK_TOKEN = \"\"  # paste your ngrok authtoken here, or leave blank for localtunnel\n",
    "\n",
    "TUNNEL_URL = None\n",
    "if NGROK_TOKEN.strip():\n",
    "    from pyngrok import ngrok\n",
    "    ngrok.config.set_auth_token(NGROK_TOKEN.strip())\n",
    "    TUNNEL_URL = ngrok.connect(8000).public_url\n",
    "else:\n",
    "    proc = subprocess.Popen([\"npx\", \"-y\", \"localtunnel\", \"--port\", \"8000\"],\n",
    "                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)\n",
    "    for _ in range(45):\n",
    "        time.sleep(1)\n",
    "        line = proc.stdout.readline()\n",
    "        if \"https://\" in line:\n",
    "            TUNNEL_URL = line.strip().split()[0]\n",
    "            break\n",
    "\n",
    "print(\"=\" * 66)\n",
    "if TUNNEL_URL:\n",
    "    print(\"Paste this URL into Osamah Vids -> Connect GPU Worker:\")\n",
    "    print()\n",
    "    print(\"   \", TUNNEL_URL)\n",
    "    print()\n",
    "    print(\"The app verifies the URL is alive AND on a GPU before accepting it.\")\n",
    "else:\n",
    "    print(\"Could not open a tunnel. Re-run this cell, or use ngrok with a token.\")\n",
    "print(\"=\" * 66)\n",
))

cells.append(md(
    "### 🧪 Step 5 (optional) — Generate a clip from inside Colab\n",
    "\n",
    "Confirms the model works before wiring up the web app. Expect several minutes.\n",
    "\n",
    "> **Why you get ~5 s at 16 fps and not 24 fps:** Wan2.1 is trained on **81 frames at 16 fps**. Asking for 120 frames at 24 fps exceeds its temporal length, so the worker clamps the denoised frame count and derives the playback fps from it. Asking for more frames than the model supports does not give you a longer clip, it gives you a broken one.",
))

cells.append(code(
    "jid = \"colab_selftest\"\n",
    "req = {\n",
    "    \"job_id\": jid,\n",
    "    \"prompt\": \"A cinematic drone shot over a Yemeni coffee farm at sunrise, golden light, mist between the trees, slow forward camera move\",\n",
    "    \"model\": \"wan2.1-1.3b\",\n",
    "    \"resolution\": \"480p\",\n",
    "    \"aspect_ratio\": \"16:9\",\n",
    "    \"duration\": 5,\n",
    "    \"fps\": 24,\n",
    "    \"num_inference_steps\": 30,\n",
    "    \"guidance_scale\": 6.0,\n",
    "    \"seed\": 12345,\n",
    "}\n",
    "urllib.request.urlopen(urllib.request.Request(\n",
    "    \"http://127.0.0.1:8000/generate\",\n",
    "    data=json.dumps(req).encode(),\n",
    "    headers={\"Content-Type\": \"application/json\"},\n",
    "))\n",
    "\n",
    "while True:\n",
    "    with urllib.request.urlopen(\"http://127.0.0.1:8000/job/\" + jid) as r:\n",
    "        st = json.loads(r.read())\n",
    "    print(\"%-11s %3d%%  %s\" % (st[\"status\"], st.get(\"progress\", 0), st.get(\"step\", \"\")), flush=True)\n",
    "    if st[\"status\"] in (\"completed\", \"failed\"):\n",
    "        break\n",
    "    time.sleep(10)\n",
    "\n",
    "print(json.dumps(st, indent=2))\n",
    "if st[\"status\"] == \"completed\":\n",
    "    print()\n",
    "    print(\"Play it:\", os.path.join(WORKER_DIR, \"outputs\", jid + \".mp4\"))\n",
))

nb = {
    "cells": cells,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"gpuType": "T4", "provenance": []},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}

out = pathlib.Path("/home/osamah/program/osamah_vids/colab/osamah_vids_wan21_worker.ipynb")
out.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n")

# verify
nb2 = json.loads(out.read_text())
print("valid JSON, cells:", len(nb2["cells"]))
bad = 0
for i, c in enumerate(nb2["cells"]):
    if c["cell_type"] != "code":
        continue
    src = "".join(c["source"])
    py = "\n".join(l for l in src.split("\n") if not l.lstrip().startswith(("!", "%")))
    try:
        compile(py, f"cell{i}", "exec")
    except SyntaxError as e:
        bad += 1
        print(f"  SYNTAX ERROR cell {i}: {e}")
print("all code cells compile" if not bad else f"{bad} real errors")
