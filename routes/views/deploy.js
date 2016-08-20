var keystone = require('keystone');
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
		addInfo('Initialising on ' + currentDeploy.server.hostname, res);
		currentDeploy.initSiteOnServer(res).then(function (status) {
			// TODO: Handle failure status
			addInfo('Writing .env to ' + currentDeploy.server.hostname, res);
			return currentDeploy.writeEnv(res);
		}).then(function (status) {
			// Handle failure status
			currentDeploy.initialised = true;
			currentDeploy.save();
			initCallback(allDeployments, newDeployments, commit, res);
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
		addInfo('Deploying to ' + currentDeploy.server.hostname, res);
		currentDeploy.updateSite(commit, res).then(function (status) {
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

function addInfo (result, res) {
	res.write(result);
	res.write('\n');
}

