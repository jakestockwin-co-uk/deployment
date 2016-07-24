var keystone = require('keystone');
var sleep = require('sleep');
var child_process = require('child_process');

var appServers = [];
var serversToDeploy = [];
var siteName = "";
var repo = "";

exports = module.exports = function (req, res) {
	addResult("User is "+req.user, res);
  // Probably use a Project model to keep track of these?
	var Site = keystone.list('Site');
	Site.model.findOne().populate('servers', 'undeployedServers').where('githubRepository', req.body.project).exec(function (err, site) {
		if (err) {
			console.log(err);
		} else {
			siteName = site.name
			appServers = site.servers;
			serversToDeploy = site.undeployedServers;
			repo = site.githubRepository;
			console.log(site.undeployedServers);
			site.undeployedServers = [];
			site.save();
		}
	}).then(function () {
		addResult('Initalising on ' + serversToDeploy.length.toString() + ' application servers.', res);
		for (var i = 0; i < serversToDeploy.length; i++) {
			var server = appServers[i];
			results = initSiteOnServer(server, siteName, repo);
			addResult(results.stdout, res);
		}
		addResult('Deploying to ' + appServers.length.toString() + ' application servers.', res);
		for (var i = 0; i < appServers.length; i++) {
			var server = appServers[i];
			// Might want to do some success/failure processing here
			results = updateSite(server, siteName, req.body.commit);
			addResult(results.stdout, res);
		}
		finish(res);
	});
};

function initSiteOnServer(server, siteName, repo) {
	var command = './run-remote';
	var args =  [server.hostname, 'deploy-new-app.sh', siteName, repo];
	return child_process.spawnSync(command, args); // Can we make this async nicely, I wonder?
	//Still need to do .env.
}

function updateSite (server, siteName, commit) {
	var command = './run-remote';
	var args =  [server.hostname, 'deploy-app-update.sh', siteName, commit];
	return child_process.spawnSync(command, args);
}

function addResult (result, res) {
	res.write(result);
	res.write('\n');
}

function finish (res) {
	res.end();
}
