'use strict';

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h /= 6;
    }

    return [h, s, v];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v) {
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }

    return [r * 255, g * 255, b * 255];
}

var drawing_canvas = document.createElement("canvas");
const drawing_context = drawing_canvas.getContext("2d");
var hidden_canvas = document.createElement("canvas");
const hidden_context = hidden_canvas.getContext("2d");
document.body.appendChild(drawing_canvas);

let version = 0;

function append_canvas() {
    var dpi = window.devicePixelRatio;
    drawing_canvas.width = width * dpi;
    drawing_canvas.height = height * dpi;
    drawing_canvas.style.width = width + "px";
    drawing_context.scale(dpi, dpi);
}

var width, height;
var concentration = 50,
    bubble = true,
    clear_canvas = false;
const PIXELS_SQUARE_SCALE = 1 / 5000;
const SCALE_HSV_TO_RADIUS = 3;

var image = new Image();

function messaged({ data: { points, outputrgba, worker_version } }) {
    if (version != worker_version) return;
    hidden_context.clearRect(0, 0, width, height);
    for (let i = 0, n = points.length; i < n; i += 2) {
        let x = points[i],
            y = points[i + 1];

        let index = (i / 2 * 3);
        let [hue, saturation, value] = rgbToHsv(Math.floor(outputrgba[index]), Math.floor(outputrgba[index + 1]), Math.floor(outputrgba[index + 2]));
        let r, g, b;
        if (saturation == 0) {
            r = value * 255;
            g = value * 255;
            b = value * 255;
        } else {
            [r, g, b] = hsvToRgb(hue, 1., value);
        }
        if (bubble) {
            let radius = (saturation * value + (1 - value)) * SCALE_HSV_TO_RADIUS;
            hidden_context.moveTo(x + radius, y);
            hidden_context.arc(x, y, radius, 0, 2 * Math.PI);
        } else {
            hidden_context.moveTo(x + 1.5, y);
            hidden_context.arc(x, y, 1.5, 0, 2 * Math.PI);
        }
        hidden_context.fillStyle = `rgb(${r},${g},${b})`;
        hidden_context.fill();
        hidden_context.beginPath();
    }
    if (clear_canvas) {
        drawing_context.clearRect(0, 0, width, height);
    }
    drawing_context.drawImage(hidden_canvas, 0, 0);
}

function call_worker() {
    width = document.body.clientWidth;
    height = Math.round(width * image.height / image.width);
    append_canvas();

    hidden_canvas.width = width;
    hidden_canvas.height = height;

    hidden_canvas.style.width = width + "px";
    hidden_context.scale(1, 1);
    hidden_context.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
    const { data: rgba } = hidden_context.getImageData(0, 0, width, height);
    return rgba;
}

const worker_path = 'worker.js';
let worker = new Worker(worker_path);
image.addEventListener('load', function() {
    let rgba = call_worker();
    //* n is the number of points
    let n = Math.round(concentration * PIXELS_SQUARE_SCALE * width * height);
    worker.terminate();
    worker = new Worker(worker_path);
    worker.addEventListener("message", messaged);
    worker.postMessage({ rgba, width, height, n, bubble, version: version });
    const inputElement = document.getElementById("photo");
    inputElement.addEventListener("change", function handler() {
        var file = inputElement.files[0];
        var reader = new FileReader();
        if (file) {
            this.removeEventListener('load', handler);
            reader.readAsDataURL(file);
            reader.onloadend = function() {
                image.src = reader.result;
            }
            image.addEventListener("load", function() {
                rgba = call_worker();
                worker.terminate();
                version += 1;
                n = Math.round(concentration * PIXELS_SQUARE_SCALE * width * height);
                worker = new Worker(worker_path);
                worker.postMessage({ rgba, width, height, n, bubble, version: version });
            });
        } else {
            image.src = "";
        }
    }, false);
}, false);

let default_src = "./imgs/IMG_1886.jpg";
if (window.location.search != "") {
    let params = new URLSearchParams(window.location.search);
    let temp = params.get("concentration");
    if (temp != null) {
        concentration = parseInt(temp);
    }
    temp = params.get("bubble");
    if (temp != null) {
        bubble = temp == "true";
    }
    temp = params.get("trail");
    if (temp != null) {
        clear_canvas = temp != "true";
    }
    temp = params.get("img_url");
    if (typeof temp === 'string' && temp.length > 0) {
        default_src = decodeURIComponent(temp);
    }
}

image.setAttribute('crossOrigin', 'anonymous');
image.src = default_src;

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("point-concentration").addEventListener("change", (e) => {
        concentration = e.target.value;
        image.dispatchEvent(new Event("load"));
        document.getElementById("range-out").value = concentration;
    });
    document.getElementById("point-concentration").value = concentration;
    document.getElementById("range-out").value = concentration;

    document.getElementById("bubble").addEventListener("change", function(e) {
        bubble = e.target.checked;
        image.dispatchEvent(new Event("load"));
    });
    document.getElementById("bubble").checked = bubble;

    document.getElementById("clear-canvas").addEventListener("change", function(e) {
        clear_canvas = e.target.checked;
        image.dispatchEvent(new Event("load"));
    });
    document.getElementById("clear-canvas").checked = clear_canvas;
});