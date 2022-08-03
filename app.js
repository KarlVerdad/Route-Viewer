const express = require('express');

const app = express();

app.set('view engine', 'ejs');
app.listen(process.env.PORT || 8080);

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.render('route_finder');
});