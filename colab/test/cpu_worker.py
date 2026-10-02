import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); COLAB=os.path.dirname(HERE); REPO=os.path.dirname(COLAB)
os.environ["OSAMAH_OUTPUT_DIR"]=os.path.join(HERE,"outputs_cpu"); os.makedirs(os.environ["OSAMAH_OUTPUT_DIR"],exist_ok=True)
import types
torch=types.ModuleType("torch")
class _C:
    def is_available(self): return False
    def get_device_name(self,i): return "cpu"
    def get_device_properties(self,i): return types.SimpleNamespace(total_memory=0)
torch.cuda=_C(); torch.float32="fp32"; torch.bfloat16="bf16"
torch.Generator=type("G",(),{"__init__":lambda s,d=None:None,"manual_seed":lambda s,x:x})
sys.modules["torch"]=torch
sys.path.insert(0,COLAB)
import worker
if __name__=="__main__":
    import uvicorn; uvicorn.run(worker.app,host="127.0.0.1",port=8012,log_level="warning")
