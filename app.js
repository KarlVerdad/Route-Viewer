const express = require('express');

const app = express();

app.set('view engine', 'ejs');
app.listen(3000);

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.render('route_finder');
});