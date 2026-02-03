"""
Training API for Pareidolia Desktop
Basic Python functions that act as APIs for the training interface.
"""

import random
import json
from typing import Dict, Any


def get_random_value() -> Dict[str, Any]:
    """
    Returns a random value between 1 and 10.
    Used to test Python integration with the Electron app.
    """
    value = random.randint(1, 10)
    return {
        "success": True,
        "value": value,
        "message": f"Python integration works! Random value: {value}"
    }



# For command-line testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "random":
            result = get_random_value()
        else:
            result = {"error": f"Unknown command: {command}"}
        
        print(json.dumps(result))
    else:
        # Default: return random value for testing
        print(json.dumps(get_random_value()))
