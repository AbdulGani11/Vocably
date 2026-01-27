# Vocably - Local TTS with Qwen3-TTS

A React-based text-to-speech application powered by **Qwen3-TTS**, running entirely on your local machine for privacy and zero latency.

![Vocably Tech Stack](https://img.shields.io/badge/Tech-React_19_•_FastAPI_•_Qwen3--TTS-blue)

## 🚀 Features

* **Local Inference:** Runs 100% offline using the **Qwen3-TTS 1.7B** model.
* **Voice Variety:** Choose from **10 distinct voices** (male/female) ranging from professional news anchors to casual storytellers.
* **Tone Control:** Use instruction-based prompting to control emotions (e.g., *Whisper*, *Angry*, *Excited*, *Sad*).
* **Modern UI:** Built with **React 19**, **Vite**, and **Tailwind CSS** for a clean, responsive interface.
* **Export Audio:** Download generated speech as `.wav` files.

## 🛠️ Tech Stack

### Frontend
* **Framework:** React 19 + Vite
* **Styling:** Tailwind CSS 4
* **Audio:** Web Audio API (Blob URLs)

### Backend
* **Server:** FastAPI + Uvicorn
* **Language:** Python 3.10+
* **AI Model:** Qwen3-TTS-12Hz-1.7B-CustomVoice (PyTorch + Transformers)

## 📦 Installation & Setup

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **RAM:** 16GB minimum
* **Disk Space:** ~8GB (for model weights and dependencies)

### Quick Start

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/AbdulGani11/Vocably.git](https://github.com/AbdulGani11/Vocably.git)
    cd Vocably
    ```

2.  **Configure Environment Variables:**
    Create a new file named `.env` in the root directory (same level as `package.json`) and add the following line:
    ```env
    VITE_TTS_BACKEND_URL=http://localhost:8000
    ```

3.  **Start the Application:**
    Run the automated startup script:
    ```bash
    .\start.bat
    ```
    > **Note:** On the first run, this script will automatically:
    > * Create the local Python virtual environment (`backend/qwen_env`)
    > * Download the 3.5GB model weights
    > * Install all Node.js and Python dependencies

4.  **Access the App:**
    * **UI:** `http://localhost:5173`
    * **API Docs:** `http://localhost:8000/docs`

## 🎮 Usage

1.  **Enter Text:** Type your script into the text area.
2.  **Select Voice:** Choose a speaker (e.g., *Vivian*, *Marcus*) from the dropdown.
3.  **Set Tone:** Click a tone preset (e.g., *Excited*, *Whisper*) to adjust the delivery style.
4.  **Play:** Click the play button to generate audio.
5.  **Download:** Save your audio as a `.wav` file.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.