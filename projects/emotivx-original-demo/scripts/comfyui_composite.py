#!/usr/bin/env python3
"""
ComfyUI garment compositing script.

Submits an img2img workflow to a local ComfyUI server to composite
garment artwork onto a product mockup using SDXL.

Usage:
    python scripts/comfyui_composite.py <input_image> [--output <path>] [--prompt <text>]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

COMFYUI_DIR = Path.home() / "ComfyUI"
COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_PATH = COMFYUI_DIR / "workflows" / "garment_composite.json"

DEFAULT_PROMPT = (
    "sports hoodie with abstract geometric artwork, black background, "
    "premium quality, product photography, studio lighting, high resolution"
)
DEFAULT_NEGATIVE = (
    "blurry, low quality, distorted, watermark, text, deformed"
)


def is_server_running() -> bool:
    """Check if ComfyUI server is reachable."""
    try:
        req = urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=3)
        return req.status == 200
    except (urllib.error.URLError, OSError):
        return False


def start_server() -> subprocess.Popen:
    """Start ComfyUI server in the background."""
    print("Starting ComfyUI server...")
    proc = subprocess.Popen(
        [sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188"],
        cwd=str(COMFYUI_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Wait for server to become ready
    for _ in range(60):
        time.sleep(1)
        if is_server_running():
            print("ComfyUI server is ready.")
            return proc
    proc.kill()
    raise RuntimeError("ComfyUI server failed to start within 60 seconds")


def upload_image(image_path: Path) -> str:
    """Upload an image to ComfyUI's input directory and return the filename."""
    dest = COMFYUI_DIR / "input" / image_path.name
    shutil.copy2(image_path, dest)
    return image_path.name


def build_api_prompt(
    input_filename: str,
    positive_prompt: str = DEFAULT_PROMPT,
    negative_prompt: str = DEFAULT_NEGATIVE,
    denoise: float = 0.55,
    seed: int = 42,
) -> dict:
    """Build the ComfyUI API prompt from the workflow template."""
    # API format uses node IDs as keys with class_type + inputs
    return {
        "prompt": {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
            },
            "2": {
                "class_type": "VAELoader",
                "inputs": {"vae_name": "sdxl_vae.safetensors"},
            },
            "3": {
                "class_type": "LoadImage",
                "inputs": {"image": input_filename, "upload": "image"},
            },
            "4": {
                "class_type": "VAEEncode",
                "inputs": {"pixels": ["3", 0], "vae": ["2", 0]},
            },
            "5": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": positive_prompt, "clip": ["1", 1]},
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_prompt, "clip": ["1", 1]},
            },
            "7": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["5", 0],
                    "negative": ["6", 0],
                    "latent_image": ["4", 0],
                    "seed": seed,
                    "control_after_generate": "fixed",
                    "steps": 25,
                    "cfg": 7.5,
                    "sampler_name": "euler_ancestral",
                    "scheduler": "normal",
                    "denoise": denoise,
                },
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["7", 0], "vae": ["2", 0]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["8", 0],
                    "filename_prefix": "garment_composite",
                },
            },
        },
        "client_id": str(uuid.uuid4()),
    }


def queue_prompt(api_prompt: dict) -> str:
    """Submit a prompt to ComfyUI and return the prompt_id."""
    data = json.dumps(api_prompt).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read())
    return result["prompt_id"]


def poll_for_completion(prompt_id: str, timeout: int = 300) -> dict:
    """Poll ComfyUI history until the prompt completes or times out."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(
                f"{COMFYUI_URL}/history/{prompt_id}", timeout=5
            )
            history = json.loads(resp.read())
            if prompt_id in history:
                return history[prompt_id]
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(2)
    raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout}s")


def get_output_image(history: dict) -> Path | None:
    """Extract the output image path from the completed history entry."""
    outputs = history.get("outputs", {})
    for node_id, node_output in outputs.items():
        images = node_output.get("images", [])
        for img in images:
            filename = img.get("filename")
            subfolder = img.get("subfolder", "")
            if filename:
                return COMFYUI_DIR / "output" / subfolder / filename
    return None


def main():
    parser = argparse.ArgumentParser(description="ComfyUI garment compositing")
    parser.add_argument("input_image", type=Path, help="Path to input garment image")
    parser.add_argument("--output", type=Path, default=None, help="Copy output to this path")
    parser.add_argument("--prompt", type=str, default=DEFAULT_PROMPT, help="Positive prompt")
    parser.add_argument("--negative", type=str, default=DEFAULT_NEGATIVE, help="Negative prompt")
    parser.add_argument("--denoise", type=float, default=0.55, help="Denoise strength (0-1)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--timeout", type=int, default=300, help="Generation timeout in seconds")
    args = parser.parse_args()

    if not args.input_image.exists():
        print(f"Error: Input image not found: {args.input_image}", file=sys.stderr)
        sys.exit(1)

    # Verify models exist
    ckpt = COMFYUI_DIR / "models" / "checkpoints" / "sd_xl_base_1.0.safetensors"
    vae = COMFYUI_DIR / "models" / "vae" / "sdxl_vae.safetensors"
    if not ckpt.exists():
        print(f"Error: SDXL checkpoint not found: {ckpt}", file=sys.stderr)
        print("Download it first — see task instructions.", file=sys.stderr)
        sys.exit(1)
    if not vae.exists():
        print(f"Error: SDXL VAE not found: {vae}", file=sys.stderr)
        sys.exit(1)

    # Start server if needed
    server_proc = None
    if not is_server_running():
        server_proc = start_server()

    try:
        # Upload input image
        input_filename = upload_image(args.input_image)
        print(f"Uploaded: {input_filename}")

        # Build and submit prompt
        api_prompt = build_api_prompt(
            input_filename=input_filename,
            positive_prompt=args.prompt,
            negative_prompt=args.negative,
            denoise=args.denoise,
            seed=args.seed,
        )
        prompt_id = queue_prompt(api_prompt)
        print(f"Queued prompt: {prompt_id}")

        # Wait for completion
        print("Generating...")
        history = poll_for_completion(prompt_id, timeout=args.timeout)

        # Get output
        output_path = get_output_image(history)
        if output_path and output_path.exists():
            print(f"Output: {output_path}")
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(output_path, args.output)
                print(f"Copied to: {args.output}")
            return str(output_path)
        else:
            print("Error: No output image produced", file=sys.stderr)
            sys.exit(1)

    finally:
        if server_proc:
            print("Stopping ComfyUI server...")
            server_proc.terminate()
            server_proc.wait(timeout=10)


if __name__ == "__main__":
    main()
