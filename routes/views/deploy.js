var keystone = require('keystone');
var session = require('keystone/lib/session');
var Site = keystone.list('Site');
var Deployment = keystone.list('Deployment');
var Promise = require('bluebird');
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

				await(uninitialised.reduce(function (chain, deployment) {
					return chain.then(function () {
						// Do the initialisation
						return initPromise(deployment, res);
					}).then(function () {
						// Copy the env over
						return envPromise(deployment, res);
					}).then(function () {
						deployment.initialised = true;
						return deployment.save();
					}).catch(function (err) {
						// If a command failed somewhere, set to uninitialised.
						console.log('Error initialising server');
						console.log(err);
						deployment.initialised = false;
						return deployment.save();
					});
				}, Promise.resolve()));
			}

			// Get all the servers we're initialised on now
			let initialised = await(Deployment.model.find().where('site', site).where('initialised', true).populate('site server').exec());

			if (initialised.length) {
				// Update on all the servers we're on
				addInfo('Deploying update to ' + initialised.length.toString() + ' application servers.', res);
				await(initialised.reduce(function (chain, deployment) {
					return chain.then(function () {
						// Update the deployment
						return updatePromise(deployment, req.body.commit, res);
					});
				}, Promise.resolve()));
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

