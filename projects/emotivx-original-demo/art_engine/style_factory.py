from dataclasses import dataclass
from typing import Any, Dict

try:
    from diffusers import StableDiffusionXLImg2ImgPipeline
except Exception:  # pragma: no cover
    StableDiffusionXLImg2ImgPipeline = None


@dataclass
class StyleConfig:
    model_id: str
    device: str = "cuda"


class StyleFactory:
    def __init__(self, config: StyleConfig) -> None:
        if StableDiffusionXLImg2ImgPipeline is None:
            raise RuntimeError("diffusers is required for StyleFactory.")
        self.pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(
            config.model_id
        ).to(config.device)

    def stylize_realistic(self, image: Any, prompt: str) -> Dict[str, Any]:
        result = self.pipe(prompt=prompt, image=image)
        return {"mode": "realistic", "image": result.images[0]}

    def stylize_cartoon(self, image: Any, prompt: str) -> Dict[str, Any]:
        result = self.pipe(prompt=prompt, image=image)
        return {"mode": "cartoon", "image": result.images[0]}
