var keystone = require('keystone');
var child_process = require('child_process');
var session = require('keystone/lib/session');
var Site = keystone.list('Site');
var Deployment = keystone.list('Deployment');

exports = module.exports = function (req, res) {
	var onSuccess = function (user) {
		if (!user.canDeploy) {
			addInfo('User not authorised to deploy new app versions', res);
			res.end();
			return;
		}
		Site.model.findOne().where('githubRepository', req.body.project).exec().then(function (site) {
			return Deployment.model.find().where('site', site).populate('site server').exec();
		}).then(function (deployments) {
			// Initialise on new servers
			let uninitialised = deployments.filter(deploy => !deploy.initialised);
			addInfo('Initalising on ' + uninitialised.length.toString() + ' application servers.', res);
			initCallback(deployments, uninitialised, req.body.commit, res);
		});
	};

	var onFail = function (err) {
		var message = (err && err.message) ? err.message : 'Sorry, that email and/or password are not valid.';
		addInfo('Failed to log in:', res);
		addInfo(message, res);
		res.end();
	};

	session.signin(req.body, req, res, onSuccess, onFail);

};

function initCallback (allDeployments, newDeployments, commit, res) {
	if (newDeployments.length > 0) {
		let currentDeploy = newDeployments.shift(); // Pull first element out of the array. This allows us to iterate over the array by recursion
		let site = currentDeploy.site;
		let server = currentDeploy.server;
		addInfo('Initialising on ' + server.hostname, res);
		let child = initSiteOnServer(server, site.name, site.githubRepository);
		child.stdout.on('data', (chunk) => { res.write(chunk.toString().replace(/^(?!\s*$)/mg, '    ')); });
		child.on('exit', (status) => {
			// TODO: Handle failure status
			addInfo('Writing .env to ' + server.hostname, res);
			site.populate('environmentVariables', function () {
				var child = writeEnv(server, site.name, site.environmentVariables, site.port);
				child.stdout.on('data', (chunk) => { res.write(chunk.toString().replace(/^(?!\s*$)/mg, '    ')); });
				child.on('exit', (status) => {
					// Handle failure status
					currentDeploy.initialised = true;
					currentDeploy.save();
					initCallback(allDeployments, newDeployments, commit, res);
				});
			});
		});
	} else {
		// Update on all existing servers
		let validDeployments = allDeployments.filter(deploy => deploy.initialised);
		addInfo('Deploying update to ' + validDeployments.length.toString() + ' application servers.', res);
		updateCallback(validDeployments, commit, res);
	}
}

function updateCallback (deployments, commit, res) {
	if (deployments.length > 0) {
		let currentDeploy = deployments.shift();
		let site = currentDeploy.site;
		let server = currentDeploy.server;
		addInfo('Deploying to ' + server.hostname, res);
		let child = updateSite(server, site.name, commit);
		child.stdout.on('data', (chunk) => { res.write(chunk.toString().replace(/^(?!\s*$)/mg, '    ')); });
		child.on('exit', (status) => {
			switch (status) {
				case 0:
					currentDeploy.commit = commit;
					currentDeploy.upToDate = true;
					currentDeploy.running = true;
					break;
				case 2:
					currentDeploy.upToDate = false;
					currentDeploy.running = true;
					break;
				case 3:
				case 4:
					currentDeploy.upToDate = false;
					currentDeploy.running = false;
					break;
			}
			currentDeploy.save();
			updateCallback(deployments, commit, res);
		});
	} else {
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

