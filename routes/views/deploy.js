var keystone = require('keystone');
var child_process = require('child_process');

exports = module.exports = function (req, res) {
	addInfo('User is ' + req.user, res);
	var Site = keystone.list('Site');
	Site.model.findOne().populate('servers deployedServers environmentVariables').where('githubRepository', req.body.project).exec().then(function (site) {
		// Initialise on new servers
		let undeployedServers = site.servers.filter(
			(server) => !site.deployedServers.some(
				(deployed) => server._id.toString() === deployed._id.toString()
			)
		); // This is not as elegant as I'd hoped. Might want to do it a different way?
		addInfo('Initalising on ' + undeployedServers.length.toString() + ' application servers.', res);
		initCallback(site, undeployedServers, req.body.commit, res);
	});
};

function initCallback (site, servers, commit, res) {
	if (servers.length > 0) {
		var server = servers.shift(); // Pull first element out of the array. This allows us to iterate over the array by recursion
		addInfo('Initialising on ' + server.hostname, res);
		var child = initSiteOnServer(server, site.name, site.githubRepository);
		child.stdout.on('data', (chunk) => { res.write(chunk); });
		child.on('exit', (status) => {
			// TODO: Handle failure status
			addInfo('Writing .env to ' + server.hostname, res);
			var child = writeEnv(server, site.name, site.environmentVariables, site.port);
			child.stdout.on('data', (chunk) => { res.write(chunk); });
			child.on('exit', (status) => {
				// Handle failure status
				site.deployedServers.push(server);
				site.save();
				initCallback(site, servers, commit, res);
			});
		});
	} else {
		// Update on all existing servers
		let stillToUpdate = site.deployedServers.slice(); // Shallow-copy the array because we don't want to edit the proper version
		addInfo('Deploying update to ' + stillToUpdate.length.toString() + ' application servers.', res);
		updateCallback(site, stillToUpdate, commit, res);
	}
}

function updateCallback (site, servers, commit, res) {
	if (servers.length > 0) {
		var server = servers.shift();
		addInfo('Deploying to ' + server.hostname, res);
		var child = updateSite(server, site.name, commit);
		child.stdout.on('data', (chunk) => { res.write(chunk); });
		child.on('exit', (status) => { updateCallback(site, servers, commit, res); });
	} else {
		site.save();
		res.end('\n');
	}
}

function initSiteOnServer (server, siteName, repo) {
	var command = './run-remote';
	var args = [server.hostname, 'deploy-new-app.sh', siteName, repo]; // For these we might want to stick a user@ string onto the start of the host string.
	return child_process.spawn(command, args);
}

function writeEnv (server, siteName, vars, port) {
	var command = './write-remote-file';
	var fileContents = vars.map((varObject) => varObject.key + '=' + varObject.value).concat('PORT=' + port.toString()).reduce((last, current) => last + '\n' + current);
	var args = [server.hostname, siteName + '/.env'];
	var child = child_process.spawn(command, args);
	child.stdin.write(fileContents);
	child.stdin.end();
	return child;
}

function updateSite (server, siteName, commit) {
	var command = './run-remote';
	var args = [server.hostname, 'deploy-app-update.sh', siteName, commit];
	return child_process.spawn(command, args);
}

function addInfo (result, res) {
	res.write(result);
	res.write('\n');
}
