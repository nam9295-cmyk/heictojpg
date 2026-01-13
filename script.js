document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const loadingContainer = document.getElementById('loadingContainer');
    const loadingText = document.querySelector('.loading-text');
    const resultContainer = document.getElementById('resultContainer');
    const downloadLink = document.getElementById('downloadLink');
    const resetBtn = document.getElementById('resetBtn');
    const subtitle = document.getElementById('subtitleText');
    const title = document.getElementById('titleText');

    // Segmented Control Inputs
    const modeImageInput = document.getElementById('mode-image');
    const modeVideoInput = document.getElementById('mode-video');
    const dropzoneText = document.querySelector('.dropzone-text');
    const dropzoneSubtext = document.querySelector('.dropzone-subtext');

    // --- State & FFmpeg ---
    let currentMode = 'image'; // 'image' or 'video'
    const { FFmpeg } = FFmpegWASM;
    const { fetchFile, toBlobURL } = FFmpegUtil;
    let ffmpeg = null;

    // Initialize FFmpeg
    async function initFFmpeg() {
        if (ffmpeg === null) {
            ffmpeg = new FFmpeg();
            // log progress
            ffmpeg.on('log', ({ message }) => {
                console.log(message);
            });
            ffmpeg.on('progress', ({ progress }) => {
                const percent = Math.round(progress * 100);
                loadingText.textContent = `동영상 인코딩 중... (${percent}%)`;
            });
        }
    }

    // --- Event Listeners ---

    // Mode Switching
    function updateMode(mode) {
        currentMode = mode;
        resetUI(); // Clear any existing files

        if (mode === 'image') {
            dropzoneText.textContent = "이미지를 드래그하거나 클릭하여 선택";
            dropzoneSubtext.textContent = "HEIC, HEIF 파일 지원";
            fileInput.accept = ".heic,.HEIC";
            title.textContent = "HEIC Converter";
            subtitle.innerHTML = "HEIC 이미지를 고화질 JPG로<br>빠르고 안전하게 변환하세요.";
        } else {
            dropzoneText.textContent = "동영상을 드래그하거나 클릭하여 선택";
            dropzoneSubtext.textContent = "MOV 파일 지원";
            fileInput.accept = ".mov,.MOV";
            title.textContent = "MOV Converter";
            subtitle.innerHTML = "MOV 영상을 MP4로<br>간편하게 변환하세요.";
        }
    }

    modeImageInput.addEventListener('change', () => {
        if (modeImageInput.checked) updateMode('image');
    });

    modeVideoInput.addEventListener('change', () => {
        if (modeVideoInput.checked) updateMode('video');
    });


    // Click to upload
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // File Selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Reset Button
    resetBtn.addEventListener('click', resetUI);


    // --- Core Logic ---

    function handleFile(file) {
        if (currentMode === 'image') {
            handleImageConversion(file);
        } else {
            handleVideoConversion(file);
        }
    }

    function handleImageConversion(file) {
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';

        if (!isHeic) {
            alert('HEIC 파일만 업로드해주세요.');
            return;
        }

        showLoading('변환 중입니다...');

        heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
        })
            .then((conversionResult) => {
                setTimeout(() => {
                    showResult(conversionResult, file.name, 'jpg');
                }, 500);
            })
            .catch((e) => {
                console.error(e);
                alert('변환 중 오류가 발생했습니다: ' + e.message);
                resetUI();
            });
    }

    async function handleVideoConversion(file) {
        if (!file.name.toLowerCase().endsWith('.mov')) {
            alert('MOV 파일만 업로드해주세요.');
            return;
        }

        showLoading('동영상 인코딩 준비 중...');

        try {
            if (!ffmpeg) await initFFmpeg();

            if (!ffmpeg.loaded) {
                // Explicitly load Single Threaded Core
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }

            const fileName = 'input.mov';
            await ffmpeg.writeFile(fileName, await fetchFile(file));

            showLoading('동영상 인코딩 중... (0%)');

            // Run conversion
            await ffmpeg.exec(['-i', fileName, 'output.mp4']);

            // Read the result
            const data = await ffmpeg.readFile('output.mp4');

            // Create Blob
            const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

            showResult(mp4Blob, file.name, 'mp4');

            // Cleanup
            await ffmpeg.deleteFile(fileName);
            await ffmpeg.deleteFile('output.mp4');

        } catch (e) {
            console.error(e);
            alert('영상 변환 중 오류가 발생했습니다: ' + e.message);
            resetUI();
        }
    }

    // --- UI Helpers ---

    function showLoading(text) {
        dropzone.style.display = 'none';
        subtitle.style.display = 'none';
        loadingText.textContent = text;
        loadingContainer.style.display = 'flex';
    }

    function showResult(blob, originalName, extension) {
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        const url = URL.createObjectURL(resultBlob);

        const newName = originalName.replace(/\.[^/.]+$/, "") + "." + extension;
        downloadLink.href = url;
        downloadLink.download = newName;
        downloadLink.textContent = `${extension.toUpperCase()} 다운로드`;

        loadingContainer.style.display = 'none';
        resultContainer.style.display = 'block';
    }

    function resetUI() {
        if (downloadLink.href) {
            URL.revokeObjectURL(downloadLink.href);
            downloadLink.href = '#';
        }

        fileInput.value = '';

        resultContainer.style.display = 'none';
        loadingContainer.style.display = 'none';
        subtitle.style.display = 'block';
        dropzone.style.display = 'flex';
        loadingText.textContent = '변환 중입니다...';
    }
});
