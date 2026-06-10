import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.akashic_service import akashic

def test_akashic():
    print("Testing Akashic Record...")
    
    # 1. Add some memories if empty
    if not akashic.memories:
        print("Adding initial memories...")
        akashic.canonize("St. Raphael suggests drinking more water.", {"source": "raphael", "topic": "health"})
        akashic.canonize("St. Michael detected a potential intrusion on port 22.", {"source": "michael", "topic": "security"})
        akashic.canonize("St. Gabriel advises saving 20% of income.", {"source": "gabriel", "topic": "finance"})
        akashic.canonize("The user prefers dark mode interfaces.", {"source": "system", "topic": "preferences"})
    
    # 2. Search
    query = "health advice"
    print(f"\nSearching for: '{query}'")
    results = akashic.search(query)
    
    for r in results:
        print(f"[{r['score']:.4f}] {r['content']} (Meta: {r['metadata']})")
        
    # 3. Verify persistence path
    from app.services.akashic_service import MEMORY_FILE
    print(f"\nMemory file path: {MEMORY_FILE}")
    if os.path.exists(MEMORY_FILE):
        print("SUCCESS: Memory file exists.")
    else:
        print("FAILURE: Memory file not found.")

if __name__ == "__main__":
    test_akashic()
