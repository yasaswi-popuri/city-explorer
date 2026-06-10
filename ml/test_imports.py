try:
    import flask
    print("✅ Flask imported successfully")
except ImportError as e:
    print(f"❌ Flask import failed: {e}")

try:
    import pandas
    print("✅ Pandas imported successfully")
except ImportError as e:
    print(f"❌ Pandas import failed: {e}")

try:
    import prophet
    print("✅ Prophet imported successfully")
except ImportError as e:
    print(f"❌ Prophet import failed: {e}")

print("\n🔍 Testing complete!")
