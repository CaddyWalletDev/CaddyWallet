
from math import pi, sqrt
from typing import Protocol, Tuple

class Shape(Protocol):
    def area(self) -> float:
        ...

    def perimeter(self) -> float:
        ...

class Circle:
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return pi * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * pi * self.radius

class Rectangle:
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

    def perimeter(self) -> float:
        return 2 * (self.width + self.height)

class Triangle:
    def __init__(self, sides: Tuple[float, float, float]):
        self.a, self.b, self.c = sides

    def area(self) -> float:
        s = self.perimeter() / 2
        return sqrt(s * (s - self.a) * (s - self.b) * (s - self.c))

    def perimeter(self) -> float:
        return self.a + self.b + self.c
