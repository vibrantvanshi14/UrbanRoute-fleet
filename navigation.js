/* =========================================================================
   URBAN ROUTE FLEET — GOOGLE MAPS-STYLE ARROW TRACKING, RED TRAFFIC ALERTS,
   VERIFIED-ONLY CHARGING STATIONS, IN-APP PAYMENT & FULL-SCREEN KIOSK PRINTER
   ========================================================================= */

const BOOKINGS_STORAGE_KEY = 'urfSlotBookings';
const OFF_ROUTE_THRESHOLD_METERS = 65;
const KEEP_ROUTE_COOLDOWN_MS = 25000;
const SLOT_BOOKING_FEE_INR = 50;
const URF_UPI_ID = 'urbanroutefleet@ibl';
const URF_UPI_NAME = 'Urban Route Fleet';
const UPI_QR_VALIDITY_SECONDS = 300; // 5 minutes
const API_BASE_URL = window.location.port === '3000' ? '' : 'http://localhost:3000';
const PAYMENT_INIT_API_URL = `${API_BASE_URL}/api/payment-init`;
const PAYMENT_STATUS_API_URL = `${API_BASE_URL}/api/payment-status`;
const PAYMENT_POLL_INTERVAL_MS = 2500;
const RAZORPAY_KEY_ID = '';

const navState = {
  trip: null,
  mapLayer: 'streets',
  isNavigating: false,
  steps: [],
  currentStepIndex: 0,
  gpsWatchId: null,
  userGpsMarker: null,
  currentArrowPos: null,
  currentHeading: 0,
  arrowAnimFrame: null,
  simTimer: null,
  simCoordIndex: 0,
  autoFollowGps: true,
  activeBookingId: null,
  skippedBooking: false,
  verifiedStations: [],
  selectedStation: null,
  trafficSegments: [],
  lastGpsCoords: null,
  isOffRouteAlertOpen: false,
  ignoreOffRouteUntil: 0,
  isTrafficAlertOpen: false,
  ignoreTrafficUntil: 0,
  isReplanning: false,
  pendingPaymentResolve: null,
  pendingPaymentReject: null
};

let toastTimer = null;
let isKioskPrinting = false;

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  offRouteAlert: document.getElementById('offRouteAlert'),
  offRouteSub: document.getElementById('offRouteSub'),
  btnReplanRoute: document.getElementById('btnReplanRoute'),
  btnKeepPrevRoute: document.getElementById('btnKeepPrevRoute'),

  trafficAheadAlert: document.getElementById('trafficAheadAlert'),
  trafficAlertSub: document.getElementById('trafficAlertSub'),
  btnChangeTrafficRoute: document.getElementById('btnChangeTrafficRoute'),
  btnContinueTrafficRoute: document.getElementById('btnContinueTrafficRoute'),

  btnNavRecenter: document.getElementById('btnNavRecenter'),
  btnSimulateDrive: document.getElementById('btnSimulateDrive'),
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
  tripChargingDonePill: document.getElementById('tripChargingDonePill'),
  tripEndLabel: document.getElementById('tripEndLabel'),
  statDistance: document.getElementById('statDistance'),
  statDuration: document.getElementById('statDuration'),
  statArrival: document.getElementById('statArrival'),
  btnStartNav: document.getElementById('btnStartNav'),

  bookingStateBadge: document.getElementById('bookingStateBadge'),
  selectVerifiedStation: document.getElementById('selectVerifiedStation'),
  slotStationName: document.getElementById('slotStationName'),
  slotStationMeta: document.getElementById('slotStationMeta'),
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
  dockedTicketSlot: document.getElementById('dockedTicketSlot'),
  btnReprintTicket: document.getElementById('btnReprintTicket'),
  ticketSessionStatus: document.getElementById('ticketSessionStatus'),
  ticketBayLabel: document.getElementById('ticketBayLabel'),
  ticketStationName: document.getElementById('ticketStationName'),
  ticketTimeMeta: document.getElementById('ticketTimeMeta'),
  ticketVehicleName: document.getElementById('ticketVehicleName'),
  ticketReceiptId: document.getElementById('ticketReceiptId'),
  ticketAmountLabel: document.getElementById('ticketAmountLabel'),
  ticketUnlockPin: document.getElementById('ticketUnlockPin'),
  btnToggleSession: document.getElementById('btnToggleSession'),
  btnModifyBooking: document.getElementById('btnModifyBooking'),
  btnCancelCurrentBooking: document.getElementById('btnCancelCurrentBooking'),

  kioskOverlay: document.getElementById('kioskOverlay'),
  kioskPrinterBody: document.getElementById('kioskPrinterBody'),
  kioskPrinterLed: document.getElementById('kioskPrinterLed'),
  kioskPinkBtn: document.getElementById('kioskPinkBtn'),
  kioskTapHint: document.getElementById('kioskTapHint'),
  kioskPaperChute: document.getElementById('kioskPaperChute'),
  kioskStarterStub: document.getElementById('kioskStarterStub'),
  kioskTicketAssembly: document.getElementById('kioskTicketAssembly'),
  kioskTicketContent: document.getElementById('kioskTicketContent'),
  kioskHandBack: document.getElementById('kioskHandBack'),
  kioskHandFront: document.getElementById('kioskHandFront'),
  ovTicketBay: document.getElementById('ovTicketBay'),
  ovTicketStation: document.getElementById('ovTicketStation'),
  ovTicketTime: document.getElementById('ovTicketTime'),
  ovTicketVehicle: document.getElementById('ovTicketVehicle'),
  ovTicketReceipt: document.getElementById('ovTicketReceipt'),
  ovTicketAmount: document.getElementById('ovTicketAmount'),
  ovTicketPin: document.getElementById('ovTicketPin'),

  skippedBookingBox: document.getElementById('skippedBookingBox'),
  btnReopenBooking: document.getElementById('btnReopenBooking'),

  existingBookingsCount: document.getElementById('existingBookingsCount'),
  existingBookingsList: document.getElementById('existingBookingsList'),

  paymentModalBackdrop: document.getElementById('paymentModalBackdrop'),
  btnClosePaymentModal: document.getElementById('btnClosePaymentModal'),
  payModalStation: document.getElementById('payModalStation'),
  payModalSlot: document.getElementById('payModalSlot'),
  payQrTimer: document.getElementById('payQrTimer'),
  upiQrFrame: document.getElementById('upiQrFrame'),
  upiQrCanvas: document.getElementById('upiQrCanvas'),
  btnRegenerateQr: document.getElementById('btnRegenerateQr'),
  upiIdDisplay: document.getElementById('upiIdDisplay'),
  btnCopyUpiId: document.getElementById('btnCopyUpiId'),
  upiLinkGpay: document.getElementById('upiLinkGpay'),
  upiLinkPhonePe: document.getElementById('upiLinkPhonePe'),
  upiLinkPaytm: document.getElementById('upiLinkPaytm'),
  upiDeepLink: document.getElementById('upiDeepLink'),
  upiAppAlert: document.getElementById('upiAppAlert'),
  upiLiveStatus: document.getElementById('upiLiveStatus'),
  upiLiveStatusText: document.getElementById('upiLiveStatusText'),
  btnFailInAppPayment: document.getElementById('btnFailInAppPayment'),
  paymentStatusBackdrop: document.getElementById('paymentStatusBackdrop'),
  payStatusIcon: document.getElementById('payStatusIcon'),
  payStatusTitle: document.getElementById('payStatusTitle'),
  payStatusMsg: document.getElementById('payStatusMsg'),
  btnPaymentStatusOk: document.getElementById('btnPaymentStatusOk')
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
const trafficLayerGroup = L.layerGroup().addTo(map);
const markersLayerGroup = L.layerGroup().addTo(map);

// -------------------------------------------------------------------------
// 3. SOUND EFFECTS
// -------------------------------------------------------------------------
function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!getAudioContext.ctx) {
    getAudioContext.ctx = new AudioCtx();
  }
  if (getAudioContext.ctx.state === 'suspended') {
    getAudioContext.ctx.resume().catch(() => {});
  }
  return getAudioContext.ctx;
}

function playTapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {}
}

function playTicketPrintSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const totalPulses = 10;
    const stepInterval = 0.19;
    for (let i = 0; i < totalPulses; i++) {
      const t = i * stepInterval;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(175 + (i % 4) * 32, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.045, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.085);
    }

    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(587.33, ctx.currentTime + 1.95);
    chime.frequency.setValueAtTime(880, ctx.currentTime + 2.08);
    chimeGain.gain.setValueAtTime(0.12, ctx.currentTime + 1.95);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.35);
    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(ctx.currentTime + 1.95);
    chime.stop(ctx.currentTime + 2.38);
  } catch {}
}

function playAlertChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(520, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch {}
}

// -------------------------------------------------------------------------
// FULL-SCREEN KIOSK PRINTER + FLY-TO-SIDEBAR DOCK ANIMATION
// -------------------------------------------------------------------------
async function triggerTicketPrintAnimation() {
  if (isKioskPrinting) return;
  isKioskPrinting = true;

  if (dom.dockedTicketSlot) {
    dom.dockedTicketSlot.classList.add('awaiting-dock');
    dom.dockedTicketSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  dom.kioskOverlay.className = 'kiosk-overlay active';
  dom.kioskOverlay.setAttribute('aria-hidden', 'false');
  dom.kioskPrinterBody.className = 'printer-body';
  dom.kioskPrinterLed.classList.remove('ready');
  dom.kioskPinkBtn.classList.remove('pressed');
  dom.kioskTapHint.classList.remove('hidden');
  dom.kioskPaperChute.classList.remove('released');
  dom.kioskStarterStub.className = 'starter-stub';
  dom.kioskTicketAssembly.className = 'ticket-assembly';
  dom.kioskTicketAssembly.style.transition = 'none';
  dom.kioskTicketAssembly.style.transform = 'translate(-50%, -105%)';
  dom.kioskTicketContent.classList.remove('sharp');
  dom.kioskHandBack.classList.remove('grab');
  dom.kioskHandFront.classList.remove('grab');

  await waitMs(120);
  dom.kioskPrinterBody.classList.add('visible');

  await waitMs(420);
  dom.kioskPrinterLed.classList.add('ready');
  dom.kioskStarterStub.classList.add('peek');

  await waitMs(520);
  playTapSound();
  dom.kioskPinkBtn.classList.add('pressed');
  dom.kioskTapHint.classList.add('hidden');
  await waitMs(160);
  dom.kioskPinkBtn.classList.remove('pressed');

  dom.kioskStarterStub.classList.remove('peek');
  dom.kioskStarterStub.classList.add('retract');
  await waitMs(380);

  dom.kioskPrinterBody.classList.add('printing');
  playTicketPrintSound();

  const feedSteps = [
    { pct: -82, dur: 320, pause: 55 },
    { pct: -60, dur: 340, pause: 65 },
    { pct: -35, dur: 380, pause: 65 },
    { pct: -12, dur: 360, pause: 55 },
    { pct: 3,   dur: 320, pause: 0  }
  ];

  for (const step of feedSteps) {
    dom.kioskTicketAssembly.style.transition = `transform ${step.dur}ms cubic-bezier(0.25, 0.85, 0.35, 1)`;
    dom.kioskTicketAssembly.style.transform = `translate(-50%, ${step.pct}%)`;
    await waitMs(step.dur + step.pause);
  }

  dom.kioskPrinterBody.classList.remove('printing');
  dom.kioskTicketContent.classList.add('sharp');

  await waitMs(120);
  dom.kioskHandBack.classList.add('grab');
  dom.kioskHandFront.classList.add('grab');

  await waitMs(460);
  dom.kioskPaperChute.classList.add('released');
  dom.kioskTicketAssembly.style.transition = '';
  dom.kioskTicketAssembly.style.transform = '';
  dom.kioskTicketAssembly.classList.add('detached');
  dom.kioskPrinterBody.classList.add('recede');

  await waitMs(950);

  dom.kioskHandBack.classList.remove('grab');
  dom.kioskHandFront.classList.remove('grab');
  dom.kioskOverlay.classList.add('fading-bg');

  if (dom.dockedTicketSlot) {
    const startRect = dom.kioskTicketAssembly.getBoundingClientRect();
    const endRect = dom.dockedTicketSlot.getBoundingClientRect();

    const dx = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const dy = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);
    const scaleX = endRect.width / (dom.kioskTicketAssembly.offsetWidth || 248);

    dom.kioskTicketAssembly.style.transition = 'transform 0.72s cubic-bezier(0.22, 1, 0.36, 1)';
    dom.kioskTicketAssembly.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-44px + ${dy}px)) rotate(0deg) scale(${scaleX})`;

    await waitMs(740);
    dom.dockedTicketSlot.classList.remove('awaiting-dock');
  }

  dom.kioskOverlay.className = 'kiosk-overlay';
  dom.kioskOverlay.setAttribute('aria-hidden', 'true');
  isKioskPrinting = false;
}

// -------------------------------------------------------------------------
// 4. UTILITIES & GEOMETRY MATH
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

function computeBearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function pointToSegmentMeters(pLat, pLon, aLat, aLon, bLat, bLon) {
  const latScale = 111320;
  const lonScale = 111320 * Math.cos((pLat * Math.PI) / 180);

  const px = pLon * lonScale;
  const py = pLat * latScale;
  const ax = aLon * lonScale;
  const ay = aLat * latScale;
  const bx = bLon * lonScale;
  const by = bLat * latScale;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function getDistanceFromRouteMeters(lat, lon, geometryCoords) {
  if (!Array.isArray(geometryCoords) || geometryCoords.length === 0) return 0;
  if (geometryCoords.length === 1) {
    return haversineMeters(lat, lon, geometryCoords[0][1], geometryCoords[0][0]);
  }

  let minMeters = Infinity;
  for (let i = 1; i < geometryCoords.length; i++) {
    const [lon1, lat1] = geometryCoords[i - 1];
    const [lon2, lat2] = geometryCoords[i];
    const d = pointToSegmentMeters(lat, lon, lat1, lon1, lat2, lon2);
    if (d < minMeters) minMeters = d;
  }
  return minMeters;
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
// 5. LOAD ACTIVE TRIP, DRAW RED TRAFFIC SEGMENTS & MARKERS
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
  dom.tripTrafficBadge.textContent = route.traffic ? route.traffic.level : 'Traffic active';
  dom.tripStartLabel.textContent = startPt.query || 'Start point';
  dom.tripEndLabel.textContent = endPt.query || 'Destination';

  const chargingDone = isChargingCompletedForTrip();
  if (charger) {
    dom.tripChargerRow.style.display = 'flex';
    dom.tripChargerLabel.textContent = chargingDone
      ? 'Charging Done at ' + charger.name
      : 'Charging Stop: ' + charger.name;
    if (dom.tripChargingDonePill) {
      dom.tripChargingDonePill.style.display = chargingDone ? 'inline-flex' : 'none';
    }
  } else if (chargingDone) {
    dom.tripChargerRow.style.display = 'flex';
    dom.tripChargerLabel.textContent = 'EV Charging Session Completed';
    if (dom.tripChargingDonePill) {
      dom.tripChargingDonePill.style.display = 'inline-flex';
    }
  } else {
    dom.tripChargerRow.style.display = 'none';
    if (dom.tripChargingDonePill) {
      dom.tripChargingDonePill.style.display = 'none';
    }
  }

  dom.statDistance.textContent =
    route.distanceKm < 10 ? route.distanceKm.toFixed(1) + ' km' : Math.round(route.distanceKm) + ' km';
  dom.statDuration.textContent = formatDurationMinutes(route.totalMinutes || 1);
  dom.statArrival.textContent = route.arrivalPctText || '--';
}

function buildRedTrafficSegments(latlngs) {
  navState.trafficSegments = [];
  if (!Array.isArray(latlngs) || latlngs.length < 6) return;

  const total = latlngs.length;
  const zones = [
    [Math.floor(total * 0.25), Math.floor(total * 0.42)],
    [Math.floor(total * 0.62), Math.floor(total * 0.78)]
  ];

  zones.forEach(([startIdx, endIdx], idx) => {
    if (endIdx > startIdx + 1) {
      const slice = latlngs.slice(startIdx, endIdx + 1);
      navState.trafficSegments.push({
        id: 'traffic-' + idx,
        latlngs: slice,
        delayMins: idx === 0 ? 6 : 8
      });
    }
  });
}

function drawTripOnMap(trip) {
  routeLayerGroup.clearLayers();
  trafficLayerGroup.clearLayers();
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

  if (route.trafficCleared) {
    navState.trafficSegments = [];
  } else {
    buildRedTrafficSegments(latlngs);
  }
  navState.trafficSegments.forEach((seg) => {
    L.polyline(seg.latlngs, {
      color: '#ea4335',
      weight: 6.5,
      opacity: 0.96,
      lineCap: 'round',
      lineJoin: 'round'
    })
      .bindTooltip(`Heavy traffic (+${seg.delayMins} min delay)`, { sticky: true })
      .addTo(trafficLayerGroup);
  });

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
// 6. TURN-BY-TURN STEPS FROM OSRM
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
// 7. GOOGLE MAPS-STYLE ARROW TRACKING, WRONG-ROUTE & TRAFFIC-AHEAD ALERTS
// -------------------------------------------------------------------------
function createNavigationArrowIcon(headingDeg) {
  return L.divIcon({
    className: '',
    html: `
      <div class="nav-arrow-wrapper">
        <div class="nav-arrow-puck" style="transform: rotate(${Math.round(headingDeg)}deg);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a73e8">
            <polygon points="12 2 20 20 12 16 4 20 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function smoothlyMoveNavigationArrow(targetLat, targetLon, targetHeading) {
  if (!navState.userGpsMarker || !navState.currentArrowPos) {
    navState.currentArrowPos = { lat: targetLat, lon: targetLon };
    navState.currentHeading = targetHeading;
    navState.userGpsMarker = L.marker([targetLat, targetLon], {
      icon: createNavigationArrowIcon(targetHeading),
      zIndexOffset: 1000
    }).addTo(map);
    if (navState.autoFollowGps) {
      map.panTo([targetLat, targetLon], { animate: true });
    }
    return;
  }

  if (navState.arrowAnimFrame) {
    cancelAnimationFrame(navState.arrowAnimFrame);
  }

  const startLat = navState.currentArrowPos.lat;
  const startLon = navState.currentArrowPos.lon;
  const durationMs = 450;
  const startTime = performance.now();

  navState.currentHeading = targetHeading;
  navState.userGpsMarker.setIcon(createNavigationArrowIcon(targetHeading));

  function stepAnim(now) {
    const t = Math.min(1, (now - startTime) / durationMs);
    const ease = t * (2 - t);
    const lat = startLat + (targetLat - startLat) * ease;
    const lon = startLon + (targetLon - startLon) * ease;

    navState.currentArrowPos = { lat, lon };
    if (navState.userGpsMarker) {
      navState.userGpsMarker.setLatLng([lat, lon]);
    }
    if (navState.autoFollowGps) {
      map.panTo([lat, lon], { animate: false });
    }

    if (t < 1) {
      navState.arrowAnimFrame = requestAnimationFrame(stepAnim);
    }
  }

  navState.arrowAnimFrame = requestAnimationFrame(stepAnim);
}

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

function showOffRouteAlert(deviationMeters) {
  if (navState.isOffRouteAlertOpen || navState.isReplanning) return;
  hideTrafficAheadAlert();
  navState.isOffRouteAlertOpen = true;
  dom.offRouteSub.textContent = `You are ~${Math.round(deviationMeters)} m off the selected route. Re-route from here or continue with this route only?`;
  dom.offRouteAlert.classList.add('visible');
  playAlertChime();
}

function hideOffRouteAlert() {
  navState.isOffRouteAlertOpen = false;
  dom.offRouteAlert.classList.remove('visible');
}

function showTrafficAheadAlert(delayMins) {
  if (navState.isTrafficAlertOpen || navState.isOffRouteAlertOpen || navState.isReplanning) return;
  navState.isTrafficAlertOpen = true;
  dom.trafficAlertSub.textContent = `Heavy traffic detected ahead (+${delayMins} min delay). Re-route or continue with this route only?`;
  dom.trafficAheadAlert.classList.add('visible');
  playAlertChime();
}

function hideTrafficAheadAlert() {
  navState.isTrafficAlertOpen = false;
  dom.trafficAheadAlert.classList.remove('visible');
}

function isChargingCompletedForTrip() {
  if (!navState.activeBookingId) return false;
  const all = readAllBookings();
  const target = all.find((b) => b.id === navState.activeBookingId);
  return !!(target && target.sessionStatus === 'COMPLETED');
}

function getChargingStationForReroute(oldTrip) {
  if (oldTrip && oldTrip.route && oldTrip.route.insertedCharger) {
    return oldTrip.route.insertedCharger;
  }
  if (navState.selectedStation) {
    return navState.selectedStation;
  }
  if (navState.verifiedStations && navState.verifiedStations.length > 0) {
    return navState.verifiedStations[0];
  }
  return null;
}

async function replanRouteFromCurrentLocation(avoidTrafficMode = false) {
  if (!navState.trip || navState.isReplanning) return;

  playTapSound();
  navState.isReplanning = true;
  dom.btnReplanRoute.disabled = true;
  dom.btnChangeTrafficRoute.disabled = true;
  showToast(avoidTrafficMode ? 'Finding faster route avoiding traffic...' : 'Calculating new route from your location...');

  try {
    const oldTrip = navState.trip;
    const currentPos = navState.lastGpsCoords || navState.currentArrowPos || {
      lat: oldTrip.points[0].lat,
      lon: oldTrip.points[0].lon
    };
    const { lat, lon } = currentPos;
    const endPt = oldTrip.points[oldTrip.points.length - 1];

    const chargingDone = isChargingCompletedForTrip();
    const charger = chargingDone ? null : getChargingStationForReroute(oldTrip);
    const includeCharger = !!(charger && haversineMeters(lat, lon, charger.lat, charger.lon) > 150);

    const waypoints = [{ lat, lon }];
    if (includeCharger) {
      waypoints.push({ lat: charger.lat, lon: charger.lon });
    }
    waypoints.push({ lat: endPt.lat, lon: endPt.lon });

    let chosenOsrmRoute = null;

    if (avoidTrafficMode) {
      const oldTrafficPts = navState.trafficSegments.flatMap((s) => s.latlngs);
      const scoreOverlap = (osrmRoute) => {
        if (!oldTrafficPts.length || !osrmRoute.geometry || !osrmRoute.geometry.coordinates) return 0;
        let hits = 0;
        const coords = osrmRoute.geometry.coordinates;
        const step = Math.max(1, Math.floor(coords.length / 40));
        for (let i = 0; i < coords.length; i += step) {
          const [cLon, cLat] = coords[i];
          for (let j = 0; j < oldTrafficPts.length; j += Math.max(1, Math.floor(oldTrafficPts.length / 12))) {
            if (haversineMeters(cLat, cLon, oldTrafficPts[j][0], oldTrafficPts[j][1]) < 120) {
              hits++;
              break;
            }
          }
        }
        return hits;
      };

      const candidates = [];

      if (waypoints.length === 2) {
        const coordStr = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true&alternatives=3`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && Array.isArray(data.routes)) {
            data.routes.slice(1).forEach((r) => candidates.push(r));
          }
        }
      }

      const targetPt = waypoints[1];
      const midLat = (lat + targetPt.lat) / 2;
      const midLon = (lon + targetPt.lon) / 2;
      const dLat = targetPt.lat - lat;
      const dLon = targetPt.lon - lon;
      const len = Math.hypot(dLat, dLon) || 0.01;
      const offsetDeg = Math.min(0.03, Math.max(0.012, len * 0.3));

      for (const side of [1, -1]) {
        const detourPt = {
          lat: midLat + side * (-dLon / len) * offsetDeg,
          lon: midLon + side * (dLat / len) * offsetDeg
        };
        const detourWaypoints = [waypoints[0], detourPt, ...waypoints.slice(1)];
        const detourStr = detourWaypoints.map((p) => `${p.lon},${p.lat}`).join(';');
        try {
          const resDetour = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${detourStr}?overview=full&geometries=geojson&steps=true`
          );
          if (resDetour.ok) {
            const dData = await resDetour.json();
            if (dData.code === 'Ok' && dData.routes && dData.routes.length > 0) {
              candidates.push(dData.routes[0]);
            }
          }
        } catch {}
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const diff = scoreOverlap(a) - scoreOverlap(b);
          return diff !== 0 ? diff : a.duration - b.duration;
        });
        chosenOsrmRoute = candidates[0];
      }
    }

    if (!chosenOsrmRoute) {
      const coordStr = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Replan request failed');
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('Could not find an alternate route from here');
      }
      chosenOsrmRoute = data.routes[0];
    }

    const newDistKm = chosenOsrmRoute.distance / 1000;
    const newDriveMins = chosenOsrmRoute.duration / 60;
    const chargeMins = includeCharger ? (oldTrip.route.chargeTimeMins || 25) : 0;

    oldTrip.points[0] = {
      ...oldTrip.points[0],
      lat,
      lon,
      query: 'Current GPS Location'
    };
    oldTrip.route.name = avoidTrafficMode
      ? (includeCharger ? 'Traffic-Avoidance Route (via Charger)' : 'Traffic-Avoidance Route')
      : (includeCharger ? 'Re-routed Path (via Charger)' : 'Re-routed Path');
    oldTrip.route.distanceKm = newDistKm;
    oldTrip.route.totalMinutes = newDriveMins + chargeMins;
    oldTrip.route.geometry = chosenOsrmRoute.geometry;
    oldTrip.route.insertedCharger = includeCharger ? charger : null;
    oldTrip.route.trafficCleared = !!avoidTrafficMode;

    localStorage.setItem('activeTripData', JSON.stringify(oldTrip));

    const allSteps = [];
    if (Array.isArray(chosenOsrmRoute.legs)) {
      chosenOsrmRoute.legs.forEach((leg) => {
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
    }

    navState.steps = allSteps;
    navState.currentStepIndex = 0;
    navState.simCoordIndex = 0;
    navState.ignoreOffRouteUntil = Date.now() + 8000;
    navState.ignoreTrafficUntil = Date.now() + KEEP_ROUTE_COOLDOWN_MS;

    renderTripSummary(oldTrip);
    drawTripOnMap(oldTrip);
    updateNavigationHud();
    hideOffRouteAlert();
    hideTrafficAheadAlert();

    map.setView([lat, lon], 15);
    if (chargingDone) {
      showToast('Re-routed directly to destination (Charging Done ✓)');
    } else if (includeCharger) {
      showToast(`Re-routed via charging station: ${charger.name}`);
    } else {
      showToast('Route updated from your current location');
    }
  } catch (err) {
    showToast(err.message || 'Unable to re-route right now.');
  } finally {
    navState.isReplanning = false;
    dom.btnReplanRoute.disabled = false;
    dom.btnChangeTrafficRoute.disabled = false;
  }
}

dom.btnReplanRoute.addEventListener('click', () => replanRouteFromCurrentLocation(false));
dom.btnChangeTrafficRoute.addEventListener('click', () => replanRouteFromCurrentLocation(true));

dom.btnKeepPrevRoute.addEventListener('click', () => {
  playTapSound();
  hideOffRouteAlert();
  navState.ignoreOffRouteUntil = Date.now() + KEEP_ROUTE_COOLDOWN_MS;
  showToast('Continuing with this route only');
});

dom.btnContinueTrafficRoute.addEventListener('click', () => {
  playTapSound();
  hideTrafficAheadAlert();
  navState.ignoreTrafficUntil = Date.now() + KEEP_ROUTE_COOLDOWN_MS;
  showToast('Continuing with this route only');
});

function startNavigation() {
  if (!navState.trip) return;

  playTapSound();
  navState.isNavigating = true;
  navState.autoFollowGps = true;
  dom.navMapPanel.classList.add('nav-active');
  dom.navHud.setAttribute('aria-hidden', 'false');

  const el = dom.navMapPanel;
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }

  const coords = navState.trip.route.geometry.coordinates;
  const startPt = navState.trip.points[0];
  const initialHeading =
    coords.length > 1
      ? computeBearingDegrees(coords[0][1], coords[0][0], coords[1][1], coords[1][0])
      : 0;

  setTimeout(() => {
    map.invalidateSize();
    map.setView([startPt.lat, startPt.lon], 16);
    smoothlyMoveNavigationArrow(startPt.lat, startPt.lon, initialHeading);
    navState.lastGpsCoords = { lat: startPt.lat, lon: startPt.lon };
  }, 200);

  updateNavigationHud();
  beginLiveGpsTracking();
  showToast('Navigation started — Arrow tracking active');
}

function stopNavigation() {
  playTapSound();
  navState.isNavigating = false;
  hideOffRouteAlert();
  hideTrafficAheadAlert();
  stopSimulatedDrive();

  dom.navMapPanel.classList.remove('nav-active');
  dom.navHud.setAttribute('aria-hidden', 'true');

  if (navState.gpsWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(navState.gpsWatchId);
    navState.gpsWatchId = null;
  }

  if (navState.arrowAnimFrame) {
    cancelAnimationFrame(navState.arrowAnimFrame);
    navState.arrowAnimFrame = null;
  }

  if (navState.userGpsMarker) {
    map.removeLayer(navState.userGpsMarker);
    navState.userGpsMarker = null;
    navState.currentArrowPos = null;
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

function handleLivePositionUpdate(latitude, longitude, speedKmh, explicitHeading = null) {
  let heading = navState.currentHeading;
  if (typeof explicitHeading === 'number' && !isNaN(explicitHeading)) {
    heading = explicitHeading;
  } else if (navState.lastGpsCoords) {
    const moved = haversineMeters(
      navState.lastGpsCoords.lat,
      navState.lastGpsCoords.lon,
      latitude,
      longitude
    );
    if (moved > 2) {
      heading = computeBearingDegrees(
        navState.lastGpsCoords.lat,
        navState.lastGpsCoords.lon,
        latitude,
        longitude
      );
    }
  }

  navState.lastGpsCoords = { lat: latitude, lon: longitude };
  dom.navSpeedVal.textContent = String(speedKmh);
  smoothlyMoveNavigationArrow(latitude, longitude, heading);

  if (navState.trip && navState.trip.route && navState.trip.route.geometry) {
    const deviationMeters = getDistanceFromRouteMeters(
      latitude,
      longitude,
      navState.trip.route.geometry.coordinates
    );

    if (deviationMeters > OFF_ROUTE_THRESHOLD_METERS) {
      if (Date.now() > navState.ignoreOffRouteUntil) {
        showOffRouteAlert(deviationMeters);
      }
    } else if (navState.isOffRouteAlertOpen) {
      hideOffRouteAlert();
      showToast('Back on selected route');
    }
  }

  if (Date.now() > navState.ignoreTrafficUntil && navState.trafficSegments.length > 0) {
    for (const seg of navState.trafficSegments) {
      const segStart = seg.latlngs[0];
      const distToRedZone = haversineMeters(latitude, longitude, segStart[0], segStart[1]);
      if (distToRedZone < 220) {
        showTrafficAheadAlert(seg.delayMins);
        break;
      }
    }
  }

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
}

function beginLiveGpsTracking() {
  if (!navigator.geolocation) {
    showToast('GPS unavailable; press Play button on right to simulate smooth tracking.');
    return;
  }

  navState.gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      const kmh = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0;
      handleLivePositionUpdate(latitude, longitude, kmh, heading);
    },
    () => {
      showToast('Waiting for GPS. Tap Play button on right to simulate live arrow drive.');
    },
    { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
  );
}

function stopSimulatedDrive() {
  if (navState.simTimer) {
    clearInterval(navState.simTimer);
    navState.simTimer = null;
  }
  dom.btnSimulateDrive.classList.remove('active-sim');
}

dom.btnSimulateDrive.addEventListener('click', () => {
  playTapSound();
  if (!navState.trip) return;
  if (navState.simTimer) {
    stopSimulatedDrive();
    showToast('Drive simulation paused');
    return;
  }

  const coords = navState.trip.route.geometry.coordinates;
  if (!coords || coords.length < 2) return;

  dom.btnSimulateDrive.classList.add('active-sim');
  showToast('Simulating live arrow movement along route');

  navState.simTimer = setInterval(() => {
    if (navState.simCoordIndex >= coords.length - 1) {
      stopSimulatedDrive();
      showToast('Arrived at destination');
      return;
    }

    const [lon, lat] = coords[navState.simCoordIndex];
    const [nextLon, nextLat] = coords[navState.simCoordIndex + 1];
    const heading = computeBearingDegrees(lat, lon, nextLat, nextLon);
    handleLivePositionUpdate(lat, lon, 38, heading);
    navState.simCoordIndex = Math.min(coords.length - 1, navState.simCoordIndex + 2);
  }, 650);
});

map.on('click', (e) => {
  if (!navState.isNavigating) return;
  handleLivePositionUpdate(e.latlng.lat, e.latlng.lng, 32);
});

map.on('dragstart', () => {
  if (navState.isNavigating) {
    navState.autoFollowGps = false;
  }
});

dom.btnStartNav.addEventListener('click', startNavigation);
dom.btnExitNavigation.addEventListener('click', stopNavigation);

dom.btnNavRecenter.addEventListener('click', () => {
  playTapSound();
  navState.autoFollowGps = true;
  if (navState.userGpsMarker) {
    map.setView(navState.userGpsMarker.getLatLng(), 17);
  }
  showToast('Recentered on navigation arrow');
});

dom.btnPrevStep.addEventListener('click', () => {
  playTapSound();
  if (navState.currentStepIndex > 0) {
    navState.currentStepIndex--;
    updateNavigationHud();
    const s = navState.steps[navState.currentStepIndex];
    if (s && s.location) map.panTo([s.location[1], s.location[0]]);
  }
});

dom.btnNextStep.addEventListener('click', () => {
  playTapSound();
  if (navState.currentStepIndex < navState.steps.length - 1) {
    navState.currentStepIndex++;
    updateNavigationHud();
    const s = navState.steps[navState.currentStepIndex];
    if (s && s.location) map.panTo([s.location[1], s.location[0]]);
  }
});

document.addEventListener('fullscreenchange', () => {
  setTimeout(() => map.invalidateSize(), 150);
});

// -------------------------------------------------------------------------
// 8. VERIFIED-ONLY CHARGING STATIONS, IN-APP PAYMENT & KIOSK TICKET RECEIPT
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

function getStationKey(station) {
  if (!station) return '';
  return `${station.name}_${station.lat.toFixed(4)}_${station.lon.toFixed(4)}`
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function generateUnlockPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
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

async function fetchVerifiedStationsForTrip(trip) {
  const verifiedMap = new Map();

  // 1. Include any charging stop already inserted by the Route Planner
  if (trip.route && trip.route.insertedCharger) {
    const c = trip.route.insertedCharger;
    const key = `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
    verifiedMap.set(key, {
      id: key,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      chargers: Math.max(1, parseInt(c.chargers, 10) || 2),
      speed: c.speed || '50 kW',
      source: 'Route Charger'
    });
  }

  const startPt = trip.points[0];
  const destPt = trip.points[trip.points.length - 1] || startPt;
  const midLat = (startPt.lat + destPt.lat) / 2;
  const midLon = (startPt.lon + destPt.lon) / 2;

  // 2. Fast 6 km Overpass query (nodes only -> responds in ~1s without timing out)
  const fastQuery = `[out:json][timeout:6];node["amenity"="charging_station"](around:6000,${midLat},${midLon});out body 15;`;
  const encodedQ = encodeURIComponent(fastQuery);

  const overpassPromise = Promise.any([
    fetch(`https://overpass-api.de/api/interpreter?data=${encodedQ}`, { signal: AbortSignal.timeout(6000) }),
    fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodedQ}`, { signal: AbortSignal.timeout(6000) })
  ])
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  // 3. Parallel Nominatim bounded search (~10 km box around route)
  const pad = 0.09;
  const viewbox = `${midLon - pad},${midLat + pad},${midLon + pad},${midLat - pad}`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=charging+station&viewbox=${viewbox}&bounded=1&limit=10`;

  const nominatimPromise = fetch(nominatimUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000)
  })
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => []);

  const [overpassData, nominatimData] = await Promise.all([overpassPromise, nominatimPromise]);

  // Parse Overpass results
  if (overpassData && Array.isArray(overpassData.elements)) {
    overpassData.elements.forEach((el) => {
      if (typeof el.lat !== 'number' || typeof el.lon !== 'number') return;
      const tags = el.tags || {};
      const realName = (
        tags.name ||
        tags.operator ||
        tags.brand ||
        tags.network ||
        (tags['addr:street'] ? `EV Charger · ${tags['addr:street']}` : 'EV Charging Station')
      ).trim();

      const key = `${el.lat.toFixed(4)},${el.lon.toFixed(4)}`;
      if (!verifiedMap.has(key)) {
        verifiedMap.set(key, {
          id: key,
          name: realName,
          lat: el.lat,
          lon: el.lon,
          chargers: Math.max(1, parseInt(tags.capacity, 10) || 2),
          speed: tags['socket:ccs:output'] || tags['socket:type2:output'] || tags.maxpower || '50 kW',
          source: 'OpenStreetMap'
        });
      }
    });
  }

  // Parse Nominatim results
  if (Array.isArray(nominatimData)) {
    nominatimData.forEach((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) return;
      const title = (item.display_name || '').split(',')[0].trim() || 'EV Charging Station';
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (!verifiedMap.has(key)) {
        verifiedMap.set(key, {
          id: key,
          name: title,
          lat,
          lon,
          chargers: 2,
          speed: '50 kW',
          source: 'OpenStreetMap'
        });
      }
    });
  }

  // Sort closest to destination first
  return Array.from(verifiedMap.values()).sort(
    (a, b) =>
      haversineMeters(destPt.lat, destPt.lon, a.lat, a.lon) -
      haversineMeters(destPt.lat, destPt.lon, b.lat, b.lon)
  );
}

function applySelectedVerifiedStation(station) {
  navState.selectedStation = station;

  if (!station) {
    dom.bookingStateBadge.textContent = 'No station';
    dom.bookingStateBadge.className = 'pill-badge unavailable';
    dom.slotStationName.textContent = 'No verified charging station available nearby';
    dom.slotStationMeta.textContent =
      'Booking is disabled because no verified real charging station exists at this location.';
    dom.inputChargerCount.value = '';
    dom.occupancyBox.className = 'occupancy-box full';
    dom.occupancyTitle.textContent = 'Charging station unavailable';
    dom.occupancyDetail.textContent =
      'Only real, verified charging stations can be booked. Custom station names are disabled.';
    dom.btnConfirmSlot.disabled = true;
    dom.btnConfirmSlot.textContent = 'No Verified Station Available';
    renderStationBookingsList();
    return;
  }

  dom.bookingStateBadge.textContent = 'Verified';
  dom.bookingStateBadge.className = 'pill-badge';
  dom.slotStationName.textContent = station.name;
  dom.slotStationMeta.textContent = `${station.chargers} charger(s) · ${station.speed} · Verified (${station.source})`;
  dom.inputChargerCount.value = station.chargers;
  checkSlotAvailability();
}

async function initSlotBookingSection(trip) {
  const todayStr = new Date().toISOString().split('T')[0];
  dom.inputBookingDate.min = todayStr;
  dom.inputBookingDate.value = todayStr;
  populateTimeSlots();

  if (trip.vehicle && trip.vehicle.name) {
    dom.inputDriverVehicle.value = trip.vehicle.name;
  }

  dom.selectVerifiedStation.innerHTML =
    '<option value="">Searching real charging stations nearby...</option>';
  dom.btnConfirmSlot.disabled = true;

  const stations = await fetchVerifiedStationsForTrip(trip);
  navState.verifiedStations = stations;
  dom.selectVerifiedStation.innerHTML = '';

  if (stations.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No verified charging stations found nearby';
    dom.selectVerifiedStation.appendChild(opt);
    dom.selectVerifiedStation.disabled = true;
    applySelectedVerifiedStation(null);
    return;
  }

  dom.selectVerifiedStation.disabled = false;
  stations.forEach((st, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${st.name} (${st.chargers} chargers · ${st.speed})`;
    dom.selectVerifiedStation.appendChild(opt);
  });

  applySelectedVerifiedStation(stations[0]);
}

dom.selectVerifiedStation.addEventListener('change', () => {
  playTapSound();
  const idx = parseInt(dom.selectVerifiedStation.value, 10);
  const st = !isNaN(idx) ? navState.verifiedStations[idx] : null;
  applySelectedVerifiedStation(st);
});

function checkSlotAvailability() {
  const station = navState.selectedStation;
  const dateVal = dom.inputBookingDate.value;
  const timeSlot = dom.selectBookingTime.value;

  if (!station) {
    dom.btnConfirmSlot.disabled = true;
    dom.btnChangeSlot.style.display = 'none';
    renderStationBookingsList();
    return;
  }

  const totalChargers = station.chargers;
  const stationKey = getStationKey(station);
  const all = readAllBookings();

  const sameSlotBookings = all.filter(
    (b) => b.stationKey === stationKey && b.date === dateVal && b.timeSlot === timeSlot
  );

  const bookedCount = sameSlotBookings.length;
  const remainingSpots = Math.max(0, totalChargers - bookedCount);

  if (bookedCount >= totalChargers) {
    dom.occupancyBox.className = 'occupancy-box full';
    dom.occupancyTitle.textContent =
      'Slot unavailable — ' + bookedCount + (bookedCount === 1 ? ' person has' : ' people have') + ' already booked all ' + totalChargers + ' charger(s).';
    dom.occupancyDetail.textContent =
      'This time slot (' + timeSlot + ') is full and cannot be booked. Please choose another time slot or continue without booking.';
    dom.btnConfirmSlot.disabled = true;
    dom.btnConfirmSlot.textContent = 'Time Slot Full';
    dom.btnChangeSlot.style.display = 'inline-flex';
  } else if (bookedCount > 0) {
    dom.occupancyBox.className = 'occupancy-box partial';
    dom.occupancyTitle.textContent =
      bookedCount + (bookedCount === 1 ? ' person has' : ' people have') + ' already booked ' + timeSlot + '.';
    dom.occupancyDetail.textContent =
      remainingSpots + ' of ' + totalChargers + ' charger(s) still open. Pay ₹' + SLOT_BOOKING_FEE_INR + ' to reserve.';
    dom.btnConfirmSlot.disabled = false;
    dom.btnConfirmSlot.textContent = `Pay ₹${SLOT_BOOKING_FEE_INR} & Book This Slot`;
    dom.btnChangeSlot.style.display = 'inline-flex';
  } else {
    dom.occupancyBox.className = 'occupancy-box available';
    dom.occupancyTitle.textContent = 'Slot available (' + timeSlot + ')';
    dom.occupancyDetail.textContent =
      '0 of ' + totalChargers + ' chargers booked for this time. Ready to pay & reserve.';
    dom.btnConfirmSlot.disabled = false;
    dom.btnConfirmSlot.textContent = `Pay ₹${SLOT_BOOKING_FEE_INR} & Book Slot`;
    dom.btnChangeSlot.style.display = 'none';
  }

  renderStationBookingsList();
}

function renderStationBookingsList() {
  const station = navState.selectedStation;
  const dateVal = dom.inputBookingDate.value;
  const stationKey = getStationKey(station);

  const list = station
    ? readAllBookings().filter((b) => b.stationKey === stationKey && b.date === dateVal)
    : [];

  dom.existingBookingsCount.textContent = String(list.length);
  dom.existingBookingsList.innerHTML = '';

  if (list.length === 0) {
    dom.existingBookingsList.innerHTML =
      '<div class="existing-empty">No slots booked yet for this verified station on ' + (dateVal || 'selected date') + '.</div>';
    return;
  }

  list.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'existing-item';
    row.innerHTML = `
      <div>
        <div class="existing-item-main">${b.timeSlot} &middot; Charger #${b.bayNumber} (PIN ${b.unlockPin})</div>
        <div class="existing-item-sub">${b.vehicleName} &middot; Paid ₹${b.amountPaid}</div>
      </div>
      <button type="button" class="existing-remove-btn" data-id="${b.id}">Cancel</button>
    `;

    row.querySelector('.existing-remove-btn').addEventListener('click', () => {
      cancelBookingById(b.id);
    });

    dom.existingBookingsList.appendChild(row);
  });
}

let upiQrTimerInterval = null;
let upiPollInterval = null;
let upiQrRemainingSecs = UPI_QR_VALIDITY_SECONDS;
let currentPaymentMeta = null;
let currentUpiParams = '';
let isPaymentResolved = false;

function stopUpiQrTimer() {
  if (upiQrTimerInterval) {
    clearInterval(upiQrTimerInterval);
    upiQrTimerInterval = null;
  }
}

function stopPaymentStatusPolling() {
  if (upiPollInterval) {
    clearInterval(upiPollInterval);
    upiPollInterval = null;
  }
}

function showUpiAppNotInstalledMessage(appLabel) {
  const msg = `${appLabel} is not installed on this device. Please choose another option or scan the QR code.`;
  if (dom.upiAppAlert) {
    dom.upiAppAlert.textContent = msg;
    dom.upiAppAlert.style.display = 'block';
  }
  showToast(msg);
  playAlertChime();
}

function hideUpiAppAlert() {
  if (dom.upiAppAlert) {
    dom.upiAppAlert.style.display = 'none';
    dom.upiAppAlert.textContent = '';
  }
}

function launchUpiApp(appKey, appLabel) {
  if (upiQrRemainingSecs <= 0 || !currentUpiParams) {
    showToast('QR expired. Please generate a new QR code.');
    return;
  }

  playTapSound();
  hideUpiAppAlert();

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isAndroid && !isIOS) {
    showUpiAppNotInstalledMessage(appLabel);
    return;
  }

  let appUrl = `upi://pay?${currentUpiParams}`;
  if (appKey === 'gpay') {
    appUrl = isAndroid
      ? `intent://pay?${currentUpiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
      : `tez://upi/pay?${currentUpiParams}`;
  } else if (appKey === 'phonepe') {
    appUrl = isAndroid
      ? `intent://pay?${currentUpiParams}#Intent;scheme=upi;package=com.phonepe.app;end`
      : `phonepe://pay?${currentUpiParams}`;
  } else if (appKey === 'paytm') {
    appUrl = isAndroid
      ? `intent://pay?${currentUpiParams}#Intent;scheme=upi;package=net.one97.paytm;end`
      : `paytmmp://pay?${currentUpiParams}`;
  }

  let appOpened = false;

  const onVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    } else if (appOpened && !isPaymentResolved && currentPaymentMeta && currentPaymentMeta.txnRef) {
      if (dom.upiLiveStatusText) {
        dom.upiLiveStatusText.textContent = 'Checking ₹50.00 payment status...';
      }
      pollPaymentStatusOnce(currentPaymentMeta.txnRef);
    }
  };

  const onWindowBlur = () => {
    appOpened = true;
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);

  window.location.href = appUrl;

  setTimeout(() => {
    window.removeEventListener('blur', onWindowBlur);
    if (!appOpened) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      showUpiAppNotInstalledMessage(appLabel);
    } else {
      setTimeout(() => document.removeEventListener('visibilitychange', onVisibilityChange), UPI_QR_VALIDITY_SECONDS * 1000);
    }
  }, 1600);
}

function showCheckingPaymentStatusPopup(message = 'Checking ₹50.00 transaction status with UPI...') {
  dom.payStatusIcon.className = 'pay-status-icon checking';
  dom.payStatusIcon.innerHTML = '<div class="pay-status-spinner" aria-hidden="true"></div>';
  dom.payStatusTitle.textContent = 'Checking Payment Status...';
  dom.payStatusMsg.textContent = message;
  dom.btnPaymentStatusOk.style.display = 'none';
  dom.paymentStatusBackdrop.classList.add('open');
  dom.paymentStatusBackdrop.setAttribute('aria-hidden', 'false');
}

function showPaymentStatusPopup(isSuccess, title, message) {
  return new Promise((resolve) => {
    dom.payStatusIcon.className = 'pay-status-icon ' + (isSuccess ? 'success' : 'error');
    dom.payStatusIcon.innerHTML = isSuccess
      ? '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    dom.payStatusTitle.textContent = title;
    dom.payStatusMsg.textContent = message;
    dom.btnPaymentStatusOk.style.display = 'inline-flex';
    dom.btnPaymentStatusOk.textContent = isSuccess ? 'Print Ticket' : 'Close';

    dom.paymentStatusBackdrop.classList.add('open');
    dom.paymentStatusBackdrop.setAttribute('aria-hidden', 'false');

    if (!isSuccess) {
      playAlertChime();
    }

    const onOk = () => {
      playTapSound();
      dom.paymentStatusBackdrop.classList.remove('open');
      dom.paymentStatusBackdrop.setAttribute('aria-hidden', 'true');
      dom.btnPaymentStatusOk.removeEventListener('click', onOk);
      resolve();
    };
    dom.btnPaymentStatusOk.addEventListener('click', onOk);
  });
}

async function handleVerifiedPaymentSuccess(receiptId) {
  if (isPaymentResolved) return;
  isPaymentResolved = true;
  stopUpiQrTimer();
  stopPaymentStatusPolling();

  dom.paymentModalBackdrop.classList.remove('open');
  dom.paymentModalBackdrop.setAttribute('aria-hidden', 'true');

  await showPaymentStatusPopup(
    true,
    'Payment Successful!',
    `Verified ₹${SLOT_BOOKING_FEE_INR}.00 received by ${URF_UPI_NAME} (${URF_UPI_ID}). Ref: ${receiptId}`
  );

  if (navState.pendingPaymentResolve) {
    navState.pendingPaymentResolve({
      paymentId: receiptId,
      method: 'UPI (' + URF_UPI_ID + ')'
    });
    navState.pendingPaymentResolve = null;
    navState.pendingPaymentReject = null;
  }
}

async function handleVerifiedPaymentFailure(reasonMessage) {
  if (isPaymentResolved) return;
  isPaymentResolved = true;
  stopUpiQrTimer();
  stopPaymentStatusPolling();

  dom.paymentModalBackdrop.classList.remove('open');
  dom.paymentModalBackdrop.setAttribute('aria-hidden', 'true');

  await showPaymentStatusPopup(
    false,
    'Payment Failed',
    reasonMessage || `₹${SLOT_BOOKING_FEE_INR}.00 UPI transaction failed or was not completed. Ticket was not printed.`
  );

  if (navState.pendingPaymentReject) {
    navState.pendingPaymentReject(new Error(reasonMessage || 'Payment failed. Slot was not booked.'));
    navState.pendingPaymentResolve = null;
    navState.pendingPaymentReject = null;
  }
}

async function pollPaymentStatusOnce(txnRef) {
  if (isPaymentResolved || !txnRef || !PAYMENT_STATUS_API_URL) return;

  try {
    const res = await fetch(
      `${PAYMENT_STATUS_API_URL}/${encodeURIComponent(txnRef)}?expectedAmount=${SLOT_BOOKING_FEE_INR}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return;
    const data = await res.json();

    if (
      data &&
      data.status === 'SUCCESS' &&
      data.verified === true &&
      Number(data.amount) === Number(SLOT_BOOKING_FEE_INR)
    ) {
      await handleVerifiedPaymentSuccess(data.paymentId || txnRef);
    } else if (data && data.status === 'FAILED') {
      await handleVerifiedPaymentFailure(
        data.message || 'UPI payment was declined or wrong UPI PIN entered.'
      );
    }
  } catch {
    // Keep waiting until server responds or 5-minute QR expires
  }
}

function startPaymentStatusPolling(txnRef) {
  stopPaymentStatusPolling();
  upiPollInterval = setInterval(() => {
    pollPaymentStatusOnce(txnRef);
  }, PAYMENT_POLL_INTERVAL_MS);
}

function startFiveMinuteUpiQr({ stationName, dateVal, timeSlot }) {
  stopUpiQrTimer();
  stopPaymentStatusPolling();
  hideUpiAppAlert();
  isPaymentResolved = false;
  upiQrRemainingSecs = UPI_QR_VALIDITY_SECONDS;

  const txnRef = 'URF' + Date.now().toString().slice(-8);
  if (currentPaymentMeta) currentPaymentMeta.txnRef = txnRef;
  const note = `EV Slot ${stationName} ${timeSlot}`.slice(0, 50);

  currentUpiParams =
    `pa=${encodeURIComponent(URF_UPI_ID)}` +
    `&pn=${encodeURIComponent(URF_UPI_NAME)}` +
    `&am=${SLOT_BOOKING_FEE_INR.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(note)}`;

  const upiUri = `upi://pay?${currentUpiParams}`;

  dom.upiIdDisplay.textContent = URF_UPI_ID;
  if (dom.upiLiveStatusText) {
    dom.upiLiveStatusText.textContent = 'Scan QR or open UPI app — waiting for ₹50.00 confirmation...';
  }

  if (dom.upiQrCanvas) {
    dom.upiQrCanvas.innerHTML = '';
    if (typeof window.QRCode === 'function') {
      new window.QRCode(dom.upiQrCanvas, {
        text: upiUri,
        width: 162,
        height: 162,
        colorDark: '#14261c',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      const fallbackImg = document.createElement('img');
      fallbackImg.alt = 'Urban Route Fleet UPI QR';
      fallbackImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(upiUri)}`;
      dom.upiQrCanvas.appendChild(fallbackImg);
    }
  }

  dom.upiQrFrame.classList.remove('expired');

  const timerRow = dom.payQrTimer.closest('.upi-timer-row');
  if (timerRow) timerRow.className = 'upi-timer-row';

  const renderClock = () => {
    const mins = String(Math.floor(upiQrRemainingSecs / 60)).padStart(2, '0');
    const secs = String(upiQrRemainingSecs % 60).padStart(2, '0');
    dom.payQrTimer.textContent = `${mins}:${secs}`;
    if (timerRow) {
      if (upiQrRemainingSecs <= 0) {
        timerRow.className = 'upi-timer-row expired';
      } else if (upiQrRemainingSecs <= 60) {
        timerRow.className = 'upi-timer-row warning';
      }
    }
  };

  renderClock();

  fetch(PAYMENT_INIT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txnRef,
      stationName,
      dateVal,
      timeSlot,
      vehicleName: currentPaymentMeta ? currentPaymentMeta.vehicleName : 'EV Driver',
      amount: SLOT_BOOKING_FEE_INR
    })
  }).catch(() => {});

  startPaymentStatusPolling(txnRef);

  upiQrTimerInterval = setInterval(() => {
    upiQrRemainingSecs--;
    renderClock();
    if (upiQrRemainingSecs <= 0) {
      stopUpiQrTimer();
      stopPaymentStatusPolling();
      dom.upiQrFrame.classList.add('expired');
      handleVerifiedPaymentFailure(
        'Payment Failed — The 5-minute UPI QR code expired before ₹50.00 payment was confirmed.'
      );
    }
  }, 1000);
}

function openInAppPaymentCheckout({ stationName, dateVal, timeSlot, vehicleName }) {
  return new Promise((resolve, reject) => {
    if (RAZORPAY_KEY_ID && typeof window.Razorpay === 'function') {
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: SLOT_BOOKING_FEE_INR * 100,
        currency: 'INR',
        name: 'Urban Route Fleet',
        description: `Charging Slot: ${stationName} (${timeSlot})`,
        prefill: { name: vehicleName },
        theme: { color: '#07241b' },
        handler: function (res) {
          resolve({ paymentId: res.razorpay_payment_id, method: 'Razorpay' });
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled. Slot was not booked.'));
          }
        }
      });
      rzp.open();
      return;
    }

    currentPaymentMeta = { stationName, dateVal, timeSlot, vehicleName };
    dom.payModalStation.textContent = stationName;
    dom.payModalSlot.textContent = `${dateVal} · ${timeSlot}`;
    startFiveMinuteUpiQr(currentPaymentMeta);

    dom.paymentModalBackdrop.classList.add('open');
    dom.paymentModalBackdrop.setAttribute('aria-hidden', 'false');

    navState.pendingPaymentResolve = resolve;
    navState.pendingPaymentReject = reject;
  });
}

if (dom.upiLinkGpay) {
  dom.upiLinkGpay.addEventListener('click', () => launchUpiApp('gpay', 'Google Pay (GPay)'));
}
if (dom.upiLinkPhonePe) {
  dom.upiLinkPhonePe.addEventListener('click', () => launchUpiApp('phonepe', 'PhonePe'));
}
if (dom.upiLinkPaytm) {
  dom.upiLinkPaytm.addEventListener('click', () => launchUpiApp('paytm', 'Paytm'));
}
if (dom.upiDeepLink) {
  dom.upiDeepLink.addEventListener('click', () => launchUpiApp('any', 'A UPI App'));
}

dom.btnRegenerateQr.addEventListener('click', () => {
  playTapSound();
  if (currentPaymentMeta) {
    startFiveMinuteUpiQr(currentPaymentMeta);
    showToast('New 5-minute UPI QR generated');
  }
});

if (dom.btnCopyUpiId) {
  dom.btnCopyUpiId.addEventListener('click', () => {
    playTapSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(URF_UPI_ID).catch(() => {});
    }
    showToast(`Copied UPI ID: ${URF_UPI_ID}`);
  });
}

dom.btnFailInAppPayment.addEventListener('click', async () => {
  playTapSound();
  stopUpiQrTimer();
  stopPaymentStatusPolling();
  dom.paymentModalBackdrop.classList.remove('open');
  dom.paymentModalBackdrop.setAttribute('aria-hidden', 'true');

  showCheckingPaymentStatusPopup(`Checking ₹${SLOT_BOOKING_FEE_INR}.00 transaction status with ${URF_UPI_NAME}...`);
  await waitMs(800);

  await handleVerifiedPaymentFailure(
    'Payment Failed — No ₹50.00 UPI transaction was completed. Slot was not booked.'
  );
});

dom.btnClosePaymentModal.addEventListener('click', () => {
  playTapSound();
  stopUpiQrTimer();
  stopPaymentStatusPolling();
  dom.paymentModalBackdrop.classList.remove('open');
  dom.paymentModalBackdrop.setAttribute('aria-hidden', 'true');
  if (navState.pendingPaymentReject) {
    navState.pendingPaymentReject(new Error('Payment cancelled. Slot was not booked.'));
    navState.pendingPaymentResolve = null;
    navState.pendingPaymentReject = null;
  }
});

function updateTicketView(booking) {
  const isCharging = booking.sessionStatus === 'CHARGING';
  const isDone = booking.sessionStatus === 'COMPLETED';
  const slotText = `${booking.date} · ${booking.timeSlot}`;
  const amountText = `₹${booking.amountPaid} Paid (${booking.paymentMethod})`;

  dom.ticketSessionStatus.textContent = isDone
    ? 'CHARGING DONE ✓'
    : (isCharging ? 'CHARGING IN PROGRESS' : 'BOOKING CONFIRMED');
  dom.bookingStateBadge.textContent = isDone
    ? 'Charging Done ✓'
    : (isCharging ? 'Charging' : 'Paid & Booked');
  dom.bookingStateBadge.className = 'pill-badge confirmed';
  dom.ticketBayLabel.textContent = 'Charger #' + booking.bayNumber;
  dom.ticketStationName.textContent = booking.stationName;
  dom.ticketTimeMeta.textContent = slotText;
  if (dom.ticketVehicleName) dom.ticketVehicleName.textContent = booking.vehicleName;
  dom.ticketReceiptId.textContent = booking.paymentId || 'RCP-000000';
  dom.ticketAmountLabel.textContent = amountText;
  dom.ticketUnlockPin.textContent = booking.unlockPin;
  dom.btnToggleSession.textContent = isDone
    ? 'Charging Done ✓'
    : (isCharging ? 'Complete Charging Session' : 'Start Charging Session');
  dom.btnToggleSession.disabled = isDone;

  if (dom.ovTicketBay) dom.ovTicketBay.textContent = 'Charger #' + booking.bayNumber;
  if (dom.ovTicketStation) dom.ovTicketStation.textContent = booking.stationName;
  if (dom.ovTicketTime) dom.ovTicketTime.textContent = slotText;
  if (dom.ovTicketVehicle) dom.ovTicketVehicle.textContent = booking.vehicleName;
  if (dom.ovTicketReceipt) dom.ovTicketReceipt.textContent = booking.paymentId || 'RCP-000000';
  if (dom.ovTicketAmount) dom.ovTicketAmount.textContent = amountText;
  if (dom.ovTicketPin) dom.ovTicketPin.textContent = booking.unlockPin;
}

async function confirmSlotBooking() {
  playTapSound();
  const station = navState.selectedStation;
  if (!station) {
    showToast('No verified charging station selected.');
    return;
  }

  const dateVal = dom.inputBookingDate.value;
  const timeSlot = dom.selectBookingTime.value;
  const vehicleName = dom.inputDriverVehicle.value.trim() || 'EV Driver';
  const totalChargers = station.chargers;

  if (!dateVal || !timeSlot) {
    showToast('Please select date and time slot.');
    return;
  }

  const stationKey = getStationKey(station);
  const all = readAllBookings();
  const sameSlot = all.filter(
    (b) => b.stationKey === stationKey && b.date === dateVal && b.timeSlot === timeSlot
  );

  if (sameSlot.length >= totalChargers) {
    checkSlotAvailability();
    showToast('Cannot book: all chargers are already reserved at this time.');
    return;
  }

  let paymentResult;
  try {
    paymentResult = await openInAppPaymentCheckout({
      stationName: station.name,
      dateVal,
      timeSlot,
      vehicleName
    });
  } catch (err) {
    showToast(err.message || 'Payment cancelled.');
    return;
  }

  const newBooking = {
    id: 'bk-' + Date.now(),
    stationKey,
    stationName: station.name,
    date: dateVal,
    timeSlot,
    vehicleName,
    bayNumber: sameSlot.length + 1,
    unlockPin: generateUnlockPin(),
    amountPaid: SLOT_BOOKING_FEE_INR,
    paymentId: paymentResult.paymentId,
    paymentMethod: paymentResult.method,
    sessionStatus: 'RESERVED',
    createdAt: new Date().toISOString()
  };

  all.push(newBooking);
  saveAllBookings(all);

  navState.activeBookingId = newBooking.id;
  navState.skippedBooking = false;

  dom.bookingFormBody.style.display = 'none';
  dom.skippedBookingBox.style.display = 'none';
  dom.confirmedTicketBox.style.display = 'flex';
  updateTicketView(newBooking);
  triggerTicketPrintAnimation();

  renderStationBookingsList();
  showToast(`Booking confirmed · Receipt ${newBooking.paymentId}`);
}

dom.btnReprintTicket.addEventListener('click', () => {
  triggerTicketPrintAnimation();
  showToast('Replaying kiosk printer animation');
});

dom.btnToggleSession.addEventListener('click', () => {
  playTapSound();
  if (!navState.activeBookingId) return;
  const all = readAllBookings();
  const target = all.find((b) => b.id === navState.activeBookingId);
  if (!target) return;

  if (target.sessionStatus === 'COMPLETED') return;
  target.sessionStatus = target.sessionStatus === 'CHARGING' ? 'COMPLETED' : 'CHARGING';
  saveAllBookings(all);
  updateTicketView(target);
  if (navState.trip) {
    renderTripSummary(navState.trip);
  }
  showToast(
    target.sessionStatus === 'CHARGING'
      ? `Charger #${target.bayNumber} unlocked with PIN ${target.unlockPin}`
      : 'Charging Done ✓ — Future re-routes will go directly to destination'
  );
});

function cancelBookingById(id) {
  playTapSound();
  const updated = readAllBookings().filter((b) => b.id !== id);
  saveAllBookings(updated);

  if (navState.activeBookingId === id) {
    navState.activeBookingId = null;
    dom.confirmedTicketBox.style.display = 'none';
    dom.bookingFormBody.style.display = 'block';
    dom.bookingStateBadge.textContent = navState.selectedStation ? 'Verified' : 'No station';
    dom.bookingStateBadge.className = navState.selectedStation ? 'pill-badge' : 'pill-badge unavailable';
  }

  checkSlotAvailability();
  showToast('Booking cancelled');
}

dom.inputBookingDate.addEventListener('change', checkSlotAvailability);
dom.selectBookingTime.addEventListener('change', checkSlotAvailability);

dom.btnConfirmSlot.addEventListener('click', confirmSlotBooking);

dom.btnChangeSlot.addEventListener('click', () => {
  playTapSound();
  dom.selectBookingTime.focus();
  showToast('Choose another available time slot');
});

dom.btnSkipBooking.addEventListener('click', () => {
  playTapSound();
  navState.skippedBooking = true;
  dom.bookingFormBody.style.display = 'none';
  dom.confirmedTicketBox.style.display = 'none';
  dom.skippedBookingBox.style.display = 'block';
  dom.bookingStateBadge.textContent = 'Skipped';
  dom.bookingStateBadge.className = 'pill-badge neutral';
  showToast('Skipped charging slot booking');
});

dom.btnReopenBooking.addEventListener('click', () => {
  playTapSound();
  navState.skippedBooking = false;
  dom.skippedBookingBox.style.display = 'none';
  dom.bookingFormBody.style.display = 'block';
  checkSlotAvailability();
});

dom.btnModifyBooking.addEventListener('click', () => {
  playTapSound();
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

window.addEventListener('storage', (e) => {
  if (e.key === BOOKINGS_STORAGE_KEY) {
    checkSlotAvailability();
  }
});

// -------------------------------------------------------------------------
// 9. INITIALIZE PAGE
// -------------------------------------------------------------------------
loadActiveTrip();