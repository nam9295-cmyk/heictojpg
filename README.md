# HEIC & MOV Converter

A client-side web application to convert **HEIC images to JPG** and **MOV videos to MP4** directly in the browser. Designed with an Apple-inspired minimalist aesthetic.

## Features

-   **Client-Side Conversion**: No files are uploaded to a server. All processing happens locally in your browser for maximum privacy.
-   **Dual Mode Support**:
    -   **Images**: Converts HEIC/HEIF to high-quality JPG using `heic2any`.
    -   **Videos**: Converts MOV to MP4 using `ffmpeg.wasm`.
-   **Modern Design**:
    -   Mesh Gradient Background
    -   Apple minimal UI with Segmented Controls
    -   Responsive layout
-   **Drag & Drop Interface**

## Technologies

-   HTML5 / CSS3 / JavaScript (Vanilla)
-   [heic2any](https://alexcorvi.github.io/heic2any/)
-   [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)

## How to Run

1.  Clone the repository:
    ```bash
    git clone https://github.com/nam9295-cmyk/heictojpg.git
    ```
2.  Open `index.html` in your browser.
    *Note: Due to `ffmpeg.wasm` utilizing `SharedArrayBuffer`, you may need to run this on a local server (e.g., Live Server) with specific headers (Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp) for full video conversion functionality in some browsers, though basic functionality works in many contexts.*

## License

Created by VeryGood Design.
