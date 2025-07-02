

from typing import Dict, Any, Type
from shape_defs import Circle, Rectangle, Triangle, Shape

class ShapeFactory:
    _registry: Dict[str, Type[Shape]] = {
        "circle": Circle,
        "rectangle": Rectangle,
        "triangle": Triangle
    }

    @classmethod
    def register(cls, name: str, shape_cls: Type[Shape]) -> None:
        cls._registry[name.lower()] = shape_cls

    @classmethod
    def create(cls, name: str, **kwargs: Any) -> Shape:
        key = name.lower()
        if key not in cls._registry:
            raise ValueError(f"Unknown shape: {name}")
        return cls._registry[key](**kwargs)

