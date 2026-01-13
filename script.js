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
    const { createFFmpeg, fetchFile } = FFmpeg;
    let ffmpeg = null;

    // Initialize FFmpeg with Blob URL Hack
    async function initFFmpeg() {
        if (ffmpeg === null) {
            try {
                // 1. Define URL for Single Threaded Core (v0.11 compatible)
                // Use 0.10.0 core for reliable ST support across 0.10/0.11 clients
                const coreVersion = '0.10.0';
                const coreURL = `https://unpkg.com/@ffmpeg/core@${coreVersion}/dist/ffmpeg-core.js`;

                // 2. Fetch the script as text
                const response = await fetch(coreURL);
                const scriptText = await response.text();

                // 3. Create a Blob from the text
                // Adjusting the script to look for wasm at absolute path if needed, 
                // but usually defining mainName/corePath is enough if we don't need to patch the internal path.
                // For 'Failed to construct Worker', simplified blob is enough.
                const blob = new Blob([scriptText], { type: 'application/javascript' });
                const blobURL = URL.createObjectURL(blob);

                // 4. Initialize createFFmpeg with corePath as Blob URL
                ffmpeg = createFFmpeg({
                    log: true,
                    corePath: blobURL,
                });

                if (!ffmpeg.isLoaded()) {
                    await ffmpeg.load();
                }

            } catch (e) {
                console.error("FFmpeg Init Error:", e);
                alert("FFmpeg 초기화 실패: " + e.message);
            }
        }
    }


    // --- Event Listeners ---

    function updateMode(mode) {
        currentMode = mode;
        resetUI();

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

            // Pre-load FFmpeg
            initFFmpeg();
        }
    }

    modeImageInput.addEventListener('change', () => {
        if (modeImageInput.checked) updateMode('image');
    });

    modeVideoInput.addEventListener('change', () => {
        if (modeVideoInput.checked) updateMode('video');
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

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
            if (!ffmpeg.isLoaded()) await ffmpeg.load();

            const fileName = 'input.mov';
            ffmpeg.FS('writeFile', fileName, await fetchFile(file));

            showLoading('동영상 인코딩 중... (0%)');

            ffmpeg.setProgress(({ ratio }) => {
                const percent = Math.round(ratio * 100);
                loadingText.textContent = `동영상 인코딩 중... (${percent}%)`;
            });

            await ffmpeg.run('-i', fileName, 'output.mp4');

            const data = ffmpeg.FS('readFile', 'output.mp4');
            const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

            showResult(mp4Blob, file.name, 'mp4');

            ffmpeg.FS('unlink', fileName);
            ffmpeg.FS('unlink', 'output.mp4');

        } catch (e) {
            console.error(e);
            alert('영상 변환 중 오류가 발생했습니다. (브라우저 호환성 또는 보안 정책 문제일 수 있습니다)');
            resetUI();
        }
    }

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
