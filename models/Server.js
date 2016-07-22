var keystone = require('keystone');

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

// TODO: Verify that keystone can connect to the given server before saving.

/**
 * Registration
 */
Server.defaultColumns = 'name, hostname';
Server.register();
