// This module is the Follow Bot source. It contains the Promise sequence system
// for the bot's functionality.

// Load standard package.
const { EventEmitter, once } = require('events');

// Load npm package.
const five = require('./johnny-five');

// Load local package.
const utils = require('./utils');

// Constants
const MAG_SENSOR_THRESHOLD = 600;
const MAG_RELOAD_TIMEOUT_MS = 10000;

// The Follow Bot class.
class FBot extends EventEmitter {
	constructor() {
		super();

		this.sensors = {};

		this.turnAngle = 0;
		this.pitchAngle = 0;

		this.magIsEmpty = true;
		this.firingActive = false;
		this.turningActive = false;
		this.pitchingActive = false;

		this._balls = 6;
	}
	// This is called when the mag sensor emits the change event.
	onMagChange(val) {
		// Get the value from the sensor at some scale. The raw value is
		// available by the "val" argument but just in case, we'll use scaleTo.
		const value = this.sensors.magSensor.scaleTo(0, 1023);
		// Mag has become empty
		if(value > MAG_SENSOR_THRESHOLD) {
			// Check if magIsEmpty is false
			if(!this.magIsEmpty) {
				// Set magIsEmpty to true and emit the threshold change.
				this.magIsEmpty = true;
				this.emit('mag-empty', true);
			}
		}
		// Mag is not empty, check if magIsEmpty is true
		else if(this.magIsEmpty) {
			// Set magIsEmpty to false and emit the threshold change.
			this.magIsEmpty = false;
			this.emit('mag-empty', false);
		}
	}
	// Create and set up the mag sensor.
	findMagSensor(boards) {
		const sensor = new five.Sensor({
			pin: 'A0',
			threshold: 600,
			board: boards.byId('FBOT')
		})
		.on('change', () => this.onMagChange());
		this.sensors.magSensor = sensor;
	}
	// Turn the bot.
	async turn(angle = utils.random(-90, 90), id = 'unknown') {
		// Prevent overlapping turning animation.
		if(this.turningActive) {
			utils.log.yellow(`[${id}] Busy turning, waiting.`);
			// Wait for turning to be done.
			await once(this, 'turning-done');
			// Try again.
			return this.turn(angle, id);
		}
		utils.log.blackBright(`[${id}] Turning to`, angle.toFixed(1));
		// Turning is now active.
		this.turningActive = true;
		this.emit('turning-start');
		// Determine how long to wait while it turns to the target angle.
		const timing = Math.abs(this.turnAngle - angle);
		// Sleep the function while it rotates.
		await utils.sleep(timing);
		// Update the angle.
		this.turnAngle = angle;
		// Turning is no longer active.
		this.turningActive = false;
		this.emit('turning-done');
	}
	// Pitch the bot. This is identical to `this.turn` but for "pitch".
	async pitch(angle = utils.random(-60, 60), id = 'unknown') {
		// Prevent overlapping pitching animation.
		if(this.pitchingActive) {
			utils.log.yellow(`[${id}] Busy pitching, waiting.`);
			// Wait for pitching to be done.
			await once(this, 'pitching-done');
			// Try again.
			return this.pitch(angle, id);
		}
		utils.log.blackBright(`[${id}] Pitching to`, angle.toFixed(1));
		// Pitching is now active.
		this.pitchingActive = true;
		this.emit('pitching-start');
		// Determine how long to wait while it pitches to the target angle.
		const timing = Math.abs(this.pitchAngle - angle);
		// Sleep the function while it rotates.
		await utils.sleep(timing);
		// Update the angle.
		this.pitchAngle = angle;
		// Pitching is no longer active.
		this.pitchingActive = false;
		this.emit('pitching-done');
	}
	// Spin up the motor(s).
	spinUp() {
		utils.log.yellow('Spinning up');
		return utils.sleep(600);
	}
	// Spin down the motor(s).
	spinDown() {
		utils.log.yellow('Spinning down');
		return utils.sleep(1000);
	}
	// Fire a ball.
	async fire() {
		// Time advances. This would normally be just like spinUp or spinDown,
		// just a sleep while the action occurs. For demo purposes, a few things
		// take place during this time.
		await utils.sleep(utils.random(20, 30));
		// Something happened that let this function be called while the mag was
		// empty. Warning about this for demo purposes. This shouldn't get to be
		// called in the demo.
		if(this._balls < 1) {
			utils.log.redBright('Trying to fire without anything in the mag');
		}
		else {
			// A ball is now flying through the air.
			utils.log.greenBright('A ball flies!');
		}
		// Reduce the ball count for the demo.
		this._balls--;
		utils.log.blueBright('Remaining balls:', this._balls);
		if(this._balls < 1) {
			utils.log.red('Now out of balls in mag');
			// Change the sensor to show there aren't anymore balls in the mag.
			if(this.sensors.magSensor) {
				this.sensors.magSensor.setValue(650);
			}
		}
		// More time advances.
		await utils.sleep(utils.random(20, 30));
	}
	// Create a Promise that resolves when the mag is reloaded. If the mag is
	// already loaded, it will just carry through immediately. For demo purposes
	// and probably best for the real thing, a timeout is racing the act of
	// reloading. If the timeout fires or some strange race condition with the
	// mag emptying again while it was waiting for it to be reloaded, it will
	// reject (throw) and potentially (if not caught) stop the current sequence.
	waitForMag() {
		// The reload timeout that the phyiscal action of reloading will race
		// against.
		let reloadTimeout;
		// The Promise instance.
		return new Promise((resolve, reject) => {
			// Check that the mag is not currently empty, this should
			// immediately resolve and continue the sequence.
			if(!this.magIsEmpty) {
				utils.log.green('Mag was not empty');
				return resolve();
			}
			// Turns out the mag is now empty!
			utils.log.redBright('Mag is empty. RELOAD!');
			// Spin down and wait for reload.
			this.spinDown();
			// Create the callback for the mag-empty change event.
			const cb = () => {
				if(this.magIsEmpty) {
					// Possible race condition?
					reject('Mag emitted empty while waiting to reload');
				}
				else {
					utils.log.greenBright('Mag was reloaded while waiting');
					resolve();
				}
			};
			// Listen for the mag-empty event one time.
			this.once('mag-empty', cb);
			// Race the event against a 10s timeout. This would be longer in a
			// real-life scenario if it were preferred.
			reloadTimeout = setTimeout(() => {
				// Remove the event listener.
				this.off('mag-empty', cb);
				// Fail the reload.
				reject('Reload timed out');
			}, MAG_RELOAD_TIMEOUT_MS);
		})
		// Ensure the timeout is cleared on resolve. The Promise can no longer
		// be rejected (thrown) from the timeout but it's probably best not to
		// leave it around.
		.then(() => clearTimeout(reloadTimeout));
	}
	// Create a sequence to fire balls. 
	async fireBalls(fireCount = 1, id = 'unknown') {
		// Probably a good idea, doesn't really seem necessary but worth
		// considering validation.
		// if(fireCount < 1) {
		// 	utils.log.redBright('Cannot fire < 1 balls');
		// 	return;
		// }

		// Prevent overlapping firing animation.
		if(this.firingActive) {
			utils.log.yellow(`[${id}] Busy firing, waiting.`);
			// Wait for firing to be done.
			await once(this, 'firing-done');
			// Try again.
			return this.fireBalls(fireCount, id);
		}
		utils.log.yellowBright(`[${id}] Now firing ${fireCount} ball(s).`);
		// Firing is now active.
		this.firingActive = true;
		this.emit('firing-start');
		// Start the sequence with checking and/or waiting for the magazine to
		// be reloaded.
		const sequence = [ () => this.waitForMag() ];
		// For every ball to be fired.
		for(let i = 0; i < fireCount; i++) {
			// Push several items to the sequence.
			sequence.push(
				// Wait for both turning and pitching to be finished, they can
				// both be active at the same time or waiting for a previous
				// turn/pitch call to end.
				() => Promise.all([
					// Turn and pitch randomly.
					this.turn(undefined, id),
					this.pitch(undefined, id)
				]),
				// Run the motor(s).
				() => this.spinUp(),
				// Fire a ball!
				() => this.fire(),
			);
			// If we're not at the end.
			if(i < fireCount - 1) {
				// Add another mag check between shots.
				sequence.push(() => this.waitForMag());
			}
		}
		utils.log.blackBright(sequence.length + ' items in the sequence');
		// If any item fails at any time, stop the whole sequence.
		try {
			// Loop over all items in the sequence.
			for(const item of sequence) {
				// Call and await the items.
				await item();
			}
		} catch(err) {
			utils.log.redBright('fireBalls sequence failed');
			console.error(err);
		}
		// Make sure the bot spins down. This might be where the rotating and
		// pitch are reset.
		await this.spinDown();
		utils.log.yellowBright(`[${id}] Done firing.`);
		// Firing is no longer active.
		this.firingActive = false;
		this.emit('firing-done');
	}
}

// Create an instance of the Follow Bot and export it.
module.exports = new FBot();