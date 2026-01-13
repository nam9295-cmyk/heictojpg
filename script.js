document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const loadingContainer = document.getElementById('loadingContainer');
    const resultContainer = document.getElementById('resultContainer');
    const downloadLink = document.getElementById('downloadLink');
    const resetBtn = document.getElementById('resetBtn');
    const subtitle = document.querySelector('.subtitle');

    // --- Event Listeners ---

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
        // Validate HEIC
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';

        if (!isHeic) {
            alert('HEIC 파일만 업로드해주세요.');
            return;
        }

        showLoading();

        // Convert using heic2any
        heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
        })
            .then((conversionResult) => {
                // Artificial delay for smooth UX (prevents instant flicker)
                setTimeout(() => {
                    showResult(conversionResult, file.name);
                }, 500);
            })
            .catch((e) => {
                console.error(e);
                alert('변환 중 오류가 발생했습니다: ' + e.message);
                resetUI();
            });
    }

    // --- UI Helpers ---

    function showLoading() {
        dropzone.style.display = 'none';
        subtitle.style.display = 'none';
        loadingContainer.style.display = 'flex';
    }

    function showResult(blob, originalName) {
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        const url = URL.createObjectURL(resultBlob);

        const newName = originalName.replace(/\.[^/.]+$/, "") + ".jpg";
        downloadLink.href = url;
        downloadLink.download = newName;
        // Make sure button text is clear
        downloadLink.textContent = "JPG 다운로드";

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
    }
});
