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
		return this.toIntent('AskCafeNameIntent');
	},

	AskCafeNameIntent() {
		this.ask('Hey there! Which dining hall are you interested in?', 'Hi there! Where do you want to eat?');
	},

	CafeNameIntent() {
		return this.toIntent('CafeIntent');
	},

	async CafeIntent() {
		// calls getCafeInfo() with id from spoken argument (from lang model)
		const [statResult, nextTime] =  await getCafeInfo( this.$inputs.cafe.id );
		console.log("Result: " + statResult.toString() ); // testing
		var message = "";
		if (statResult === true) { // if it's true, say it's open
			message += ( this.$inputs.cafe.value + " is currently open."); // tell 'em
			// then tell the user how soon it will close
			message += (" However, it will close in " + nextTime);
		}
		else { // if statResult is false, say it's closed, and whether it reopens today
			message += ( this.$inputs.cafe.value + " is currently closed.");
			console.log("nextTime->" + nextTime); // testing
			if ( (nextTime !== false) && (nextTime !== "0 minutes") ) { // if nextTime is not false, it will reopen today
				// thus, tell the user how soon it will reopen
				message += (" However, it will reopen in " + nextTime);
			}
			else { // otherwise, it will be closed for the rest of the day, tell the user
				message += (" It will remain closed for the remainder of the day.");
			}
		}
		// tells the user the final report (open/closed and for how long)
		// originally had multiple tells, but that doesn't work, so modified str instead
		this.tell(message);
	},
});

// getCafeInfo() - calls cafebonappetit API v2 and returns current information
async function getCafeInfo(givenID) {
	// const cafeID = '1447'; // set cafe id here, will be easier to adapt for all later
	const cafeID = givenID; // taken from spoken input (id assoc with name)
	const apiBase = 'https://legacy.cafebonappetit.com/api/2/cafes?cafe='; // base api
	const options = {
		uri: apiBase.concat(cafeID), // base api url concat w selected cafe's ID
		json: true // parses json string
	};
	const data = await requestPromise(options); // call api and store in data
	const dayInfo = data.cafes[cafeID].days['0'].dayparts; // grab open periods for today
	const dayStatus = data.cafes[cafeID].days['0'].status; // grab status for today
	return checkOpen(dayInfo, dayStatus); // feeds dayInfo to checkOpen, which returns boolean
}

// checkOpen(dayInfo, dayStatus) - takes current day info (and status, in case it's
// closed all day) and checks to see if current time is during an open period 
// (there must be better way to do this using api, but it's unclear how)
function checkOpen(dayInfo, dayStatus) { // need to add support for different time zones later
	// check whether it's closed for the day by comparing status string with "closed"
	if (dayStatus === "closed") { // if strings match, then
		return [false, false]; // return false twice, indicating it's closed today
	} // if not, just move on
	var now = new Date(); // grab current date and time
	var compareStart = new Date(); // grab current date again for easier comparing later
	var compareEnd = new Date(); // grab current date again for easier comparing later
	// loop over each period of day that cafe is open (for length of list at indices)
	for (var dayPart = 0; dayPart < dayInfo.length; dayPart++) {
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
			if (now >= compareStart) { // if it's after the starttime, it's open
				// return true (bc it's open), time diff as string
				return [true, timeDiff(compareEnd, now)];
			}
		}
	}
	return [false, timeDiff(compareStart, now)]; // return false (bc it's closed), diff
}

// timeDiff(timeA, timeB) - takes two times and compares them, gives str diff
// that voice assistant can speak
function timeDiff(timeA, timeB) {
	if (timeA === undefined) {
		// message += " and it's closed for the rest of the day.";
		return false; // indicates it's closed for the day
	}
	var message = ""; // string for storing final
	var diff = (Math.abs(timeA - timeB) / 60000); // diff in minutes
	if (diff > 60) { // if it's more than an hour, break it down
		message += ( Math.floor(diff/60).toString() + " hours"); // int div for hour diff
		message += (" and " + (diff % 60).toString() + " minutes"); // rem div for mins
	}
	else { // it's less than an hour, return just mins
		message += ((diff % 60).toString() + " minutes"); // convert mins to string
	}
	return message; // return stringified diff between two times
}

module.exports.app = app;
