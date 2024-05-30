from setuptools import find_packages, setup

setup(
    name="mkdocs_py_griffe",
    version="0.1.0",
    packages=find_packages(),
    author="Guillaume Reinisch",
    description="Python API generator for mkdocs-ts document.",
    license="MIT",
    install_requires=["griffe>=0.45.2,<0.46.0"],
)
