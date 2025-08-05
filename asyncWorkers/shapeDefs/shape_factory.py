from typing import Dict, Any, Type, List
from shape_defs import Shape, Circle, Rectangle, Triangle

class ShapeFactoryError(Exception):
    """Custom exception for ShapeFactory errors."""
    pass

class ShapeFactory:
    _registry: Dict[str, Type[Shape]] = {}

    # Pre-register default shapes
    register("circle", Circle)
    register("rectangle", Rectangle)
    register("triangle", Triangle)

    @classmethod
    def register(cls, name: str, shape_cls: Type[Shape]) -> None:
        """Register a Shape subclass under a given name."""
        if not issubclass(shape_cls, Shape):
            raise ShapeFactoryError(f"{shape_cls.__name__} is not a subclass of Shape")
        cls._registry[name.lower()] = shape_cls

    @classmethod
    def unregister(cls, name: str) -> None:
        """Remove a registered shape by name (no-op if not present)."""
        cls._registry.pop(name.lower(), None)

    @classmethod
    def create(cls, name: str, **kwargs: Any) -> Shape:
        """
        Create an instance of a registered shape.
        Raises ShapeFactoryError if the shape is unknown or instantiation fails.
        """
        key = name.lower()
        shape_cls = cls._registry.get(key)
        if shape_cls is None:
            raise ShapeFactoryError(f"Unknown shape: {name}")
        try:
            return shape_cls(**kwargs)
        except TypeError as e:
            raise ShapeFactoryError(f"Error creating '{name}': {e}")

    @classmethod
    def list_shapes(cls) -> List[str]:
        """Return a sorted list of registered shape names."""
        return sorted(cls._registry.keys())
