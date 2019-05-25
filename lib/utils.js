// Create a Promise that resolves in `ms` milliseconds
// utils.sleep();
// await utils.sleep(300);
function sleep(ms) {
	return new Promise(resolve =>
		setTimeout(resolve, ms)
	);
}

// Generate a random number.
// utils.random();
// utils.random(10);
// utils.random(20, 30);
// utils.random(-40, 40);
// utils.random(40, -40);
function random(min = 1, max = 0) {
	if(min > max) {
		const tmp = min;
		min = max;
		max = tmp;
	}
	return Math.random() * (max - min) + min;
}

// Input, in range, out range. Unclamped.
// utils.map(0, 0, 1, 0, 1); // 0
// utils.map(2, 0, 1, 0, 1); // 2
// utils.map(3, 1, 4, 0, 1); // 0.6667
// utils.map(4, 3, 6, 18, 9); // 15
function map(n, a, b, c = a, d = b) {
	return (n - a) * (d - c) / (b - a) + c;
}

const colors = {
	black: '\u001b[30m',
	red: '\u001b[31m',
	green: '\u001b[32m',
	yellow: '\u001b[33m',
	blue: '\u001b[34m',
	magenta: '\u001b[35m',
	cyan: '\u001b[36m',
	white: '\u001b[37m',
	reset: '\u001b[0m',
};

// Log something with some color.
// utils.log.<color from above>(...args)
// utils.log.<color from above>Bright(...args)
const log = new Proxy({}, {
	get(target, prop, receiever) {
		const bright = prop.includes('Bright');
		if(bright) {
			prop = prop.replace('Bright', '');
		}
		let base = colors[prop] || colors.white;
		if(bright) {
			base = base.replace('m', ';1m');
		}
		return (...args) => {
			// Leaves a space at the beginning but good enough.
			console.log(base, ...args, colors.reset);
		};
	}
});

module.exports = {
	sleep,
	random,
	map,
	log
};