'use strict';

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { FileDb } = require('jovo-db-filedb');
const requestPromise = require('request-promise-native');

const app = new App();

app.use(
	new Alexa(),
	new GoogleAssistant(),
	new JovoDebugger(),
	new FileDb()
);


// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------

app.setHandler({
	LAUNCH() {
		// return this.toIntent('HelloWorldIntent');
		return this.toIntent('CafeIntent');
	},

	HelloWorldIntent() {
		this.ask('Hello World! What\'s your name?', 'Please tell me your name.');
	},

	MyNameIsIntent() {
		this.tell('Hey ' + this.$inputs.name.value + ', nice to meet you!');
	},

	CafeIntent() {
		const stat = getBobsInfo();
		console.log(stat);
		if (stat) { // if it's true, tell the user it's open
			this.tell("Bobs is currently open.");
		}
		else { // if it's false, tell the user it's closed
			this.tell("Bobs is currently closed.");
		}
	},
});

// getBobsInfo() - calls cafebonappetit API v2 and returns current information
async function getBobsInfo() {
	const options = {
		uri: 'https://legacy.cafebonappetit.com/api/2/cafes?cafe=1447', // api url
		json: true // parses json string
	};
	const data = await requestPromise(options); // call api and store in data
	const dayInfo = data.cafes['1447'].days['0'].dayparts; // grab open periods for today
	return checkOpen(dayInfo); // feeds dayInfo to checkOpen, which returns boolean
}

// checkOpen(dayInfo) - takes current day info and checks to see if current time is
// during an open period (must be better way to do this using api, but it's unclear how)
function checkOpen(dayInfo) { // need to add support for different time zones later
	var now = new Date(); // grab current date and time
	var compareStart = new Date(); // grab current date again for easier comparing later
	var compareEnd = new Date(); // grab current date again for easier comparing later
	for (dayPart in dayInfo) { // loop over each period of day that cafe is open
		// setup endtime date object for comparison purposes
		// split current period endtime string on colon into list
		var endTime = dayInfo[dayPart].endtime.split(':');
		// set compareEnd day to given endtime by parsing strings in list
		compareEnd.setHours( parseInt(endTime[0]), parseInt(endTime[1]) , 0)
		// compare newly minted endtime date object (compareEnd) to current time
		if (now > compareEnd) { // if it's past the endtime, no point in checking start
			continue; // skip to next iteration of foreach loop
		}
		else { // otherwise, check that it's not before the starttime
			// setup starttime date object for comparison purposes
			// split current period starttime string on colon into list
			var startTime = dayInfo[dayPart].starttime.split(':');
			// set compareStart day to given endtime by parsing strings in list
			compareStart.setHours( parseInt(startTime[0]), parseInt(startTime[1]) , 0)
			// compare newly minted starttime date object (compareStart) to current time
			if (now <= compareStart) { // if it's before the starttime, it's open
				return true; // return true, indicating it's currently open
			}
		}
		return false; // return false, indicating it's currently closed
	}
}

module.exports.app = app;
