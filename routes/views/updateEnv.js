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
			addInfo('User not authorised to update .env files', res);
			return finish(false, res);
		}

		if (!req.body.project) {
			addInfo('No project specified. Aborting.', res);
			return finish(false, res);
		}

		try {

			let site = await(Site.model.findOne().where('githubRepository', req.body.project).exec());

			// Get all the servers we're not on yet
			let deployments = await(Deployment.model.find().where('site', site).where('initialised', true).populate('site server').exec());

			if (deployments.length) {
				// Initialise on any new servers
				addInfo('Updating .env on ' + deployments.length.toString() + ' application servers.', res);

				let allSuccessful = true;
				for (let deployment of deployments) {
					try {
						await(envPromise(deployment, res));
						await(restartPromise(deployment, res));
					} catch (err) {
						addInfo('Error while restarting deployment on ' + deployment.server.hostname + '.', res);
						addInfo(err.message, res);
						addInfo('Not sure what to do here, so I\'ll carry on.', res);
						allSuccessful = false;
					}
				}
				return finish(allSuccessful, res);
			}

		} catch (err) {
			console.log('ERROR: ');
			console.log(err);
			return finish(false, res);
		}
	});

	var onFail = function (err) {
		var message = (err && err.message) ? err.message : 'Sorry, that email and/or password are not valid.';
		addInfo('Failed to log in:', res);
		addInfo(message, res);
		return finish(false, res);
	};

	if (req.user && req.user.canDeploy) {
		onSuccess(req.user);
	} else if (req.body.email && req.body.password) {
		session.signin(req.body, req, res, onSuccess, onFail);
	} else {
		onFail(new Error('You must be logged in, or provide email and password credentials in your request, to do this'));
	}
};

function envPromise (deployment, res) {
	addInfo('Writing .env to ' + deployment.server.hostname, res);
	return deployment.writeEnv(res);
}

function restartPromise (deployment, res) {
	addInfo('Deploying to ' + deployment.server.hostname, res);
	return deployment.updateToCommit(deployment.site.lastSuccessfulCommit, res);
}

function addInfo (result, res) {
	res.write(result);
	res.write('\n');
}

function finish (success, res) {
	res.write(success ? '[SUCCESS]' : '[FAILURE]');
	res.end('\n');
}

