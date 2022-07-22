let globalPath = [];
let globalInd = 0;

function init() {
  console.log("Initializing");

  // Map
  const mapOptions = {
    center: { lat: 14.6091, lng: 121.0223 },
    zoom: 7,
    streetViewControl: false,
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
  
  // Interface
  document.getElementById("view_next").onclick = view_next;
  document.getElementById("view_prev").onclick = view_prev;
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

      globalPath = fullPath;
      view(0);

    } else {
      alert("Route Invalid");
    }
  });
}

function toCoord(latlng) {
  let split = latlng.split(",");
  return {
    lat: Number(split[0]),
    lng: Number(split[1]),
  };
}

// Uses Geometry interpolation (Not set to use roads)
function getFullPath2(route) {
  let fullPath = [];

  route.legs.forEach(function (leg) {
    leg.steps.forEach(function (step) {
      const start = step.start_location;
      const end = step.end_location;
      for (let i = 0; i < 10; i++) {
        const p = toCoord(google.maps.geometry.spherical.interpolate(start, end, i * 0.1).toUrlValue(4));

        if (fullPath.length > 0) {
          const prev = fullPath[fullPath.length - 1].point;
          if (p.lat == prev.lat && p.lng == prev.lng) {
            return;
          }

          const a = google.maps.geometry.spherical.computeHeading(prev, p);
          fullPath[fullPath.length - 1].angle = a;
        }
        
        fullPath.push({point: p, angle: 0});
      }
    });
  });

  fullPath[fullPath.length - 1].angle = fullPath[fullPath.length - 2].angle;

  return fullPath
}

// TODO: Collect all points first then...
// TODO: Create custom interpolate function to minimize the path
function getFullPath(route) {
  const firstPoint = toCoord(route.legs[0].steps[0].path[0].toUrlValue(4));  
  let fullPath = [{point: firstPoint, angle: 0}];

  route.legs.forEach(function (leg) {
    leg.steps.forEach(function (step) {
      step.path.forEach(function (point) {
        const p = toCoord(point.toUrlValue(4));
        const prev = fullPath[fullPath.length - 1].point;
        if (p.lat == prev.lat && p.lng == prev.lng) {
          return;
        }
        const a = google.maps.geometry.spherical.computeHeading(prev, p);
        fullPath[fullPath.length - 1].angle = a;

        fullPath.push({point: p, angle: 0});
      });
    });
  });

  fullPath[fullPath.length - 1].angle = fullPath[fullPath.length - 2].angle;

  return fullPath
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function view(index) {
  index = clamp(index, 0, globalPath.length - 1);
  let panoSettings = {
    position: globalPath[index].point,
    pov: {heading: globalPath[index].angle, pitch: 0},
    clickToGo: false,
    scrollwheel: false,
    linksControl: false,
  }
  const pano = new google.maps.StreetViewPanorama(document.getElementById("view"), panoSettings);
  console.log(panoSettings.position, panoSettings.pov)
  globalInd = index;
}

function view_next() {
  view(globalInd + 1);
}

function view_prev() {
  view(globalInd - 1);
}