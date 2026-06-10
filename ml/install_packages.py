import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    print(f"Successfully installed {package}")

if __name__ == "__main__":
    packages = ["flask", "prophet", "pandas"]
    for package in packages:
        install(package)
