var keystone = require('keystone');
var session = require('keystone/lib/session');
var Site = keystone.list('Site');
var Deployment = keystone.list('Deployment');
var asyncawait = require('asyncawait');
var async = asyncawait.async;
var await = asyncawait.await;

exports = module.exports = function (req, res) {
	var onLogin = async(function (user) {
		if (!user.canDeploy) {
			addInfo('User not authorised to deploy new app versions', res);
			return finish(false, res);
		}

		if (!req.body.project) {
			addInfo('No project specified. Aborting.', res);
			return finish(false, res);
		}

		try {

			let site = await(Site.model.findOne().where('githubRepository', req.body.project).exec());

			if (req.body.commit) {
				site.lastAttemptedCommit = req.body.commit;
			} else {
				addInfo('No commit specified, redeploying the last attempted', res);
			}

			await(site.save());

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
				let attemptedDeployments = [];

				try {
					for (let deployment of initialised) {
						attemptedDeployments.push(deployment);
						await(updatePromise(deployment, deployment.site.lastAttemptedCommit, res));
					}
					site.lastSuccessfulCommit = site.lastAttemptedCommit;
					site.lastDeploySuccessful = true;
					site.allServersRunning = true;
					await(site.save());
					return finish(true, res);
				} catch (err) {
					addInfo('Updating a deployment has failed:', res);
					addInfo(err.message, res);
					addInfo('I will try to revert all those that I have already updated.', res);
					let running = true;
					for (let deployment of attemptedDeployments) {
						try {
							await(updatePromise(deployment, deployment.site.lastSuccessfulCommit, res));
						} catch (err) {
							running = false;
							addInfo('Error while reverting deployment on ' + deployment.server.hostname + '.', res);
							addInfo(err.message, res);
							addInfo('Something is very wrong. I will keep trying with the rest though, because I don\'t know what else to do.', res);
						}
					}
					site.lastDeploySuccessful = false;
					site.allServersRunning = running;
					await(site.save());
					return finish(false, res);
				}
			}
		} catch (err) {
			console.log('ERROR: ');
			console.log(err);
			return finish(false, res);
		}
	});

	var onLoginFail = function (err) {
		var message = (err && err.message) ? err.message : 'Sorry, that email and/or password are not valid.';
		addInfo('Failed to log in:', res);
		addInfo(message, res);
		return finish(false, res);
	};

	if (req.user && req.user.canDeploy) {
		onLogin(req.user);
	} else if (req.body.email && req.body.password) {
		session.signin(req.body, req, res, onLogin, onLoginFail);
	} else {
		onLoginFail(new Error('You must be logged in, or provide email and password credentials in your request, to deploy things'));
	}
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

function finish (success, res) {
	res.write(success ? '[SUCCESS]' : '[FAILURE]');
	res.end('\n');
}

