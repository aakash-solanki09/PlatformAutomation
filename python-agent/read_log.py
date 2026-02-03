
try:
    with open('../output.txt', 'r', encoding='utf-16') as f:
        print(f.read())
except Exception as e:
    print(f"UTF-16 failed: {e}")
    try:
        with open('../output.txt', 'r', encoding='utf-8') as f:
            print(f.read())
    except Exception as e2:
        print(f"UTF-8 failed: {e2}")
        try:
             with open('../output.txt', 'r') as f:
                print(f.read())
        except Exception as e3:
            print(f"Default failed: {e3}")
