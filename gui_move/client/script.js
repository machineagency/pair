let imgElement;
let inputElement;
let mat;

document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById('status').innerHTML = 'OpenCV.js is ready.';

    imgElement = document.getElementById('imageSrc');
    inputElement = document.getElementById('fileInput');

    inputElement.addEventListener('change', (e) => {
        imgElement.src = URL.createObjectURL(e.target.files[0]);
    }, false);

    imgElement.onload = () => {
        mat = cv.imread(imgElement);
        cv.imshow('canvasOutput', mat);
        // mat.delete();
    };
});

