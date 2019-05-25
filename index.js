// Load packages from npm.
const tmi = require('tmi.js');
const five = require('./lib/johnny-five'); // Simulated

// Load local package.
const utils = require('./lib/utils');

const TWITCH_CHANNEL = process.argv.slice(2).shift();

if(!TWITCH_CHANNEL) {
	utils.log.redBright('Usage:');
	utils.log.whiteBright('node index.js <channel name>');
	process.exit();
}

// Load the Follow Bot code.
const fbot = require('./lib/fbot');

// Log the state of the mag on this  event.
fbot.on('mag-empty', state =>
	utils.log.greenBright('Mag is now empty?', state)
);

// Simulating loading the Arduino boards.
const ports = [
	{ id: 'FBOT', port: 'COM5' }
];

const boards = new five.Boards(ports);

// When the board is ready to do IO things.
boards.once('ready', () => {
	utils.log.green('Boards ready');
	// Tell FBot to find the mag sensor.
	fbot.findMagSensor(boards);
});

// Create a tmi.js Client.
const client = new tmi.Client({
	options: { debug: true },
	connection: { secure: true, reconnect: true },
	// Not required for demo.
	// identity: { username: '', password: '' },
	channels: [ TWITCH_CHANNEL ]
});

// Connect to chat.
client.connect();

// Message receieved from chat.
client.on('message', (channel, userstate, message, self) => {
	if(
		// Only allow these users.
		(userstate.username !== 'laboratory424' &&
		userstate.username !== 'alca') ||
		// Message was not a command.
		message[0] !== '!' ||
		// An internal message from this client, best to ignore.
		self
	) {
		utils.log.red('Will not process this message.');
		return;
	}
	// Turn the message into a list of parameters, ignoring the "!".
	const params = message.slice(1).split(' ');
	// Grab the command from the first parameter.
	const command = params.shift().toLowerCase();
	utils.log.whiteBright(`[${userstate.id}] ${command} | ${params.join(', ')}`);
	// "abfire" command definition.
	// "!abfire" in the chat will make the FBot attempt to fire. If there are
	// parameters, it will attempt to parse the first parameter as a number.
	// This will allow the bot to attempt to fire more than 1 ball.
	if(command === 'abfire') {
		// Default to 1 ball.
		let count = 1;
		if(params.length) {
			const val = parseInt(params[0]);
			// Check for "NaN" and only if the value is greater than 1.
			if(val === val && val > 1) {
				count = val;
			}
		}
		// Try to fire balls. The message ID is just used to keep track in the
		// debug logs.
		fbot.fireBalls(count, userstate.id);
	}
	// "abreload" command definition.
	// Merely here to simulate reloading.
	else if(command === 'abreload') {
		// Doesn't matter how many are loaded but for ease, it will just load
		// the maximum amount of balls, 6.
		// const newCount = Math.floor(utils.random(3, 6));
		const newCount = 6;
		fbot._balls = newCount;
		fbot.sensors.magSensor.setValue(50);
	}
});