const formula = (s, v, black_back) => {
    return black_back ? v * (1 - s) : 1 - v * (1 - s);
}

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


importScripts('./static/d3-delaunay.min.js');

onmessage = event => {
    const { data: { rgba, width, height, n, black_canvas: black_background } } = event;
    //* Old centroid of the cell
    const points = new Float64Array(n * 2); //* coordinates of the points
    points.length = n * 2;
    //* New centroid of the cell
    const centroid = new Float64Array(n * 2); //* coordinates of the centroid? 
    //* Weight of the cell
    const weight = new Float64Array(n); //* color of the cell?

    let density = new Float64Array(width * height);
    let outputrgba = new Float64Array(n * 3);
    let sum_rgba = new Int32Array(n * 3);
    let count_per_cell = new Array(n);

    //* set the density at each pixel
    for (let i = 0; i < density.length; i++) {
        const [, s, v] = rgbToHsv(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
        density[i] = formula(s, v, black_background);
    }

    //* initialize the points using rejection sampling.
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < 30; ++j) {
            const x = points[i * 2] = Math.floor(Math.random() * width);
            const y = points[i * 2 + 1] = Math.floor(Math.random() * height);
            if (Math.random() < density[y * width + x]) break;
        }
    }

    const delaunay = new d3.Delaunay(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    //* k is # of iterations
    for (let k = 0; k < 80; ++k) {
        centroid.fill(0);
        weight.fill(0);
        count_per_cell.fill(0);
        sum_rgba.fill(0);
        for (let y = 0, i = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                //* w is the weight (red color) of that pixel
                //* Saturation * Value + (1-Value)
                const pixelweight = density[y * width + x];
                //* i is index of the closest point
                i = delaunay.find(x + 0.5, y + 0.5, i);
                weight[i] += pixelweight;
                centroid[i * 2] += pixelweight * (x + 0.5);
                centroid[i * 2 + 1] += pixelweight * (y + 0.5);
                sum_rgba[i * 3] += rgba[(x + y * width) * 4]
                sum_rgba[i * 3 + 1] += rgba[(x + y * width) * 4 + 1]
                sum_rgba[i * 3 + 2] += rgba[(x + y * width) * 4 + 2]
                count_per_cell[i]++;
            }
        }

        // Relax the diagram by moving points to the weighted centroid.
        // Wiggle the points a little bit so they don’t get stuck.
        //* w = wiggle (gets smaller per iteration)
        const w = Math.pow(k + 1, -0.8) * 10;
        for (let i = 0; i < n; ++i) {
            const x0 = points[i * 2],
                y0 = points[i * 2 + 1];
            //* if there is some color inside the cell, divide the "centroid" by its weight to get center of mass
            //* otherwise set x1 to x0 and y1 to y0
            const x1 = weight[i] ? centroid[i * 2] / weight[i] : x0,
                y1 = weight[i] ? centroid[i * 2 + 1] / weight[i] : y0;
            //* 1.8 = 1.8 times the speed for convergence, can be adjusted
            //* w is the weight of the cell, so if there is a higher contentration or if there is a larger cell
            points[i * 2] = x0 + (x1 - x0) * 1.8 + (Math.random() - 0.5) * w;
            points[i * 2 + 1] = y0 + (y1 - y0) * 1.8 + (Math.random() - 0.5) * w;
            //* determine the avg color of the cell
            outputrgba[i * 3] = sum_rgba[i * 3] / count_per_cell[i];
            outputrgba[i * 3 + 1] = sum_rgba[i * 3 + 1] / count_per_cell[i];
            outputrgba[i * 3 + 2] = sum_rgba[i * 3 + 2] / count_per_cell[i];
        }

        if (k % 1 == 0) {
            postMessage({ points, outputrgba });
        }
        voronoi.update();
    }

    close();
};