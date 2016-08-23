var keystone = require('keystone');
var Deployment = keystone.list('Deployment');
var asyncawait = require('asyncawait');
var async = asyncawait.async;
var await = asyncawait.await;

/**
 * Server Model
 * ==========
 */
var Server = new keystone.List('Server', {
	track: true,
});

Server.add({
	name: { type: String, required: true, index: true },
	hostname: { type: String, initial: true, required: true, index: true },
});

Server.relationship({ path: 'deploys', ref: 'Deployment', refPath: 'server' });

// TODO: Verify that keystone can connect to the given server before saving.

Server.schema.pre('remove', async(function (next) {
	let deployments = await(Deployment.model.find().where('server', this).populate('site server').exec());
	for (let deployment of deployments) {
		await(deployment.remove());
	}
	next();
}));

/**
 * Registration
 */
Server.defaultColumns = 'name, hostname';
Server.register();
