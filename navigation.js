/* =========================================================================
   URBAN ROUTE FLEET — FULL-SCREEN NAVIGATION & PRIOR CHARGING SLOT BOOKING
   ========================================================================= */

const BOOKINGS_STORAGE_KEY = 'urfSlotBookings';

const navState = {
  trip: null,
  mapLayer: 'streets',
  isNavigating: false,
  steps: [],
  currentStepIndex: 0,
  gpsWatchId: null,
  userGpsMarker: null,
  autoFollowGps: true,
  activeBookingId: null,
  skippedBooking: false
};

let toastTimer = null;

// -------------------------------------------------------------------------
// 1. DOM REFERENCES
// -------------------------------------------------------------------------
const dom = {
  navMapPanel: document.getElementById('navMapPanel'),
  btnBackToPlanner: document.getElementById('btnBackToPlanner'),
  btnGoPlannerEmpty: document.getElementById('btnGoPlannerEmpty'),
  btnToggleLayer: document.getElementById('btnToggleLayer'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),

  navHud: document.getElementById('navHud'),
  navTurnIcon: document.getElementById('navTurnIcon'),
  navStepDistance: document.getElementById('navStepDistance'),
  navStepInstruction: document.getElementById('navStepInstruction'),
  navNextStepText: document.getElementById('navNextStepText'),
  btnNavRecenter: document.getElementById('btnNavRecenter'),
  btnNavLayer: document.getElementById('btnNavLayer'),
  btnPrevStep: document.getElementById('btnPrevStep'),
  btnNextStep: document.getElementById('btnNextStep'),
  navSpeedVal: document.getElementById('navSpeedVal'),
  navEtaRemaining: document.getElementById('navEtaRemaining'),
  navMetaSub: document.getElementById('navMetaSub'),
  btnExitNavigation: document.getElementById('btnExitNavigation'),
  navToast: document.getElementById('navToast'),

  noTripCard: document.getElementById('noTripCard'),
  tripContentWrap: document.getElementById('tripContentWrap'),
  tripRouteTitle: document.getElementById('tripRouteTitle'),
  tripTrafficBadge: document.getElementById('tripTrafficBadge'),
  tripStartLabel: document.getElementById('tripStartLabel'),
  tripChargerRow: document.getElementById('tripChargerRow'),
  tripChargerLabel: document.getElementById('tripChargerLabel'),
  tripEndLabel: document.getElementById('tripEndLabel'),
  statDistance: document.getElementById('statDistance'),
  statDuration: document.getElementById('statDuration'),
  statArrival: document.getElementById('statArrival'),
  btnStartNav: document.getElementById('btnStartNav'),

  bookingStateBadge: document.getElementById('bookingStateBadge'),
  slotStationName: document.getElementById('slotStationName'),
  slotStationMeta: document.getElementById('slotStationMeta'),
  customStationGroup: document.getElementById('customStationGroup'),
  inputStationName: document.getElementById('inputStationName'),
  bookingFormBody: document.getElementById('bookingFormBody'),
  inputBookingDate: document.getElementById('inputBookingDate'),
  selectBookingTime: document.getElementById('selectBookingTime'),
  inputDriverVehicle: document.getElementById('inputDriverVehicle'),
  inputChargerCount: document.getElementById('inputChargerCount'),
  occupancyBox: document.getElementById('occupancyBox'),
  occupancyTitle: document.getElementById('occupancyTitle'),
  occupancyDetail: document.getElementById('occupancyDetail'),
  btnConfirmSlot: document.getElementById('btnConfirmSlot'),
  btnChangeSlot: document.getElementById('btnChangeSlot'),
  btnSkipBooking: document.getElementById('btnSkipBooking'),

  confirmedTicketBox: document.getElementById('confirmedTicketBox'),
  ticketBayLabel: document.getElementById('ticketBayLabel'),
  ticketStationName: document.getElementById('ticketStationName'),
  ticketTimeMeta: document.getElementById('ticketTimeMeta'),
  btnModifyBooking: document.getElementById('btnModifyBooking'),
  btnCancelCurrentBooking: document.getElementById('btnCancelCurrentBooking'),

  skippedBookingBox: document.getElementById('skippedBookingBox'),
  btnReopenBooking: document.getElementById('btnReopenBooking'),

  existingBookingsCount: document.getElementById('existingBookingsCount'),
  existingBookingsList: document.getElementById('existingBookingsList')
};

// -------------------------------------------------------------------------
// 2. LEAFLET MAP SETUP (GOOGLE STREETS & SATELLITE)
// -------------------------------------------------------------------------
const map = L.map('navMap', {
  center: [20, 15],
  zoom: 2,
  zoomControl: false,
  worldCopyJump: true
});

const googleStreetsLayer = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  { attribution: 'Map data &copy; Google', maxZoom: 20 }
);

const googleSatelliteLayer = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  { attribution: 'Map data &copy; Google', maxZoom: 20 }
);

googleStreetsLayer.addTo(map);

const routeLayerGroup = L.layerGroup().addTo(map);
const markersLayerGroup = L.layerGroup().addTo(map);

// -------------------------------------------------------------------------
// 3. UTILITIES & PAGE TRANSITION
// -------------------------------------------------------------------------
function showToast(msg) {
  dom.navToast.textContent = msg;
  dom.navToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.navToast.classList.remove('show');
  }, 3000);
}

function goBackWithFade() {
  if (navState.isNavigating) {
    stopNavigation();
  }
  document.body.classList.add('fade-out');
  setTimeout(() => {
    window.location.href = 'route_planner.html';
  }, 400);
}

dom.btnBackToPlanner.addEventListener('click', goBackWithFade);
dom.btnGoPlannerEmpty.addEventListener('click', goBackWithFade);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.body.classList.remove('fade-out');
  }
});

function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(1, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return m + ' min';
  return h + ' hr ' + String(m).padStart(2, '0') + ' min';
}

function formatStepDistance(meters) {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + ' km';
  }
  return Math.max(10, Math.round(meters / 10) * 10) + ' m';
}

function formatEtaClock(minutesFromNow) {
  const eta = new Date(Date.now() + minutesFromNow * 60000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toggleMapLayer() {
  if (navState.mapLayer === 'streets') {
    map.removeLayer(googleStreetsLayer);
    googleSatelliteLayer.addTo(map);
    navState.mapLayer = 'satellite';
    showToast('Switched to Google Satellite');
  } else {
    map.removeLayer(googleSatelliteLayer);
    googleStreetsLayer.addTo(map);
    navState.mapLayer = 'streets';
    showToast('Switched to Google Streets');
  }
}

dom.btnToggleLayer.addEventListener('click', toggleMapLayer);
dom.btnNavLayer.addEventListener('click', toggleMapLayer);
dom.btnZoomIn.addEventListener('click', () => map.zoomIn());
dom.btnZoomOut.addEventListener('click', () => map.zoomOut());

// -------------------------------------------------------------------------
// 4. LOAD ACTIVE TRIP FROM route_planner.html
// -------------------------------------------------------------------------
function loadActiveTrip() {
  const raw = localStorage.getItem('activeTripData');
  if (!raw) {
    dom.noTripCard.style.display = 'block';
    dom.tripContentWrap.style.display = 'none';
    return;
  }

  try {
    const trip = JSON.parse(raw);
    if (!trip || !trip.route || !trip.points || trip.points.length < 2) {
      dom.noTripCard.style.display = 'block';
      dom.tripContentWrap.style.display = 'none';
      return;
    }

    navState.trip = trip;
    renderTripSummary(trip);
    drawTripOnMap(trip);
    initSlotBookingSection(trip);
    fetchTurnByTurnSteps(trip);
  } catch (err) {
    console.error('Error loading trip:', err);
    dom.noTripCard.style.display = 'block';
    dom.tripContentWrap.style.display = 'none';
  }
}

function renderTripSummary(trip) {
  const { route, points } = trip;
  const startPt = points[0];
  const endPt = points[points.length - 1];
  const charger = route.insertedCharger;

  dom.tripRouteTitle.textContent = route.name || 'Selected Route';
  dom.tripTrafficBadge.textContent = route.traffic ? route.traffic.level : 'Live route';
  dom.tripStartLabel.textContent = startPt.query || 'Start point';
  dom.tripEndLabel.textContent = endPt.query || 'Destination';

  if (charger) {
    dom.tripChargerRow.style.display = 'flex';
    dom.tripChargerLabel.textContent = 'Charging Stop: ' + charger.name;
  } else {
    dom.tripChargerRow.style.display = 'none';
  }

  dom.statDistance.textContent =
    route.distanceKm < 10 ? route.distanceKm.toFixed(1) + ' km' : Math.round(route.distanceKm) + ' km';
  dom.statDuration.textContent = formatDurationMinutes(route.totalMinutes || 1);
  dom.statArrival.textContent = route.arrivalPctText || '--';
}

function drawTripOnMap(trip) {
  routeLayerGroup.clearLayers();
  markersLayerGroup.clearLayers();

  const { route, points } = trip;
  const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  L.polyline(latlngs, {
    color: '#153324',
    weight: 9,
    opacity: 0.7,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(routeLayerGroup);

  const mainLine = L.polyline(latlngs, {
    color: '#4285f4',
    weight: 5,
    opacity: 0.98,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(routeLayerGroup);

  const startPt = points[0];
  const endPt = points[points.length - 1];

  const startIcon = L.divIcon({
    className: '',
    html: '<div class="urf-marker-start"><svg width="14" height="14" viewBox="0 0 24 24" fill="#c8f169"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const endIcon = L.divIcon({
    className: '',
    html: '<div class="urf-marker-end"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  L.marker([startPt.lat, startPt.lon], { icon: startIcon }).addTo(markersLayerGroup);
  L.marker([endPt.lat, endPt.lon], { icon: endIcon }).addTo(markersLayerGroup);

  if (route.insertedCharger) {
    const c = route.insertedCharger;
    const chargerIcon = L.divIcon({
      className: '',
      html: '<div class="urf-marker-charger"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([c.lat, c.lon], { icon: chargerIcon })
      .bindTooltip(c.name, { direction: 'top' })
      .addTo(markersLayerGroup);
  }

  map.fitBounds(mainLine.getBounds(), { padding: [60, 60] });
}

// -------------------------------------------------------------------------
// 5. TURN-BY-TURN STEPS FROM OSRM (steps=true)
// -------------------------------------------------------------------------
function buildInstructionText(step) {
  const m = step.maneuver || {};
  const type = m.type || 'continue';
  const mod = m.modifier || '';
  const road = step.name ? ' onto ' + step.name : '';

  if (type === 'depart') return 'Head ' + (mod || 'forward') + road;
  if (type === 'arrive') return 'Arrive at your destination';
  if (type === 'roundabout' || type === 'rotary') {
    const exit = m.exit ? 'exit ' + m.exit : 'the exit';
    return 'At the roundabout, take ' + exit + road;
  }
  if (type === 'fork') return 'Keep ' + (mod || 'straight') + ' at the fork' + road;
  if (type === 'merge') return 'Merge ' + (mod || '') + road;
  if (type === 'turn' || type === 'end of road' || type === 'on ramp' || type === 'off ramp') {
    const dir = mod ? mod.replace('-', ' ') : 'ahead';
    return 'Turn ' + dir + road;
  }
  if (type === 'new name') return 'Continue' + road;
  return 'Continue ' + (mod ? mod + ' ' : 'straight') + road;
}

function getManeuverArrowSvg(modifier, type) {
  if (type === 'arrive') {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
  }
  if (modifier && modifier.includes('left')) {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>';
  }
  if (modifier && modifier.includes('right')) {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>';
  }
  if (modifier === 'uturn') {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M4 9h10a5 5 0 0 1 0 10H11"></path></svg>';
  }
  return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
}

async function fetchTurnByTurnSteps(trip) {
  const waypoints = [...trip.points];
  if (trip.route.insertedCharger) {
    waypoints.splice(waypoints.length - 1, 0, {
      lat: trip.route.insertedCharger.lat,
      lon: trip.route.insertedCharger.lon
    });
  }

  const coordStr = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM step fetch failed');
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0] && data.routes[0].legs) {
      const allSteps = [];
      data.routes[0].legs.forEach((leg) => {
        if (Array.isArray(leg.steps)) {
          leg.steps.forEach((s) => {
            allSteps.push({
              instruction: buildInstructionText(s),
              distance: s.distance || 0,
              duration: s.duration || 0,
              modifier: s.maneuver ? s.maneuver.modifier : '',
              type: s.maneuver ? s.maneuver.type : '',
              location: s.maneuver ? s.maneuver.location : null
            });
          });
        }
      });
      navState.steps = allSteps;
      navState.currentStepIndex = 0;
      updateNavigationHud();
    }
  } catch {
    navState.steps = [
      {
        instruction: 'Follow highlighted route to ' + (trip.points[trip.points.length - 1].query || 'destination'),
        distance: trip.route.distanceKm * 1000,
        duration: (trip.route.totalMinutes || 10) * 60,
        modifier: 'straight',
        type: 'depart',
        location: [trip.points[0].lon, trip.points[0].lat]
      }
    ];
    updateNavigationHud();
  }
}

// -------------------------------------------------------------------------
// 6. FULL-SCREEN GOOGLE MAPS-STYLE NAVIGATION (USER-INITIATED ONLY)
// -------------------------------------------------------------------------
function updateNavigationHud() {
  if (!navState.trip) return;

  const steps = navState.steps;
  const idx = Math.min(Math.max(0, navState.currentStepIndex), Math.max(0, steps.length - 1));
  const current = steps[idx];
  const next = steps[idx + 1];

  if (current) {
    dom.navTurnIcon.innerHTML = getManeuverArrowSvg(current.modifier, current.type);
    dom.navStepDistance.textContent =
      current.type === 'arrive' ? 'Destination' : formatStepDistance(current.distance);
    dom.navStepInstruction.textContent = current.instruction;
  }

  dom.navNextStepText.textContent = next ? next.instruction : 'Arrive at destination';

  // Remaining distance & time from current step onward
  let remMeters = 0;
  let remSeconds = 0;
  for (let i = idx; i < steps.length; i++) {
    remMeters += steps[i].distance || 0;
    remSeconds += steps[i].duration || 0;
  }

  const remKm = remMeters > 0 ? remMeters / 1000 : navState.trip.route.distanceKm;
  const remMins = remSeconds > 0 ? remSeconds / 60 : navState.trip.route.totalMinutes;

  dom.navEtaRemaining.textContent = formatDurationMinutes(remMins);
  dom.navMetaSub.textContent =
    remKm.toFixed(1) +
    ' km \u00b7 ETA ' +
    formatEtaClock(remMins) +
    ' \u00b7 ' +
    (navState.trip.route.arrivalPctText || '--');
}

function startNavigation() {
  if (!navState.trip) return;

  navState.isNavigating = true;
  navState.autoFollowGps = true;
  dom.navMapPanel.classList.add('nav-active');
  dom.navHud.setAttribute('aria-hidden', 'false');

  // Request browser Fullscreen API on the map panel
  const el = dom.navMapPanel;
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }

  setTimeout(() => {
    map.invalidateSize();
    const startPt = navState.trip.points[0];
    map.setView([startPt.lat, startPt.lon], 16);
  }, 200);

  updateNavigationHud();
  beginLiveGpsTracking();
  showToast('Live navigation started');
}

function stopNavigation() {
  navState.isNavigating = false;
  dom.navMapPanel.classList.remove('nav-active');
  dom.navHud.setAttribute('aria-hidden', 'true');

  if (navState.gpsWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(navState.gpsWatchId);
    navState.gpsWatchId = null;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }

  setTimeout(() => {
    map.invalidateSize();
    if (navState.trip) {
      drawTripOnMap(navState.trip);
    }
  }, 200);
}

function beginLiveGpsTracking() {
  if (!navigator.geolocation) {
    showToast('GPS unavailable; use step arrows to preview turns.');
    return;
  }

  const puckIcon = L.divIcon({
    className: '',
    html: '<div class="nav-gps-puck"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  navState.gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed } = pos.coords;
      const kmh = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0;
      dom.navSpeedVal.textContent = String(kmh);

      if (!navState.userGpsMarker) {
        navState.userGpsMarker = L.marker([latitude, longitude], { icon: puckIcon }).addTo(map);
      } else {
        navState.userGpsMarker.setLatLng([latitude, longitude]);
      }

      if (navState.autoFollowGps) {
        map.panTo([latitude, longitude], { animate: true });
      }

      // Advance turn-by-turn step if user comes within 45m of the next maneuver
      const nextStep = navState.steps[navState.currentStepIndex + 1];
      if (nextStep && nextStep.location) {
        const distToNext = haversineMeters(
          latitude,
          longitude,
          nextStep.location[1],
          nextStep.location[0]
        );
        if (distToNext < 45) {
          navState.currentStepIndex++;
          updateNavigationHud();
        }
      }
    },
    () => {
      showToast('Waiting for GPS signal. Use arrow buttons to step through turns.');
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

map.on('dragstart', () => {
  if (navState.isNavigating) {
    navState.autoFollowGps = false;
  }
});

dom.btnStartNav.addEventListener('click', startNavigation);
dom.btnExitNavigation.addEventListener('click', stopNavigation);

dom.btnNavRecenter.addEventListener('click', () => {
  navState.autoFollowGps = true;
  if (navState.userGpsMarker) {
    map.setView(navState.userGpsMarker.getLatLng(), 17);
  } else if (navState.trip) {
    const step = navState.steps[navState.currentStepIndex];
    if (step && step.location) {
      map.setView([step.location[1], step.location[0]], 16);
    }
  }
  showToast('Recentered map');
});

dom.btnPrevStep.addEventListener('click', () => {
  if (navState.currentStepIndex > 0) {
    navState.currentStepIndex--;
    updateNavigationHud();
    const s = navState.steps[navState.currentStepIndex];
    if (s && s.location) map.panTo([s.location[1], s.location[0]]);
  }
});

dom.btnNextStep.addEventListener('click', () => {
  if (navState.currentStepIndex < navState.steps.length - 1) {
    navState.currentStepIndex++;
    updateNavigationHud();
    const s = navState.steps[navState.currentStepIndex];
    if (s && s.location) map.panTo([s.location[1], s.location[0]]);
  }
});

// Keep map sized properly if user presses Esc to leave fullscreen
document.addEventListener('fullscreenchange', () => {
  setTimeout(() => map.invalidateSize(), 150);
});

// -------------------------------------------------------------------------
// 7. PRIOR CHARGING SLOT BOOKING & REAL CONFLICT DETECTION
// -------------------------------------------------------------------------
function readAllBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllBookings(list) {
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(list));
}

function getStationName() {
  if (navState.trip && navState.trip.route && navState.trip.route.insertedCharger) {
    return navState.trip.route.insertedCharger.name;
  }
  return dom.inputStationName.value.trim();
}

function getStationKey(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function populateTimeSlots() {
  dom.selectBookingTime.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const nextH = m === 30 ? (h + 1) % 24 : h;
      const nextM = m === 30 ? '00' : '30';
      const label = `${hh}:${mm} - ${String(nextH).padStart(2, '0')}:${nextM}`;
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      dom.selectBookingTime.appendChild(opt);
    }
  }

  // Default to the next upcoming 30-min slot
  const now = new Date();
  let nextHour = now.getHours();
  let nextMin = now.getMinutes() < 30 ? 30 : 0;
  if (nextMin === 0) nextHour = (nextHour + 1) % 24;
  const targetPrefix = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
  const match = Array.from(dom.selectBookingTime.options).find((o) =>
    o.value.startsWith(targetPrefix)
  );
  if (match) dom.selectBookingTime.value = match.value;
}

function initSlotBookingSection(trip) {
  const todayStr = new Date().toISOString().split('T')[0];
  dom.inputBookingDate.min = todayStr;
  dom.inputBookingDate.value = todayStr;
  populateTimeSlots();

  if (trip.vehicle && trip.vehicle.name) {
    dom.inputDriverVehicle.value = trip.vehicle.name;
  }

  const charger = trip.route.insertedCharger;
  if (charger) {
    const parsedCapacity = parseInt(charger.chargers, 10);
    const totalChargers = !isNaN(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : 2;

    dom.slotStationName.textContent = charger.name;
    dom.slotStationMeta.textContent =
      totalChargers +
      ' charger(s) \u00b7 ' +
      (charger.speed || '50 kW') +
      ' \u00b7 Est. ' +
      (charger.chargeMinutes || 25) +
      ' min charge';
    dom.inputChargerCount.value = totalChargers;
    dom.customStationGroup.style.display = 'none';
  } else {
    dom.slotStationName.textContent = 'No charging stop required on this route';
    dom.slotStationMeta.textContent =
      'You can still enter a station name below to book a prior slot, or continue without booking.';
    dom.inputChargerCount.value = 2;
    dom.customStationGroup.style.display = 'flex';
  }

  checkSlotAvailability();
  renderStationBookingsList();
}

function checkSlotAvailability() {
  const stationName = getStationName();
  const dateVal = dom.inputBookingDate.value;
  const timeSlot = dom.selectBookingTime.value;
  const totalChargers = Math.max(1, parseInt(dom.inputChargerCount.value, 10) || 1);

  if (!stationName) {
    dom.occupancyBox.className = 'occupancy-box';
    dom.occupancyTitle.textContent = 'Enter a charging station name to check slot availability.';
    dom.occupancyDetail.textContent = 'Or choose "Continue without booking" below.';
    dom.btnConfirmSlot.disabled = true;
    dom.btnConfirmSlot.textContent = 'Book Slot';
    dom.btnChangeSlot.style.display = 'none';
    return;
  }

  const stationKey = getStationKey(stationName);
  const all = readAllBookings();

  // Count how many people have already booked this exact station, date & time slot
  const sameSlotBookings = all.filter(
    (b) => b.stationKey === stationKey && b.date === dateVal && b.timeSlot === timeSlot
  );

  const bookedCount = sameSlotBookings.length;
  const remainingSpots = Math.max(0, totalChargers - bookedCount);

  if (bookedCount >= totalChargers) {
    // FULL: Block booking for this time slot
    dom.occupancyBox.className = 'occupancy-box full';
    dom.occupancyTitle.textContent =
      'Slot unavailable — ' + bookedCount + (bookedCount === 1 ? ' person has' : ' people have') + ' already booked all ' + totalChargers + ' charger(s).';
    dom.occupancyDetail.textContent =
      'This time slot (' + timeSlot + ') is full and cannot be booked. Please choose another time slot or continue without booking.';
    dom.btnConfirmSlot.disabled = true;
    dom.btnConfirmSlot.textContent = 'Time Slot Full';
    dom.btnChangeSlot.style.display = 'inline-flex';
  } else if (bookedCount > 0) {
    // PARTIALLY BOOKED: Warn user with exact count, let them continue, change slot, or skip
    dom.occupancyBox.className = 'occupancy-box partial';
    dom.occupancyTitle.textContent =
      bookedCount + (bookedCount === 1 ? ' person has' : ' people have') + ' already booked ' + timeSlot + '.';
    dom.occupancyDetail.textContent =
      remainingSpots + ' of ' + totalChargers + ' charger(s) still open. You can continue and book this slot, change to a quieter time, or skip booking.';
    dom.btnConfirmSlot.disabled = false;
    dom.btnConfirmSlot.textContent = 'Continue & Book This Slot';
    dom.btnChangeSlot.style.display = 'inline-flex';
  } else {
    // COMPLETELY FREE
    dom.occupancyBox.className = 'occupancy-box available';
    dom.occupancyTitle.textContent = 'Slot available (' + timeSlot + ')';
    dom.occupancyDetail.textContent =
      '0 of ' + totalChargers + ' chargers booked for this time. Ready to reserve.';
    dom.btnConfirmSlot.disabled = false;
    dom.btnConfirmSlot.textContent = 'Book Slot';
    dom.btnChangeSlot.style.display = 'none';
  }

  renderStationBookingsList();
}

function renderStationBookingsList() {
  const stationName = getStationName();
  const dateVal = dom.inputBookingDate.value;
  const stationKey = getStationKey(stationName);

  const list = readAllBookings().filter(
    (b) => (!stationKey || b.stationKey === stationKey) && b.date === dateVal
  );

  dom.existingBookingsCount.textContent = String(list.length);
  dom.existingBookingsList.innerHTML = '';

  if (list.length === 0) {
    dom.existingBookingsList.innerHTML =
      '<div class="existing-empty">No slots booked yet for this station on ' + (dateVal || 'selected date') + '.</div>';
    return;
  }

  list.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'existing-item';
    row.innerHTML = `
      <div>
        <div class="existing-item-main">${b.timeSlot} &middot; Charger #${b.bayNumber}</div>
        <div class="existing-item-sub">${b.vehicleName} &middot; ${b.stationName}</div>
      </div>
      <button type="button" class="existing-remove-btn" data-id="${b.id}">Cancel</button>
    `;

    row.querySelector('.existing-remove-btn').addEventListener('click', () => {
      cancelBookingById(b.id);
    });

    dom.existingBookingsList.appendChild(row);
  });
}

function confirmSlotBooking() {
  const stationName = getStationName();
  const dateVal = dom.inputBookingDate.value;
  const timeSlot = dom.selectBookingTime.value;
  const vehicleName = dom.inputDriverVehicle.value.trim() || 'EV Driver';
  const totalChargers = Math.max(1, parseInt(dom.inputChargerCount.value, 10) || 1);

  if (!stationName || !dateVal || !timeSlot) {
    showToast('Please enter station, date, and time slot.');
    return;
  }

  const stationKey = getStationKey(stationName);
  const all = readAllBookings();
  const sameSlot = all.filter(
    (b) => b.stationKey === stationKey && b.date === dateVal && b.timeSlot === timeSlot
  );

  // Double-check live occupancy right before saving
  if (sameSlot.length >= totalChargers) {
    checkSlotAvailability();
    showToast('Cannot book: all chargers are already reserved at this time.');
    return;
  }

  const newBooking = {
    id: 'bk-' + Date.now(),
    stationKey,
    stationName,
    date: dateVal,
    timeSlot,
    vehicleName,
    bayNumber: sameSlot.length + 1,
    createdAt: new Date().toISOString()
  };

  all.push(newBooking);
  saveAllBookings(all);

  navState.activeBookingId = newBooking.id;
  navState.skippedBooking = false;

  dom.bookingStateBadge.textContent = 'Booked';
  dom.bookingStateBadge.className = 'pill-badge confirmed';
  dom.bookingFormBody.style.display = 'none';
  dom.skippedBookingBox.style.display = 'none';
  dom.confirmedTicketBox.style.display = 'block';

  dom.ticketBayLabel.textContent = 'Charger #' + newBooking.bayNumber;
  dom.ticketStationName.textContent = newBooking.stationName;
  dom.ticketTimeMeta.textContent =
    newBooking.date + ' \u00b7 ' + newBooking.timeSlot + ' \u00b7 ' + newBooking.vehicleName;

  renderStationBookingsList();
  showToast('Charging slot booked for ' + newBooking.timeSlot);
}

function cancelBookingById(id) {
  const updated = readAllBookings().filter((b) => b.id !== id);
  saveAllBookings(updated);

  if (navState.activeBookingId === id) {
    navState.activeBookingId = null;
    dom.confirmedTicketBox.style.display = 'none';
    dom.bookingFormBody.style.display = 'block';
    dom.bookingStateBadge.textContent = 'Not booked';
    dom.bookingStateBadge.className = 'pill-badge neutral';
  }

  checkSlotAvailability();
  showToast('Booking cancelled');
}

// Event Listeners for Booking Controls
dom.inputStationName.addEventListener('input', checkSlotAvailability);
dom.inputBookingDate.addEventListener('change', checkSlotAvailability);
dom.selectBookingTime.addEventListener('change', checkSlotAvailability);
dom.inputChargerCount.addEventListener('input', checkSlotAvailability);

dom.btnConfirmSlot.addEventListener('click', confirmSlotBooking);

dom.btnChangeSlot.addEventListener('click', () => {
  dom.selectBookingTime.focus();
  showToast('Choose another available time slot');
});

dom.btnSkipBooking.addEventListener('click', () => {
  navState.skippedBooking = true;
  dom.bookingFormBody.style.display = 'none';
  dom.confirmedTicketBox.style.display = 'none';
  dom.skippedBookingBox.style.display = 'block';
  dom.bookingStateBadge.textContent = 'Skipped';
  dom.bookingStateBadge.className = 'pill-badge neutral';
  showToast('Skipped charging slot booking');
});

dom.btnReopenBooking.addEventListener('click', () => {
  navState.skippedBooking = false;
  dom.skippedBookingBox.style.display = 'none';
  dom.bookingFormBody.style.display = 'block';
  dom.bookingStateBadge.textContent = 'Not booked';
  dom.bookingStateBadge.className = 'pill-badge neutral';
  checkSlotAvailability();
});

dom.btnModifyBooking.addEventListener('click', () => {
  // Keep previous booking saved unless they cancel, or let them check/book a different slot
  dom.confirmedTicketBox.style.display = 'none';
  dom.bookingFormBody.style.display = 'block';
  checkSlotAvailability();
  dom.selectBookingTime.focus();
});

dom.btnCancelCurrentBooking.addEventListener('click', () => {
  if (navState.activeBookingId) {
    cancelBookingById(navState.activeBookingId);
  }
});

// Listen for real-time booking updates from other browser tabs
window.addEventListener('storage', (e) => {
  if (e.key === BOOKINGS_STORAGE_KEY) {
    checkSlotAvailability();
  }
});

// -------------------------------------------------------------------------
// 8. INITIALIZE PAGE
// -------------------------------------------------------------------------
loadActiveTrip();