// This module is to simulate how the johnny-five package works for the purposes
// of this demo. A lot of assumptions and a brief skim of johnny-five is used
// here.

// Load standard packages.
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Load local package.
const utils = require('./utils');

// Simple class that will extend EventEmitter and then emit ready after 50 to
// 100 milliseconds.
class HardwareItem extends EventEmitter {
	constructor() {
		super();
		setTimeout(() => this.emit('ready'), utils.random(50, 100));
	}
}

// Simulate a board. Will generate a random ID if one is not passed in the
// options.
class Board extends HardwareItem {
	constructor(opts = { id: crypto.randomBytes(4).toString('hex') }) {
		super();
		this.id = opts.id;
	}
}

// Simulate a boards collection. Will create Board instances and save them to an
// array. Will emit "ready" when all of the Board instances have also emitted
// the "ready" event.
class Boards extends EventEmitter {
	constructor(ports = []) {
		super();
		this.ports = ports;
		this.collection = [];
		if(ports.length === 0) {
			return this.emit('ready');
		}
		let readyPorts = 0;
		ports.forEach(n => {
			const board = new Board();
			this.collection.push(board);
			board.once('ready', () => {
				readyPorts++;
				if(readyPorts === ports.length) {
					this.emit('ready');
				}
			});
		});
	}
	// Find a board from the collection by its ID.
	byId(id = '') {
		const board = this.collection.find(n => n.id === id);
		return board === undefined ? null : board;
	}
}

// Simulate a sensor. When it emits ready, the value will be set as an initial
// reading. This will emit the "change" event with the new value.
class Sensor extends HardwareItem {
	constructor(opts = {}) {
		super();
		const {
			threshold = 1
		} = opts;
		// A threshold is set but ignored for the purposes of the demo.
		this.threshold = threshold;
		// The current value of the sensor, will be null if not ready.
		this.value = null;
		this.once('ready', () => {
			// Initial reading from sensor.
			this.setValue(50);
		});
	}
	// Set the value of the sensor. If the new value is different from the
	// current value, the change event will be fired with the new value.
	setValue(val) {
		const { value: oldValue } = this;
		this.value = val;
		if(oldValue !== val) {
			this.emit('change', val);
		}
	}
	// Map the current value from 0-1023 to a new range. See `utils.map`.
	scaleTo(min = 0, max = 1023) {
		// If the value is null, politely return the maximum value.
		if(this.value === null) {
			return max;
		}
		return utils.map(this.value, 0, 1023, min, max);
	}
}

module.exports = {
	HardwareItem,

	Boards,
	Board,
	Sensor
};