let http = require('http');

let server = http.createServer((req,res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, Mocha!');
});

exports.listen = function(port) {
  console.log('Listening on: ' + port);
  server.listen(port);
};

// close destroys the server.
exports.close = function() {
  server.close();
};
