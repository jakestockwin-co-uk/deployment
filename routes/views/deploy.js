var keystone = require('keystone');
var child_process = require('child_process');

var appServers = [];
var serversToDeploy = [];
var vars = [];
var siteName = '';
var repo = '';
var port = 0;

exports = module.exports = function (req, res) {
	addResult('User is ' + req.user, res);
  // Probably use a Project model to keep track of these?
	var Site = keystone.list('Site');
	Site.model.findOne().populate('servers undeployedServers environmentVariables').where('githubRepository', req.body.project).exec(function (err, site) {
		if (err) {
			console.log(err);
		} else {
			siteName = site.name;
			appServers = site.servers;
			serversToDeploy = site.undeployedServers;
			repo = site.githubRepository;
			vars = site.environmentVariables;
			port = site.port;
			site.undeployedServers = []; // TODO: We should remove servers based on the success of initSiteOnServer, not indiscriminately.
			site.save();
		}
	}).then(function () {
		addResult('Initalising on ' + serversToDeploy.length.toString() + ' application servers.', res);
		var i;
		var server;
		var results;
		for (i = 0; i < serversToDeploy.length; i++) {
			server = appServers[i];
			addResult('Initialising on ' + server.hostname, res);
			results = initSiteOnServer(server, siteName, repo);
			addResult(results.stdout.toString(), res);
			addResult('Writing to .env file', res);
			writeEnv(server, siteName, vars);
			addResult('Done', res);
		}
		addResult('Deploying to ' + appServers.length.toString() + ' application servers.', res);
		for (i = 0; i < appServers.length; i++) {
			server = appServers[i];
			addResult('Deploying to ' + server.hostname, res);
			results = updateSite(server, siteName, req.body.commit); // TODO: We'll want to update the commit field of the site according to the result of this.
			// results.status is 0 for success or 1,2,3,4 for different errors (see script), we'll probably want to be using that.
			addResult(results.stdout.toString(), res);
		}
		finish(res);
	});
};

function initSiteOnServer (server, siteName, repo) {
	var command = './run-remote';
	var args = [server.hostname, 'deploy-new-app.sh', siteName, repo]; // For these we might want to stick a user@ string onto the start of the host string.
	return child_process.spawnSync(command, args); // Can we make this async nicely, I wonder? Don't want the servers all updating at once is the issue.
}

function writeEnv (server, siteName, vars) {
	var command = './write-remote-file';
	var fileContents = vars.map((varObject) => varObject.key + '=' + varObject.value).concat('PORT=' + port.toString()).reduce((last, current) => last + '\n' + current);
	var args = [server.hostname, siteName + '/.env'];
	return child_process.spawnSync(command, args, { input: fileContents });
}

function updateSite (server, siteName, commit) {
	var command = './run-remote';
	var args = [server.hostname, 'deploy-app-update.sh', siteName, commit];
	return child_process.spawnSync(command, args);
}

function addResult (result, res) {
	res.write(result);
	res.write('\n');
}

function finish (res) {
	res.end();
}
