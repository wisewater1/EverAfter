import os
import requests
from tqdm import tqdm
from app.core.config import settings

def download_model():
    model_name = settings.NATIVE_LLM_MODEL
    save_dir = settings.LOCAL_MODELS_DIR
    
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        
    save_path = os.path.join(save_dir, model_name)
    
    if os.path.exists(save_path):
        print(f"Model already exists at {save_path}")
        return

    # Using a small, high-quality model: Llama-3.2-1B-Instruct (Quantized)
    # URL for Llama-3.2-1B-Instruct-GGUF (Q4_K_M)
    url = "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"
    
    print(f"Downloading model {model_name} from HuggingFace...")
    print("This may take a few minutes depending on your connection.")
    
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(save_path, 'wb') as f:
        with tqdm(total=total_size, unit='B', unit_scale=True, desc=model_name) as pbar:
            for data in response.iter_content(chunk_size=1024):
                f.write(data)
                pbar.update(len(data))
                
    print(f"\nModel downloaded successfully to {save_path}")

if __name__ == "__main__":
    download_model()
