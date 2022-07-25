let globalPath = [];
let globalInd = 0;

let isPlaying = false;
let playInterval = null;

function init() {
  // Map
  const mapOptions = {
    center: { lat: 14.6091, lng: 121.0223 },
    zoom: 7,
    streetViewControl: false,
    mapTypeControl: false,
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
  document.getElementById("calculate_btn").onclick = onChangeHandler;
  
  // Interface
  const view_next_btn = function() {
    view_next();
    pause();
  }

  const view_prev_btn = function() {
    view_prev();
    pause();
  }

  document.getElementById("view_next").onclick = view_next_btn;
  document.getElementById("view_prev").onclick = view_prev_btn;
  document.getElementById("view_btn").onclick = view_btn;
  document.getElementById("play_btn").onclick = togglePlay;
}

function calcRoute(service, renderer) {
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
      //console.log(fullPath);

      globalPath = fullPath;
      view(0);
      document.getElementById("timeline-container").classList.add("fade-in");

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

// TODO: Collect all points first then...
// TODO: Create custom interpolate function to minimize the path
function getFullPath(route) {
  // RawPath
  let fullPath = [];
  route.legs.forEach(function (leg) {
    leg.steps.forEach(function (step) {
      step.path.forEach(function (point) {
        const p = toCoord(point.toUrlValue(10));

        if (fullPath.length > 0) {
          const prev = fullPath[fullPath.length - 1].point;
          if (p.lat == prev.lat && p.lng == prev.lng) {
            return;
          }

          const a = google.maps.geometry.spherical.computeHeading(prev, p);
          fullPath[fullPath.length - 1].angle = a;
        }

        fullPath.push({point: p, angle: 0});
      });
    });
  });

  fullPath[fullPath.length - 1].angle = fullPath[fullPath.length - 2].angle;

  // Minimize Path
  const threshold = 20; // meters - minimum of 20m
  let minimizedPath = [fullPath[0]];
  let dist = 0;

  for (let i = 1; i < fullPath.length; i++) {
    const p1 = fullPath[i - 1];
    const p2 = fullPath[i];

    const rem_dist = threshold - dist;
    const p_dist = google.maps.geometry.spherical.computeDistanceBetween(p1.point, p2.point);

    if (p_dist > rem_dist) {
      const next_p = toCoord(google.maps.geometry.spherical.computeOffset(p1.point, rem_dist, p1.angle).toUrlValue(10));
      minimizedPath.push({point: next_p, angle: p1.angle});
      dist = p_dist - rem_dist; 

      // For low threshold values
      let curr_p = next_p;
      while (dist > threshold) {
        const low_p = toCoord(google.maps.geometry.spherical.computeOffset(curr_p, threshold, p1.angle).toUrlValue(10));
        minimizedPath.push({point: low_p, angle: p1.angle});

        curr_p = low_p;
        dist -= threshold;
      }

    } else {
      dist += p_dist;
    }
  }

  minimizedPath.push(fullPath[fullPath.length - 1])

  return minimizedPath;
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
  globalInd = index;
}

function view_btn() {
  minimizeMap();
  document.getElementById("view_btn").style.display = "none";
  document.getElementById("timeline-controls").style.display = "block";
}

function view_next() {
  view(globalInd + 1);
}

function view_prev() {
  view(globalInd - 1);
}

function togglePlay() {
  if (isPlaying) {
    pause();
  }
  else {
    play();
  }
}

function play() {
  isPlaying = true;
  document.getElementById("play_btn").textContent = "Pause";
  const delay = 1000;
  
  const next = function() {
    if (globalInd >= globalPath.length - 1) {
      clearInterval(playInterval)
    }    
    view_next();
  }

  playInterval = setInterval(next, delay);
}

function pause() {
  isPlaying = false;
  document.getElementById("play_btn").textContent = "Play";
  clearInterval(playInterval);
}

function minimizeMap() {
  document.getElementById("map").classList.add("minimap");
}
