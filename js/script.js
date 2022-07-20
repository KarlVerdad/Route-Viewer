function init() {
  console.log("Initializing");

  // Map
  const mapOptions = {
    center: { lat: 14.6091, lng: 121.0223 },
    zoom: 7,
  };
  const map = new google.maps.Map(document.getElementById("map"), mapOptions);

  var options = {
    types: [],
  };

  // Autocomplete
  var input1 = document.getElementById("start");
  var autocomplete1 = new google.maps.places.Autocomplete(input1, options);

  var input2 = document.getElementById("end");
  var autocomplete2 = new google.maps.places.Autocomplete(input2, options);

  // Route
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  const onChangeHandler = function () {
    calcRoute(directionsService, directionsRenderer);
  };
  document.getElementById("calculate").onclick = onChangeHandler;
}

function calcRoute(service, renderer) {
  console.log("Calculating Route");

  let request = {
    origin: document.getElementById("start").value,
    destination: document.getElementById("end").value,
    travelMode: "DRIVING",
  };
  service.route(request, function (result, status) {
    if (status == "OK") {
      renderer.setDirections(result);

      const route = result.routes[0];
      let fullPath = getFullPath(route);
      console.log(fullPath);
    } else {
      alert("Route Invalid");
    }
  });
}

// TODO: Returns a straight path with a minimized number of waypoints
function straightenPath(path) {
  let newPath;
  let angle = null;

  for (let i = 0; i < path.length; i++) {
    if (i == path.length - 1) {
      break;
    }
    let p1 = toPoint(path[i].toUrlValue(4));
    let p2 = toPoint(path[i + 1].toUrlValue(4));
    if (p1.x == p2.x && p1.y == p2.y) {
      continue;
    }

    console.log(i, p1, p2);
    let newAngle = calcAngleDeg(p1, p2);
    console.log(newAngle);
  }
}

function calcAngleDeg(p1, p2) {
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
}

function toPoint(latlng) {
  let split = latlng.split(",");
  return {
    x: split[1],
    y: split[0],
  };
}

function getFullPath(route) {
  const firstPoint = toPoint(route.legs[0].steps[0].path[0].toUrlValue(4));
  let fullPath = [firstPoint];

  route.legs.forEach(function (leg) {
    leg.steps.forEach(function (step) {
      step.path.forEach(function (point) {
        let p = toPoint(point.toUrlValue(4));
        let prev = fullPath[fullPath.length - 1];
        if (p.x == prev.x && p.y == prev.y) {
          return;
        }
        fullPath.push(p);
      });
    });
  });

  return fullPath
}
