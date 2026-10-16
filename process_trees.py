import os
import base64
from PIL import Image
import numpy as np

def make_transparent_tree(input_path, output_png_path, size=180):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.float32)

    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    brightness = (r + g + b) / 3.0

    # Initialize alpha
    alpha = np.ones_like(brightness) * 255.0

    # Neutral gray/white detection
    is_neutral = (np.abs(r - g) < 18) & (np.abs(g - b) < 18) & (np.abs(r - b) < 18)
    
    # White background fade out
    white_mask = is_neutral & (brightness > 225)
    alpha[white_mask] = 0.0

    # Shadow fade: keep shadows semi-transparent dark
    shadow_fade = is_neutral & (brightness >= 140) & (brightness <= 225)
    alpha[shadow_fade] = ((225.0 - brightness[shadow_fade]) / 85.0) * 190.0

    # Tree leaves: green color stays fully opaque
    is_green = (g > r + 8) | (g > b + 8)
    alpha[is_green] = 255.0

    # Core trunk/branches
    is_dark = (brightness < 120) & (~white_mask)
    alpha[is_dark] = 255.0

    data[:, :, 3] = np.clip(alpha, 0, 255)
    result = Image.fromarray(data.astype(np.uint8))
    
    os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
    result = result.resize((size, size), Image.Resampling.LANCZOS)
    result.save(output_png_path, "PNG", optimize=True)
    
    with open(output_png_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

tree1 = r"C:\Users\Benny\.gemini\antigravity-ide\brain\5e2902e7-6a1c-4513-94aa-859665aaa50b\aerial_tree_topdown_1792162964369.jpg"
tree2 = r"C:\Users\Benny\.gemini\antigravity-ide\brain\5e2902e7-6a1c-4513-94aa-859665aaa50b\aerial_tree_palm_topdown_1792163007189.jpg"

b64_tree1 = make_transparent_tree(tree1, r"c:\Users\Benny\Desktop\the property project\public\trees\real-tree-1.png", 180)
b64_tree2 = make_transparent_tree(tree2, r"c:\Users\Benny\Desktop\the property project\public\trees\real-tree-palm.png", 180)

ts_content = f"""// Real Photorealistic Top-Down Aerial Architectural Trees (Base64 Sprites)
export const REAL_TREE_CANOPY = "{b64_tree1}";
export const REAL_TREE_PALM = "{b64_tree2}";
"""

ts_path = r"c:\Users\Benny\Desktop\the property project\src\app\shared\components\interactive-plot-layout\tree-assets.ts"
with open(ts_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Generated tree-assets.ts successfully!")
