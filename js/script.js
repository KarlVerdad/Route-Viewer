let globalPath = [];
let globalInd = 0;

let firstClick = false;
let isPlaying = false;
let positionUpdated = false;

let playInterval = null;
let rotInterval = null;

let activePov = {heading: 0, pitch: 0};
let activeMarker = null;

let hardDelay = 2000;     // Delay for slideshow interval
let pathInterval = 20;    // Distance per slide (meters)

let mapIcon = {
  path: "M0 -32 L24 32 L0 16 L-24 32 Z",
  fillColor: '#EA4335',
  fillOpacity: 1,
  strokeWeight: 0,
  scale: .5,
  rotation: 0,
}

function init() {
  // Map
  const mapOptions = {
    center: { lat: 14.6091, lng: 121.0223 },
    zoom: 7,
    streetViewControl: false,
    mapTypeControl: false,
  };
  const mapElement = document.getElementById("map");
  const map = new google.maps.Map(mapElement, mapOptions);
  mapElement.map = map;

  var options = {
    types: [],
  };

  // Marker
  let markerOptions = {
    map: map,
    icon: mapIcon,
  }
  activeMarker = new google.maps.Marker(markerOptions);

  // Streetview
  initialize_view();

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
    pause();
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

  const collapsibles = document.getElementsByClassName("collapsible");
  for (i = 0; i < collapsibles.length; i++) {
    collapsibles[i].addEventListener("click", function() {
      this.classList.toggle("active")

      var content = this.nextElementSibling;
      if (this.classList.contains("active")) {
        content.style.display = "block";
      } else {
        content.style.display = "none";
      }
    });
  }
  
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

      globalPath = fullPath;
      document.getElementById("view").pano.setPosition(globalPath[globalInd].position);
      document.getElementById("view").pano.setPov({heading: globalPath[globalInd].angle, pitch: 0});
      view(0);
      document.getElementById("timeline-container").classList.add("fade-in");

      firstClick = true;

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
  const threshold = pathInterval; // meters - minimum of 20m
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

function initialize_view() {
  // Streetview
  let panoSettings = {
    pov: {heading: 0, pitch: 0},
    clickToGo: false,
    scrollwheel: false,
    linksControl: false,
    panControl: false,
    zoomControl: false,
    fullscreenControl: false,
    source: google.maps.StreetViewSource.OUTDOOR,
  }
  const viewElement = document.getElementById("view");
  const pano = new google.maps.StreetViewPanorama(document.getElementById("view"), panoSettings);
  viewElement.pano = pano;
  globalInd = 0;

  pano.addListener("position_changed", function(){
    if (positionUpdated) {
      // FIX BUG: Tweens from small positive to small negative
      const viewElement = document.getElementById("view");
      activePov = {heading: absDeg(viewElement.pano.getPov().heading), pitch: 0};

      const targetAngle = absDeg(globalPath[globalInd].angle);
      //console.log(activePov.heading, targetAngle);

      createjs.Tween.get(activePov).to({heading: targetAngle}, 2000,
        createjs.Ease.cubicOut).call(function(){ clearInterval(rotInterval) });
      
      rotInterval = setInterval(function(){
        const newPov = {heading: negDeg(activePov.heading), pitch: 0};
        viewElement.pano.setPov(newPov);
      }, 10);
    }
    positionUpdated = !(positionUpdated);
  });
}

function absDeg(angle) {
  if (angle <= 0) {
    //console.log(`Negative: ${angle}`);
    return 360 + angle;
  }
  return angle;
}

function negDeg(angle) {
  if (angle >= 180) {
    return angle - 360;
  }
  return angle
}

function view(index) {
  index = clamp(index, 0, globalPath.length - 1);

  // Streetview
  const viewElement = document.getElementById("view");
  viewElement.pano.setPosition(globalPath[index].point);
  //viewElement.pano.setPov({heading: globalPath[index].angle, pitch: 0});
  globalInd = index;

  let mapElement = document.getElementById("map");
  mapIcon.rotation = globalPath[index].angle;
  activeMarker.setIcon(mapIcon);
  activeMarker.setPosition(globalPath[index].point);
  
  mapElement.map.panTo(globalPath[index].point);
  if (firstClick) {
    mapElement.map.setZoom(18);
    firstClick = false;
  }
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
  let mapElement = document.getElementById("map");
  mapElement.map.panTo(globalPath[globalInd].point);

  isPlaying = true;
  document.getElementById("play_btn").textContent = "Pause";
  const delay = hardDelay;
  
  const next = function() {
    if (globalInd >= globalPath.length - 2) {
      pause();
    }    
    view_next();
  }

  playInterval = setInterval(next, delay);

  // Turn on input blocker
  document.getElementById("input-blocker").style.display = "visible";
}

function pause() {
  isPlaying = false;
  document.getElementById("play_btn").textContent = "Play";
  clearInterval(playInterval);

  // Turn off input blocker
  document.getElementById("input-blocker").style.display = "none";
}

function minimizeMap() {
  document.getElementById("map-container").classList.add("minimap");
}


function rot() {
  const viewElement = document.getElementById("view");
  setInterval(function(){
    let pov = viewElement.pano.getPov();
    pov.heading += 1;
    viewElement.pano.setPov(pov);
  }, 100);
}
