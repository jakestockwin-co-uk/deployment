var keystone = require('keystone');
var session = require('keystone/lib/session');
var Site = keystone.list('Site');
var Deployment = keystone.list('Deployment');
var asyncawait = require('asyncawait');
var async = asyncawait.async;
var await = asyncawait.await;

exports = module.exports = function (req, res) {
	var onSuccess = async(function (user) {
		if (!user.canDeploy) {
			addInfo('User not authorised to deploy new app versions', res);
			res.end();
			return;
		}

		try {

			let site = await(Site.model.findOne().where('githubRepository', req.body.project).exec());

			// Get all the servers we're not on yet
			let uninitialised = await(Deployment.model.find().where('site', site).where('initialised', false).populate('site server').exec());

			if (uninitialised.length) {
				// Initialise on any new servers
				addInfo('Initalising on ' + uninitialised.length.toString() + ' application servers.', res);

				for (let deployment of uninitialised) {
					try {
						await(initPromise(deployment, res));
						await(envPromise(deployment, res));
						deployment.initialised = true;
					} catch (err) {
						deployment.initialised = false;
					} finally {
						await(deployment.save());
					}
				}
			}

			// Get all the servers we're initialised on now
			let initialised = await(Deployment.model.find().where('site', site).where('initialised', true).populate('site server').exec());

			if (initialised.length) {
				// Update on all the servers we're on
				addInfo('Deploying update to ' + initialised.length.toString() + ' application servers.', res);
				let successfulDeployments = [];

				try {
					for (let deployment of initialised) {
						await(updatePromise(deployment, req.body.commit, res));
						successfulDeployments.push(deployment);
					}
				}
			}
		} catch (err) {
			console.log('ERROR: ');
			console.log(err);
		} finally {
			res.end('\n');
		}
	});

	var onFail = function (err) {
		var message = (err && err.message) ? err.message : 'Sorry, that email and/or password are not valid.';
		addInfo('Failed to log in:', res);
		addInfo(message, res);
		res.end();
	};

	session.signin(req.body, req, res, onSuccess, onFail);

};

function initPromise (deployment, res) {
	addInfo('Initialising on ' + deployment.server.hostname, res);
	return deployment.initDeploy(res);
}

function envPromise (deployment, res) {
	addInfo('Writing .env to ' + deployment.server.hostname, res);
	return deployment.writeEnv(res);
}

function updatePromise (deployment, commit, res) {
	addInfo('Deploying to ' + deployment.server.hostname, res);
	return deployment.updateToCommit(commit, res);
}

function addInfo (result, res) {
	res.write(result);
	res.write('\n');
}

