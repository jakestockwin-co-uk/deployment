var keystone = require('keystone');
var sleep = require('sleep');

// Replace with something actually useful, obviously...
// Probably an AppServer model?
var appServers = [];

exports = module.exports = function (req, res) {
  // Probably use a Project model to keep track of these?
	var Site = keystone.list('Site');
	Site.model.findOne().populate('servers').where('githubRepository', req.body.project).exec(function (err, site) {
		if (err) {
			console.log(err);
		} else {
			appServers = site.servers;
		}
	}).then(function () {
		addResult('Deploying to ' + appServers.length.toString() + ' application servers.', res);
		for (var i = 0; i < appServers.length; i++) {
			var server = appServers[i];
			// Might want to do some success/failure processing here
			addResult(processItem(server, req.body), res);
		}
		finish(res);
	});
};

// This needs to not be a noop dummy function, obviously...
function processItem (server, details) {
	sleep.sleep(5);
	return Math.random() > 0.5 ? 'Successfully deployed version ' + details.commit + ' of ' + details.project + ' to app server ' + server.name
								: 'Failed to deploy version ' + details.commit + ' of ' + details.project + ' to app server ' + server.name;
}

function addResult (result, res) {
	res.write(result);
	res.write('\n');
}

function finish (res) {
	res.end();
}
