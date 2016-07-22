var keystone = require('keystone');

/**
 * EnvironmentVariable Model
 * ==========
 */
var EnvironmentVariable = new keystone.List('EnvironmentVariable');

EnvironmentVariable.add({
	name: { type: String, required: true, index: true },
	key: { type: String, required: true, initial: true, index: true },
	value: { type: String, required: true, initial: true, index: true },

});

/**
 * Registration
 */
EnvironmentVariable.defaultColumns = 'name, key';
EnvironmentVariable.register();
