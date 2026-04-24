from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RECORDINGS_DIR = DATA_DIR / "recordings"
DATASETS_DIR = DATA_DIR / "datasets"
MODELS_DIR = DATA_DIR / "models"

SERIAL_BAUD = 115200
SERIAL_TIMEOUT = 3

NUM_CHANNELS = 64
NUM_FEATURES = 16

LABEL_MAP = {0: "Hava", 1: "Kahve", 2: "Kolonya", 3: "Parfüm"}
