var child_process = require('child_process');

module.exports = function (command, args, outStream, contentIn) {
	return new Promise((resolve, reject) => {
		var child = child_process.spawn(command, args);
		if (outStream) {
			outStream.write('    ');
			child.stdout.on('data', (chunk) => { outStream.write(chunk.toString().replace(/\n/mg, '\n    ')); });
		}
		child.on('exit', (status) => {
			if (outStream) { outStream.write('\n'); }
			resolve(status);
		});
		child.on('error', (err) => {
			if (outStream) { outStream.write('\n'); }
			reject(err);
		});
		if (contentIn) {
			child.stdin.write(contentIn);
			child.stdin.end();
		}
	});
};
