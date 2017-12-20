var cors = require('cors');
var app = require('express')();
var recover = require('./utils/recoverAddress');


app.use(cors({
  origin: '*',
}))

app.get('/name/:name/:sig', function (req, res) {
  var address = recover(req.params.name, req.params.sig);
  // do stuff
  res.sendStatus(200);
})

app.listen(8080);
