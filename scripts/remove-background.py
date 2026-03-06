from rembg import remove
from PIL import Image
import io

print("Loading YouTube thumbnail...")
input_img = Image.open("images/references/rooney-youtube-thumbnail.jpg")

print("Removing background (this may take 30-60s)...")
output = remove(input_img)

output.save("images/references/rooney-cutout.png")
print(f"✓ Saved transparent cutout: images/references/rooney-cutout.png")
print(f"  Dimensions: {output.size}")
