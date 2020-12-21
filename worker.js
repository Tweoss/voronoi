{/* <script src="https://cdn.jsdelivr.net/npm/d3-require@1"></script> */}

importScripts('./node_modules/d3-delaunay/dist/d3-delaunay.js');
// import {Delaunay} from "d3-delaunay";

// d3.require("d3-delaunay@^5.3.0").then(d3 => {
	
	onmessage = event => {
		const {data: {data, width, height, n}} = event;
		const points = new Float64Array(n * 2); //* coordinates of the points?
		const c = new Float64Array(n * 2); //* coordinates of the centroid? 
		const s = new Float64Array(n); //* color of the cell?
	
		// Initialize the points using rejection sampling.
		for (let i = 0; i < n; ++i) {
			for (let j = 0; j < 30; ++j) {
				const x = points[i * 2] = Math.floor(Math.random() * width);
				const y = points[i * 2 + 1] = Math.floor(Math.random() * height);
				if (Math.random() < data[y * width + x]) break;
			}
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
					const w = data[y * width + x];
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
