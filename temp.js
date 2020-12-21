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

return [ h, s, v ];
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

return [ r * 255, g * 255, b * 255 ];
}

//? 1
var drawing_canvas = document.createElement("canvas");
const drawing_context = drawing_canvas.getContext("2d");
var canvas = document.createElement("canvas");
const context = canvas.getContext("2d");  
document.body.appendChild(drawing_canvas);


function append_canvas() {
	
	var dpi = window.devicePixelRatio;
	drawing_canvas.width = width * dpi;
	drawing_canvas.height = height * dpi;
	drawing_canvas.style.width = width + "px";
	drawing_context.scale(dpi, dpi);
	
	//? 2
}


var width, height;
function resized() {
	var w = document.body.clientWidth;
	if (w !== width) width = w;
}
var image = new Image();  

//? 5
function messaged({data: points}) {
	drawing_context.fillStyle = "#fff";
	drawing_context.fillRect(0, 0, width, height);
	// 	const {data: rgba} = context.getImageData(0, 0, width, height);
	for (let i = 0, n = points.length; i < n; i += 2) {
		let x = points[i], y = points[i + 1];
		drawing_context.moveTo(x + 1.5, y);
		drawing_context.arc(x, y, 1.5, 0, 2 * Math.PI);
		// x = Math.floor(x); y = Math.floor(y);
		// drawing_context.fillStyle = "#" + rgba[x + y * width] + rgba[x + y * width + 1] + rgba[x + y * width + 2];
		drawing_context.fillStyle = "#000";
		drawing_context.fill();
		drawing_context.beginPath();
	}
}


//? 3
image.addEventListener('load', function() {
	width = document.body.clientWidth;
	height = Math.round(width * image.height / image.width);
	var data = new Float64Array(width * height);
	append_canvas();
	window.addEventListener("resize", resized);
	
	// const context = DOM.context2d(width, height, 1);
	canvas.width = width;
	canvas.height = height;

	

	canvas.style.width = width + "px";
	context.scale(1, 1);
	context.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
	const {data: rgba} = context.getImageData(0, 0, width, height);
	var h,s,v;
	// for (let i = 0, n = rgba.length / 4; i < n; ++i) {
	// 	[h,s,v] = rgbToHsv(rgba[i*4],rgba[i*4 + 1],rgba[i*4 + 2]);
	// 	let weight = s==0 ? (1 - v) * rgba[i * 4 + 3] : s * rgba[i * 4 + 3];
	// 	data[i] = Math.max(0, weight);
	// }
	// for (let i = 0, n = rgba.length / 4; i < n; ++i) data[i] = Math.max(0, 1 - rgba[i * 4] / 254);
	for (let i = 0, n = rgba.length / 4; i < n; ++i) data[i] = Math.max(0, 1 - rgba[i * 4] / 254);
	
	//! data now contains the weighting
	data.width = width;
	data.height = height;
	// let n = Math.round(width * height / 40);
	let n = Math.round(width * height / 100);
	const worker = new Worker('worker.js');
	worker.addEventListener("message", messaged);
	worker.postMessage({data, width, height, n});
}, false);
image.src = './IMG_2319 copy.jpg'; // Set source path







	// 	main.variable(observer("script")).define("script", ["require","invalidation"], async function(require,invalidation)
	// {
	// 	const blob = new Blob([`
	// importScripts("${await require.resolve("d3-delaunay@^5.1.1")}");
	
	// onmessage = event => {
	// 	const {data: {data, width, height, n}} = event;
	// 	const points = new Float64Array(n * 2);
	// 	const c = new Float64Array(n * 2);
	// 	const s = new Float64Array(n);
	
	// 	// Initialize the points using rejection sampling.
	// 	for (let i = 0; i < n; ++i) {
	// 		for (let j = 0; j < 30; ++j) {
	// 			const x = points[i * 2] = Math.floor(Math.random() * width);
	// 			const y = points[i * 2 + 1] = Math.floor(Math.random() * height);
	// 			if (Math.random() < data[y * width + x]) break;
	// 		}
	// 	}
	
	// 	const delaunay = new d3.Delaunay(points);
	// 	const voronoi = delaunay.voronoi([0, 0, width, height]);
	
	// 	for (let k = 0; k < 80; ++k) {
	
	// 		// Compute the weighted centroid for each Voronoi cell.
	// 		c.fill(0);
	// 		s.fill(0);
	// 		for (let y = 0, i = 0; y < height; ++y) {
	// 			for (let x = 0; x < width; ++x) {
	// 				const w = data[y * width + x];
	// 				i = delaunay.find(x + 0.5, y + 0.5, i);
	// 				s[i] += w;
	// 				c[i * 2] += w * (x + 0.5);
	// 				c[i * 2 + 1] += w * (y + 0.5);
	// 			}
	// 		}
	
	// 		// Relax the diagram by moving points to the weighted centroid.
	// 		// Wiggle the points a little bit so they don’t get stuck.
	// 		const w = Math.pow(k + 1, -0.8) * 10;
	// 		for (let i = 0; i < n; ++i) {
	// 			const x0 = points[i * 2], y0 = points[i * 2 + 1];
	// 			const x1 = s[i] ? c[i * 2] / s[i] : x0, y1 = s[i] ? c[i * 2 + 1] / s[i] : y0;
	// 			points[i * 2] = x0 + (x1 - x0) * 1.8 + (Math.random() - 0.5) * w;
	// 			points[i * 2 + 1] = y0 + (y1 - y0) * 1.8 + (Math.random() - 0.5) * w;
	// 		}
	
	// 		postMessage(points);
	// 		voronoi.update();
	// 	}
	
	// 	close();
	// };
	// `], {type: "text/javascript"});
	// 	const script = URL.createObjectURL(blob);
	// 	// invalidation.then(() => URL.revokeObjectURL(script));
	// 	return script;
	// }
	// );
	// 	main.variable(observer("data")).define("data", ["FileAttachment","width","DOM"], async function(FileAttachment,width,DOM)
	// {
		
	// }
	// );
	// 	main.variable(observer("n")).define("n", ["width","height"], function(width,height){return(
	// )});
	// 	main.variable(observer("height")).define("height", ["data"], function(data){return(
	// )});
		// return main;
	