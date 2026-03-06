# Test script for Diffusers + ControlNet
# Save as test_pose.py in the workspace directory

import torch
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler
from controlnet_aux import OpenposeDetector
from PIL import Image
import os

# Check MPS availability
print(f"MPS available: {torch.backends.mps.is_available()}")
print(f"MPS built: {torch.backends.mps.is_built()}")

# Initialize OpenPose detector
print("Loading OpenPose detector...")
openpose = OpenposeDetector.from_pretrained("lllyasviel/Annotators")

# Load ControlNet and pipeline
print("Loading ControlNet model...")
controlnet = ControlNetModel.from_pretrained(
    "lllyasviel/sd-controlnet-openpose", 
    torch_dtype=torch.float16
)

print("Loading SD pipeline...")
pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float16
)

# Optimize for M4
pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)
pipe.enable_attention_slicing()
pipe = pipe.to("mps")

# Load test images
test_images = [
    "/Users/claudia/.openclaw/workspace/images/references/rooney-youtube-thumbnail.jpg",
    "/Users/claudia/.openclaw/workspace/images/references/rooney-cutout.png"
]

for i, image_path in enumerate(test_images):
    if os.path.exists(image_path):
        print(f"\nProcessing image {i+1}: {image_path}")
        
        # Load image
        input_image = Image.open(image_path)
        
        # Resize if too large to avoid OOM
        max_size = 512
        if input_image.width > max_size or input_image.height > max_size:
            input_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Extract pose
        print("Extracting pose...")
        pose_image = openpose(input_image, hand_and_face=True)
        pose_image.save(f"test_pose_{i+1}.png")  # Save to verify pose detection
        
        # Generate artistic versions with different prompts
        prompts = [
            "oil painting of a footballer, dramatic lighting, museum quality, masterpiece",
            "watercolor painting, vibrant colors, sports art, dynamic composition",
            "charcoal sketch, dramatic shadows, fine art, black and white"
        ]
        
        negative_prompt = "photo, realistic, low quality, blurry, distorted"
        
        for j, prompt in enumerate(prompts):
            print(f"Generating version {j+1}: {prompt[:50]}...")
            
            output = pipe(
                prompt,
                image=pose_image,
                num_inference_steps=20,
                negative_prompt=negative_prompt,
                generator=torch.Generator(device="cpu").manual_seed(42)
            ).images[0]
            
            output.save(f"artistic_output_{i+1}_v{j+1}.png")
            print(f"Saved: artistic_output_{i+1}_v{j+1}.png")
    else:
        print(f"Image not found: {image_path}")

print("\nAll tests completed!")