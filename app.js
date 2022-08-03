require('dotenv').config()
const express = require('express');
const app = express();

let googleKey = process.env.GOOGLE_APIKEY || "AIzaSyDwWKpIuD0YVqLjDohbUqgOeYxsKvgTPM0";
let googleAPI = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places&callback=init`

app.set('view engine', 'ejs');
app.listen(process.env.PORT || 8080);

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.render('route_finder', { googleAPI });
});