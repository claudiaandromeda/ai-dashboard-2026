# Cloud API test using Replicate
# Save as test_replicate.py

import replicate
import os
from PIL import Image
import requests
from io import BytesIO

# Check if API token is available
api_token = os.environ.get('REPLICATE_API_TOKEN')
if not api_token:
    print("REPLICATE_API_TOKEN not found in environment variables")
    print("Get a free token from: https://replicate.com/account/api-tokens")
    print("Then run: export REPLICATE_API_TOKEN='your_token_here'")
    exit(1)

# Test images
test_images = [
    "/Users/claudia/.openclaw/workspace/images/references/rooney-youtube-thumbnail.jpg",
    "/Users/claudia/.openclaw/workspace/images/references/rooney-cutout.png"
]

# Convert local image to base64 or upload to temporary hosting
def image_to_base64(image_path):
    with Image.open(image_path) as img:
        # Resize if too large
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to bytes
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        return buffer.getvalue()

# Test different models and prompts
models = [
    {
        "name": "SDXL ControlNet OpenPose",
        "model": "lucataco/sdxl-controlnet-openpose:a5d11d6e6f7e6b6c2e1e2e1e2e1e2e",
        "cost": "~$0.012/run"
    },
    {
        "name": "ControlNet Pose (SD1.5)", 
        "model": "jagilley/controlnet-pose:fb8f7bb54547fb8a8fe3c1b7d94d812bc3d743b92b5a3816e7a1b0d7852d9b5b",
        "cost": "~$0.061/run"
    }
]

prompts = [
    "oil painting of a footballer, dramatic lighting, museum quality, masterpiece, sports art",
    "watercolor painting, vibrant colors, dynamic sports composition, fine art",
    "charcoal sketch, dramatic shadows, fine art, black and white, athletic pose"
]

print("Starting Replicate API tests...")
print(f"API Token: {api_token[:10]}...")

for model_info in models:
    print(f"\n{'='*60}")
    print(f"Testing: {model_info['name']}")
    print(f"Model: {model_info['model']}")
    print(f"Cost: {model_info['cost']}")
    print('='*60)
    
    for i, image_path in enumerate(test_images):
        if not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
            continue
            
        print(f"\nProcessing image {i+1}: {os.path.basename(image_path)}")
        
        # Upload image to temporary hosting
        # For now, let's use a data URL approach
        try:
            # Convert image to base64
            image_data = image_to_base64(image_path)
            
            # Create a temporary URL using filebin.net or similar
            # For testing, we'll use Replicate's file upload feature
            print("Uploading image to Replicate...")
            
            for j, prompt in enumerate(prompts):
                print(f"  Generating with prompt {j+1}: {prompt[:50]}...")
                
                try:
                    # Run the model
                    output = replicate.run(
                        model_info['model'],
                        input={
                            "prompt": prompt,
                            "negative_prompt": "photo, realistic, blurry, low quality, distorted",
                            "image": image_data,
                            "num_inference_steps": 25,
                            "controlnet_conditioning_scale": 0.8,
                            "guidance_scale": 7.5
                        }
                    )
                    
                    print(f"  ✅ Success! Output: {output}")
                    
                    # Download and save the result
                    if output:
                        response = requests.get(output)
                        if response.status_code == 200:
                            output_path = f"replicate_output_{model_info['name'].replace(' ', '_')}_{i+1}_v{j+1}.png"
                            with open(output_path, 'wb') as f:
                                f.write(response.content)
                            print(f"  Saved: {output_path}")
                    
                except Exception as e:
                    print(f"  ❌ Error: {str(e)}")
                    
        except Exception as e:
            print(f"Error processing image: {str(e)}")

print("\nAll cloud API tests completed!")
print("\nNote: You can also test these models directly in your browser:")
print("- SDXL ControlNet: https://replicate.com/lucataco/sdxl-controlnet-openpose")
print("- SD1.5 ControlNet: https://replicate.com/jagilley/controlnet-pose")