{/* <script src="https://cdn.jsdelivr.net/npm/d3-require@1"></script> */ }


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

	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, v = max;

	var d = max - min;
	s = max == 0 ? 0 : d / max;

	if (max == min) {
		h = 0; // achromatic
	} else {
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
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
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return [r * 255, g * 255, b * 255];
}


importScripts('./node_modules/d3-delaunay/dist/d3-delaunay.js');

onmessage = event => {
	// const {data: {data, width, height, n}} = event;
	const { data: { floatrgba, width, height, n } } = event;
	const points = new Float64Array(n * 2); //* coordinates of the points
	let weight = new Float64Array(width*height);
	const colors = new Uint8ClampedArray(n * 3); //* colors for each point
	const c = new Float64Array(n * 2); //* coordinates of the centroid? 
	const s = new Float64Array(n); //* color of the cell?

	// Initialize the points using rejection sampling.
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < 30; ++j) {
			const x = points[i * 2] = Math.floor(Math.random() * width);
			const y = points[i * 2 + 1] = Math.floor(Math.random() * height);
			// if (Math.random() < data[y * width + x]) break;
			if (Math.random() < floatrgba[(y * width + x) * 4]) break;
		}
	}
	for (let i = 0; i < weight.length; i++) {
		const {h,s,v} = rgbToHsv(floatrgba[i * 4], floatrgba[i*4 + 1], floatrgba[i*4 + 2])
		weight[i] = s * v + (1-v);
	}

	const delaunay = new d3.Delaunay(points);
	const voronoi = delaunay.voronoi([0, 0, width, height]);

	//* k is # of iterations
	for (let k = 0; k < 80; ++k) {
		// Compute the weighted centroid for each Voronoi cell.
		c.fill(0);
		s.fill(0);
		for (let y = 0, i = 0; y < height; ++y) {
			for (let x = 0; x < width; ++x) {
				//* w is the weight (red color) of that pixel
				//! CHANGE THIS WEIGHTING
				//! Saturation * Value + (1-Value)
				// const w = data[y * width + x];
				const w = floatrgba[(y * width + x) * 4];
				//* i is index of the closest point
				i = delaunay.find(x + 0.5, y + 0.5, i);
				//* s is the weight of the closest point
				s[i] += w;
				//* c is the centroid's x and y coords
				c[i * 2] += w * (x + 0.5);
				c[i * 2 + 1] += w * (y + 0.5);
			}
		}

		// Relax the diagram by moving points to the weighted centroid.
		// Wiggle the points a little bit so they don’t get stuck.
		//* w = wiggle (gets smaller per iteration)
		const w = Math.pow(k + 1, -0.8) * 10;
		for (let i = 0; i < n; ++i) {
			const x0 = points[i * 2], y0 = points[i * 2 + 1];
			//* if there is some color inside the cell, divide the "centroid" by its weight to get center of mass
			//* otherwise set x1 to x0 and y1 to y0
			const x1 = s[i] ? c[i * 2] / s[i] : x0, y1 = s[i] ? c[i * 2 + 1] / s[i] : y0;
			//* 1.8 = 1.8 times the speed for convergence, can be adjusted
			//* w is the weight of the cell, so if there is a higher contentration or if there is a larger cell
			points[i * 2] = x0 + (x1 - x0) * 1.8 + (Math.random() - 0.5) * w;
			points[i * 2 + 1] = y0 + (y1 - y0) * 1.8 + (Math.random() - 0.5) * w;
		}

		postMessage(points);
		voronoi.update();
	}

	close();
};
// });
