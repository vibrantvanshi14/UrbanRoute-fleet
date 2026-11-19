    /* =========================================================================
       URBAN ROUTE FLEET — CLEAN VANILLA JS (ZERO DEMO DATA, ZERO EMOJIS)
       ========================================================================= */

    // -------------------------------------------------------------------------
    // 1. APPLICATION STATE (Starts completely empty)
    // -------------------------------------------------------------------------
    const state = {
      vehicle: {
        name: '',
        batteryPct: null,
        fullRangeKm: null,
        availableRangeKm: null,
        safetyReserveKm: null,
        safeUsableRangeKm: null
      },
      points: [
        { id: 'pt-start', type: 'start', query: '', lat: null, lon: null },
        { id: 'pt-end', type: 'end', query: '', lat: null, lon: null }
      ],
      routes: [],
      selectedRouteIndex: 0,
      mapLayer: 'satellite',
      pickTargetIndex: null,
      selectedCharger: null
    };

    let stopCounterId = 1;
    let toastTimer = null;

    // -------------------------------------------------------------------------
    // 2. DOM REFERENCES
    // -------------------------------------------------------------------------
    const dom = {
      mapEl: document.getElementById('map'),
      mapSubtitle: document.getElementById('mapSubtitle'),
      mapRangeReadout: document.getElementById('mapRangeReadout'),
      mapToast: document.getElementById('mapToast'),
      pickModeBanner: document.getElementById('pickModeBanner'),
      pickModeText: document.getElementById('pickModeText'),
      btnCancelPick: document.getElementById('btnCancelPick'),

      btnLocateMe: document.getElementById('btnLocateMe'),
      btnFitRoute: document.getElementById('btnFitRoute'),
      btnFindChargers: document.getElementById('btnFindChargers'),
      btnToolbarLayer: document.getElementById('btnToolbarLayer'),
      btnToggleLayer: document.getElementById('btnToggleLayer'),
      btnZoomIn: document.getElementById('btnZoomIn'),
      btnZoomOut: document.getElementById('btnZoomOut'),

      chargingStopCard: document.getElementById('chargingStopCard'),
      btnCloseChargerCard: document.getElementById('btnCloseChargerCard'),
      csStatus: document.getElementById('csStatus'),
      csName: document.getElementById('csName'),
      csChargers: document.getElementById('csChargers'),
      csSpeed: document.getElementById('csSpeed'),
      csChargeTime: document.getElementById('csChargeTime'),
      btnAddChargerAsStop: document.getElementById('btnAddChargerAsStop'),

      globalSearchInput: document.getElementById('globalSearchInput'),
      globalSearchDropdown: document.getElementById('globalSearchDropdown'),

      vehicleNameDisplay: document.getElementById('vehicleNameDisplay'),
      vehicleStatusBadge: document.getElementById('vehicleStatusBadge'),
      vehicleStatusText: document.getElementById('vehicleStatusText'),
      vehicleBatteryReadout: document.getElementById('vehicleBatteryReadout'),
      vehicleRangeReadout: document.getElementById('vehicleRangeReadout'),
      safeRangeReadout: document.getElementById('safeRangeReadout'),
      btnToggleVehicleEditor: document.getElementById('btnToggleVehicleEditor'),
      vehicleInputsPanel: document.getElementById('vehicleInputsPanel'),
      inputVehicleName: document.getElementById('inputVehicleName'),
      inputBatteryPct: document.getElementById('inputBatteryPct'),
      inputFullRange: document.getElementById('inputFullRange'),

      pointsList: document.getElementById('pointsList'),
      btnSwapOrder: document.getElementById('btnSwapOrder'),
      btnAddStop: document.getElementById('btnAddStop'),
      btnUpdateRoute: document.getElementById('btnUpdateRoute'),
      btnUpdateRouteText: document.getElementById('btnUpdateRouteText'),
      journeyFeedback: document.getElementById('journeyFeedback'),

      routesCount: document.getElementById('routesCount'),
      chargeAlertBanner: document.getElementById('chargeAlertBanner'),
      routesEmpty: document.getElementById('routesEmpty'),
      routesList: document.getElementById('routesList')
    };

    // -------------------------------------------------------------------------
    // 3. LEAFLET MAP INITIALIZATION (WORLDWIDE GOOGLE MAPS LAYERS)
    // -------------------------------------------------------------------------
    const map = L.map('map', {
      center: [20, 15],
      zoom: 2,
      zoomControl: false,
      worldCopyJump: true
    });

    // Google Satellite Hybrid (default)
    const googleSatelliteLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        attribution: 'Map data &copy; Google',
        maxZoom: 20
      }
    );

    // Google Streets (toggleable)
    const googleStreetsLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        attribution: 'Map data &copy; Google',
        maxZoom: 20
      }
    );

    googleSatelliteLayer.addTo(map);

    // Layer groups for clean map updates
    const routeLayerGroup = L.layerGroup().addTo(map);
    const pointMarkersGroup = L.layerGroup().addTo(map);
    const autoChargerGroup = L.layerGroup().addTo(map);
    const nearbyChargersGroup = L.layerGroup().addTo(map);
    const gpsMarkerGroup = L.layerGroup().addTo(map);

    // -------------------------------------------------------------------------
    // 4. HELPER UTILITIES
    // -------------------------------------------------------------------------
    function showToast(msg) {
      dom.mapToast.textContent = msg;
      dom.mapToast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        dom.mapToast.classList.remove('show');
      }, 3200);
    }

    function setJourneyFeedback(msg, isError = false) {
      if (!msg) {
        dom.journeyFeedback.textContent = '';
        dom.journeyFeedback.classList.remove('visible', 'error');
        return;
      }
      dom.journeyFeedback.textContent = msg;
      dom.journeyFeedback.classList.add('visible');
      dom.journeyFeedback.classList.toggle('error', isError);
    }

    function debounce(fn, delay = 350) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function formatDurationMinutes(totalMinutes) {
      const mins = Math.max(1, Math.round(totalMinutes));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return m + 'm';
      return h + 'h ' + String(m).padStart(2, '0') + 'm';
    }

    // Haversine distance in kilometers between two [lat, lon] points
    function haversineKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // -------------------------------------------------------------------------
    // 5. VEHICLE BATTERY & RANGE FORMULA (LIVE UPDATES)
    // -------------------------------------------------------------------------
    function recalculateVehicleRange() {
      const nameVal = dom.inputVehicleName.value.trim();
      const battVal = parseFloat(dom.inputBatteryPct.value);
      const fullVal = parseFloat(dom.inputFullRange.value);

      state.vehicle.name = nameVal;

      // Update vehicle name heading
      if (nameVal) {
        dom.vehicleNameDisplay.textContent = nameVal;
        dom.vehicleNameDisplay.classList.remove('muted');
      } else {
        dom.vehicleNameDisplay.textContent = 'No vehicle set';
        dom.vehicleNameDisplay.classList.add('muted');
      }

      const validBattery = !isNaN(battVal) && battVal >= 1 && battVal <= 100;
      const validRange = !isNaN(fullVal) && fullVal >= 1;

      if (validBattery && validRange) {
        // Core Range Formulas:
        // Available Range = (batteryPercent / 100) * fullRangeKm
        // Safety Reserve = 0.15 * fullRangeKm (15% safety margin)
        // Safe Usable Range = Math.max(0, availableRange - safetyReserve)
        const availableRange = (battVal / 100) * fullVal;
        const safetyReserve = 0.15 * fullVal;
        const safeUsableRange = Math.max(0, availableRange - safetyReserve);

        state.vehicle.batteryPct = battVal;
        state.vehicle.fullRangeKm = fullVal;
        state.vehicle.availableRangeKm = availableRange;
        state.vehicle.safetyReserveKm = safetyReserve;
        state.vehicle.safeUsableRangeKm = safeUsableRange;

        const availRounded = Math.round(availableRange);
        const safeRounded = Math.round(safeUsableRange);

        dom.vehicleBatteryReadout.textContent = Math.round(battVal) + '%';
        dom.vehicleRangeReadout.textContent = availRounded + ' km';
        dom.safeRangeReadout.textContent = safeRounded + ' km';
        dom.mapRangeReadout.textContent = availRounded + ' km \u00b7 ' + Math.round(battVal) + '%';

        dom.vehicleStatusBadge.classList.add('ready');
        dom.vehicleStatusText.textContent = 'Ready to plan';
      } else {
        state.vehicle.batteryPct = validBattery ? battVal : null;
        state.vehicle.fullRangeKm = validRange ? fullVal : null;
        state.vehicle.availableRangeKm = null;
        state.vehicle.safetyReserveKm = null;
        state.vehicle.safeUsableRangeKm = null;

        dom.vehicleBatteryReadout.textContent = validBattery ? Math.round(battVal) + '%' : '--%';
        dom.vehicleRangeReadout.textContent = '-- km';
        dom.safeRangeReadout.textContent = '-- km';
        dom.mapRangeReadout.textContent = '-- km \u00b7 ' + (validBattery ? Math.round(battVal) + '%' : '--%');

        dom.vehicleStatusBadge.classList.remove('ready');
        dom.vehicleStatusText.textContent = 'Enter battery & range';
      }
    }

    dom.inputVehicleName.addEventListener('input', recalculateVehicleRange);
    dom.inputBatteryPct.addEventListener('input', recalculateVehicleRange);
    dom.inputFullRange.addEventListener('input', recalculateVehicleRange);

    dom.btnToggleVehicleEditor.addEventListener('click', () => {
      dom.vehicleInputsPanel.classList.toggle('collapsed');
      if (!dom.vehicleInputsPanel.classList.contains('collapsed')) {
        dom.inputVehicleName.focus();
      }
    });

    // -------------------------------------------------------------------------
    // 6. WORLDWIDE PLACE SEARCH (NOMINATIM + KOMOOT PHOTON)
    // -------------------------------------------------------------------------
    async function searchWorldwidePlaces(query) {
      const q = (query || '').trim();
      if (q.length < 2) return [];

      const encoded = encodeURIComponent(q);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encoded}`;
      const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&limit=5`;

      const [nomRes, phoRes] = await Promise.allSettled([
        fetch(nominatimUrl, { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(photonUrl, { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : { features: [] })
      ]);

      const combined = [];
      const seenKeys = new Set();

      // Parse Photon results (great for small streets, shops, POIs worldwide)
      if (phoRes.status === 'fulfilled' && phoRes.value && Array.isArray(phoRes.value.features)) {
        phoRes.value.features.forEach(feat => {
          const coords = feat.geometry && feat.geometry.coordinates;
          const p = feat.properties || {};
          if (!coords || coords.length < 2) return;
          const lon = parseFloat(coords[0]);
          const lat = parseFloat(coords[1]);
          const title = p.name || p.street || p.city || 'Location';
          const subParts = [p.street, p.district, p.city, p.state, p.country].filter(Boolean);
          const sub = subParts.filter(s => s !== title).slice(0, 3).join(', ');
          const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            combined.push({
              title,
              sub,
              shortLabel: sub ? `${title}, ${sub.split(',')[0].trim()}` : title,
              lat,
              lon
            });
          }
        });
      }

      // Parse Nominatim results
      if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
        nomRes.value.forEach(item => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const parts = (item.display_name || '').split(',').map(s => s.trim());
          const title = parts[0] || 'Location';
          const sub = parts.slice(1, 4).join(', ');
          const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            combined.push({
              title,
              sub,
              shortLabel: parts.slice(0, 2).join(', '),
              lat,
              lon
            });
          }
        });
      }

      return combined.slice(0, 6);
    }

    async function reverseGeocode(lat, lon) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',').map(s => s.trim());
            return parts.slice(0, 3).join(', ');
          }
        }
      } catch {
        // Fallback to coordinate string
      }
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    // -------------------------------------------------------------------------
    // 7. TOP GLOBAL SEARCH BAR
    // -------------------------------------------------------------------------
    const handleGlobalSearch = debounce(async () => {
      const q = dom.globalSearchInput.value.trim();
      if (q.length < 2) {
        dom.globalSearchDropdown.classList.remove('open');
        dom.globalSearchDropdown.innerHTML = '';
        return;
      }

      try {
        const results = await searchWorldwidePlaces(q);
        dom.globalSearchDropdown.innerHTML = '';

        if (!results.length) {
          dom.globalSearchDropdown.innerHTML = '<div class="ac-item"><div class="ac-sub">No matching places found.</div></div>';
          dom.globalSearchDropdown.classList.add('open');
          return;
        }

        results.forEach(item => {
          const row = document.createElement('div');
          row.className = 'ac-item';
          row.innerHTML = `
            <div class="ac-title">${escapeHtml(item.title)}</div>
            <div class="ac-sub">${escapeHtml(item.sub)}</div>
            <div class="ac-actions">
              <button type="button" class="ac-chip" data-role="start">Set Start</button>
              <button type="button" class="ac-chip" data-role="stop">Add Stop</button>
              <button type="button" class="ac-chip" data-role="end">Set Destination</button>
            </div>
          `;

          row.addEventListener('click', (e) => {
            if (e.target.closest('.ac-chip')) return;
            map.flyTo([item.lat, item.lon], 14, { duration: 1 });
            dom.globalSearchDropdown.classList.remove('open');
            showToast('Focused on ' + item.title);
          });

          row.querySelectorAll('.ac-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              applyPlaceToJourney(btn.getAttribute('data-role'), item.shortLabel, item.lat, item.lon);
              dom.globalSearchDropdown.classList.remove('open');
              dom.globalSearchInput.value = '';
              map.flyTo([item.lat, item.lon], 13, { duration: 1 });
            });
          });

          dom.globalSearchDropdown.appendChild(row);
        });

        dom.globalSearchDropdown.classList.add('open');
      } catch {
        dom.globalSearchDropdown.classList.remove('open');
      }
    }, 350);

    dom.globalSearchInput.addEventListener('input', handleGlobalSearch);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar-wrap')) {
        dom.globalSearchDropdown.classList.remove('open');
      }
      if (!e.target.closest('.point-input-wrap')) {
        document.querySelectorAll('.point-input-wrap .autocomplete-dropdown').forEach(el => {
          el.classList.remove('open');
        });
      }
    });

    function applyPlaceToJourney(role, label, lat, lon) {
      if (role === 'start') {
        state.points[0].query = label;
        state.points[0].lat = lat;
        state.points[0].lon = lon;
      } else if (role === 'end') {
        const last = state.points[state.points.length - 1];
        last.query = label;
        last.lat = lat;
        last.lon = lon;
      } else if (role === 'stop') {
        state.points.splice(state.points.length - 1, 0, {
          id: 'pt-stop-' + stopCounterId++,
          type: 'stop',
          query: label,
          lat,
          lon
        });
      }
      renderJourneyPoints();
      updatePointMarkersAndSubtitle();
      showToast('Updated ' + (role === 'end' ? 'destination' : role) + ': ' + label);
    }

    // -------------------------------------------------------------------------
    // 8. JOURNEY POINTS UI, AUTOCOMPLETE & PICK-ON-MAP
    // -------------------------------------------------------------------------
    function renderJourneyPoints() {
      dom.pointsList.innerHTML = '';
      let stopNum = 1;

      state.points.forEach((pt, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === state.points.length - 1;
        const row = document.createElement('div');
        row.className = 'point-row';

        // Left circle badge
        const badge = document.createElement('div');
        if (isStart) {
          badge.className = 'point-badge start';
          badge.title = 'Start location';
        } else if (isEnd) {
          badge.className = 'point-badge end';
          badge.title = 'Destination';
        } else {
          badge.className = 'point-badge stop';
          badge.title = 'Stop ' + stopNum;
          badge.textContent = String(stopNum++);
        }

        // Input + Autocomplete
        const inputWrap = document.createElement('div');
        inputWrap.className = 'point-input-wrap';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'point-input';
        input.autocomplete = 'off';
        input.value = pt.query;
        input.placeholder = isStart ? 'Start location' : isEnd ? 'Destination' : 'Stop location';

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        const debouncedSearch = debounce(async () => {
          const q = input.value.trim();
          if (q.length < 2) {
            dropdown.classList.remove('open');
            return;
          }
          try {
            const results = await searchWorldwidePlaces(q);
            dropdown.innerHTML = '';
            if (!results.length) {
              dropdown.innerHTML = '<div class="ac-item"><div class="ac-sub">No results found</div></div>';
            } else {
              results.forEach(res => {
                const item = document.createElement('div');
                item.className = 'ac-item';
                item.innerHTML = `
                  <div class="ac-title">${escapeHtml(res.title)}</div>
                  <div class="ac-sub">${escapeHtml(res.sub)}</div>
                `;
                item.addEventListener('click', () => {
                  pt.query = res.shortLabel;
                  pt.lat = res.lat;
                  pt.lon = res.lon;
                  input.value = res.shortLabel;
                  dropdown.classList.remove('open');
                  updatePointMarkersAndSubtitle();
                  map.flyTo([res.lat, res.lon], 13, { duration: 0.9 });
                });
                dropdown.appendChild(item);
              });
            }
            dropdown.classList.add('open');
          } catch {
            dropdown.classList.remove('open');
          }
        }, 350);

        input.addEventListener('input', () => {
          pt.query = input.value;
          pt.lat = null;
          pt.lon = null;
          debouncedSearch();
        });

        inputWrap.appendChild(input);
        inputWrap.appendChild(dropdown);

        // Right action buttons
        const actions = document.createElement('div');
        actions.className = 'point-actions';

        // GPS button on Start point
        if (isStart) {
          const gpsBtn = document.createElement('button');
          gpsBtn.type = 'button';
          gpsBtn.className = 'point-icon-btn gps';
          gpsBtn.title = 'Use my GPS location';
          gpsBtn.setAttribute('aria-label', 'Use GPS location');
          gpsBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
              <circle cx="12" cy="12" r="7"></circle>
            </svg>
          `;
          gpsBtn.addEventListener('click', () => fillStartWithGPS(pt, input));
          actions.appendChild(gpsBtn);
        }

        // Pick-on-Map Pin button on every point
        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'point-icon-btn' + (state.pickTargetIndex === idx ? ' picking' : '');
        pickBtn.title = 'Pick this point on map';
        pickBtn.setAttribute('aria-label', 'Pick on map');
        pickBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        `;
        pickBtn.addEventListener('click', () => togglePickOnMap(idx));
        actions.appendChild(pickBtn);

        // Remove button on intermediate stops
        if (!isStart && !isEnd) {
          const remBtn = document.createElement('button');
          remBtn.type = 'button';
          remBtn.className = 'point-icon-btn remove';
          remBtn.title = 'Remove stop';
          remBtn.setAttribute('aria-label', 'Remove stop');
          remBtn.innerHTML = '&times;';
          remBtn.addEventListener('click', () => {
            if (state.pickTargetIndex === idx) cancelPickOnMap();
            state.points.splice(idx, 1);
            renderJourneyPoints();
            updatePointMarkersAndSubtitle();
          });
          actions.appendChild(remBtn);
        }

        row.appendChild(badge);
        row.appendChild(inputWrap);
        row.appendChild(actions);
        dom.pointsList.appendChild(row);
      });
    }

    function togglePickOnMap(idx) {
      if (state.pickTargetIndex === idx) {
        cancelPickOnMap();
        return;
      }
      state.pickTargetIndex = idx;
      const roleLabel =
        idx === 0 ? 'Start location' : idx === state.points.length - 1 ? 'Destination' : 'Stop ' + idx;
      dom.pickModeText.textContent = 'Click anywhere on the map to set ' + roleLabel;
      dom.pickModeBanner.classList.add('visible');
      dom.mapEl.classList.add('pick-mode');
      renderJourneyPoints();
    }

    function cancelPickOnMap() {
      state.pickTargetIndex = null;
      dom.pickModeBanner.classList.remove('visible');
      dom.mapEl.classList.remove('pick-mode');
      renderJourneyPoints();
    }

    dom.btnCancelPick.addEventListener('click', cancelPickOnMap);

    // Handle clicking on the map during Pick-on-Map mode
    map.on('click', async (e) => {
      if (state.pickTargetIndex === null) return;
      const idx = state.pickTargetIndex;
      const pt = state.points[idx];
      if (!pt) {
        cancelPickOnMap();
        return;
      }

      const { lat, lng } = e.latlng;
      pt.lat = lat;
      pt.lon = lng;
      pt.query = 'Loading address...';
      cancelPickOnMap();
      renderJourneyPoints();
      updatePointMarkersAndSubtitle();

      const label = await reverseGeocode(lat, lng);
      pt.query = label;
      renderJourneyPoints();
      updatePointMarkersAndSubtitle();
      showToast('Location selected: ' + label);
    });

    function fillStartWithGPS(pt, inputEl) {
      if (!navigator.geolocation) {
        setJourneyFeedback('Geolocation is not supported in this browser.', true);
        return;
      }
      setJourneyFeedback('Getting your current GPS location...');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          pt.lat = latitude;
          pt.lon = longitude;
          const label = await reverseGeocode(latitude, longitude);
          pt.query = label;
          inputEl.value = label;
          setJourneyFeedback('');
          updatePointMarkersAndSubtitle();
          map.flyTo([latitude, longitude], 14, { duration: 1 });
          showToast('Start set to your GPS location');
        },
        () => {
          setJourneyFeedback('Unable to read GPS location. Please allow location permission.', true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    dom.btnAddStop.addEventListener('click', () => {
      state.points.splice(state.points.length - 1, 0, {
        id: 'pt-stop-' + stopCounterId++,
        type: 'stop',
        query: '',
        lat: null,
        lon: null
      });
      renderJourneyPoints();
    });

    dom.btnSwapOrder.addEventListener('click', () => {
      cancelPickOnMap();
      state.points.reverse();
      state.points.forEach((pt, idx) => {
        pt.type = idx === 0 ? 'start' : idx === state.points.length - 1 ? 'end' : 'stop';
      });
      renderJourneyPoints();
      updatePointMarkersAndSubtitle();
      if (state.routes.length > 0) {
        calculateRoutes();
      }
    });

    // -------------------------------------------------------------------------
    // 9. POINT MARKERS & MAP SUBTITLE
    // -------------------------------------------------------------------------
    function updatePointMarkersAndSubtitle() {
      pointMarkersGroup.clearLayers();
      const valid = state.points.filter(p => p.lat !== null && p.lon !== null);
      dom.mapSubtitle.textContent = valid.length + ' point' + (valid.length === 1 ? '' : 's') + ' \u00b7 EV optimized';

      let stopNum = 1;
      state.points.forEach((pt, idx) => {
        if (pt.lat === null || pt.lon === null) return;

        let html;
        let size = [34, 34];

        if (idx === 0) {
          html = `
            <div class="urf-marker-start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#c8f169">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
            </div>
          `;
        } else if (idx === state.points.length - 1) {
          html = `
            <div class="urf-marker-end">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `;
        } else {
          size = [28, 28];
          html = `<div class="urf-marker-stop">${stopNum++}</div>`;
        }

        const icon = L.divIcon({
          className: '',
          html,
          iconSize: size,
          iconAnchor: [size[0] / 2, size[1] / 2]
        });

        L.marker([pt.lat, pt.lon], { icon })
          .bindTooltip(pt.query || 'Journey point', { direction: 'top', offset: [0, -14] })
          .addTo(pointMarkersGroup);
      });
    }

    // -------------------------------------------------------------------------
    // 10. OSRM ROUTING, AUTO CHARGING STOP INSERTION & TRAFFIC ESTIMATION
    // -------------------------------------------------------------------------

    // Helper: Walk along GeoJSON coordinates [lon, lat] to find coordinate at targetKm
    function findPointAtDistanceKm(coords, targetKm) {
      if (!coords || coords.length === 0) return null;
      let covered = 0;
      for (let i = 1; i < coords.length; i++) {
        const [lon1, lat1] = coords[i - 1];
        const [lon2, lat2] = coords[i];
        const seg = haversineKm(lat1, lon1, lat2, lon2);
        if (covered + seg >= targetKm) {
          const ratio = seg > 0 ? (targetKm - covered) / seg : 0;
          return {
            lat: lat1 + (lat2 - lat1) * ratio,
            lon: lon1 + (lon2 - lon1) * ratio
          };
        }
        covered += seg;
      }
      const last = coords[coords.length - 1];
      return { lat: last[1], lon: last[0] };
    }

    // Helper: Fetch with a strict timeout so slow servers never hang the app
async function fetchWithTimeout(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('Request failed');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Fast Charger Lookup: Parallel Overpass race + 3.5s max wait + instant fallback
async function findNearestChargingStation(lat, lon) {
  const query = `[out:json][timeout:4];node["amenity"="charging_station"](around:18000,${lat},${lon});out body 10;`;
  const encoded = encodeURIComponent(query);
  const urls = [
    `https://overpass-api.de/api/interpreter?data=${encoded}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encoded}`
  ];

  try {
    // Race both Overpass servers in parallel; take whichever responds first with stations
    const data = await Promise.any(
      urls.map(async (url) => {
        const json = await fetchWithTimeout(url, 3500);
        if (!json || !Array.isArray(json.elements) || json.elements.length === 0) {
          throw new Error('No stations');
        }
        return json;
      })
    );

    let best = null;
    let bestDist = Infinity;
    data.elements.forEach((el) => {
      const d = haversineKm(lat, lon, el.lat, el.lon);
      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    });

    if (best) {
      const tags = best.tags || {};
      const speedRaw =
        tags['socket:ccs:output'] ||
        tags['socket:type2:output'] ||
        tags.maxpower ||
        tags.output ||
        '50 kW';
      return {
        name: tags.name || tags.operator || 'EV Charging Station',
        lat: best.lat,
        lon: best.lon,
        chargers: tags.capacity || tags['socket:ccs'] || tags['socket:type2'] || '4',
        speed: speedRaw,
        status: tags.access === 'private' ? 'Private' : 'Available',
        chargeMinutes: 25,
        isAutoInserted: true
      };
    }
  } catch {
    // Timed out or no mapped charger within 18 km — fall back instantly
  }

  // Instant fallback (no extra Nominatim network wait)
  return {
    name: 'Recommended EV Charge Stop',
    lat,
    lon,
    chargers: '2',
    speed: '50 kW',
    status: 'Suggested',
    chargeMinutes: 25,
    isAutoInserted: true
  };
}

    // Helper: Fetch routes from OSRM public API
    async function fetchOsrmRoutes(waypoints) {
      const coordStr = waypoints.map(p => `${p.lon},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&alternatives=true&steps=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Routing service is temporarily unavailable.');
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
        throw new Error('No drivable route found between these points.');
      }
      return data.routes;
    }

    // Traffic & Travel Time Estimation using current local hour + average road speed
    function estimateTraffic(distanceKm, baseDurationSec) {
      const hour = new Date().getHours();
      const isRushHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21);
      const avgSpeedKmh = baseDurationSec > 0 ? (distanceKm / (baseDurationSec / 3600)) : 40;

      let level = 'Low traffic';
      let cssClass = 'traffic-low';
      let multiplier = 1.05;

      if (isRushHour && avgSpeedKmh < 42) {
        level = 'Heavy traffic';
        cssClass = 'traffic-heavy';
        multiplier = 1.38;
      } else if (isRushHour || avgSpeedKmh < 32) {
        level = 'Moderate traffic';
        cssClass = 'traffic-mod';
        multiplier = 1.2;
      }

      const baseMins = baseDurationSec / 60;
      const trafficAdjustedDriveMins = baseMins * multiplier;
      const delayMins = Math.max(0, Math.round(trafficAdjustedDriveMins - baseMins));

      return {
        level,
        cssClass,
        driveWithTrafficMins: trafficAdjustedDriveMins,
        delayMins
      };
    }

    // Main Route Calculation Workflow
    async function calculateRoutes() {
      setJourneyFeedback('');
      dom.chargeAlertBanner.classList.remove('visible', 'ok', 'charge-needed');
      autoChargerGroup.clearLayers();
      closeChargingStopCard();

      const startPt = state.points[0];
      const endPt = state.points[state.points.length - 1];

      if (!startPt.query.trim() || !endPt.query.trim()) {
        setJourneyFeedback('Please enter both a start location and a destination.', true);
        return;
      }

      dom.btnUpdateRoute.disabled = true;
      dom.btnUpdateRouteText.textContent = 'Calculating...';

      try {
        // Resolve any typed locations without coordinates
        const activePoints = [];
        for (let i = 0; i < state.points.length; i++) {
          const pt = state.points[i];
          if (!pt.query.trim()) continue;
          if (pt.lat === null || pt.lon === null) {
            const found = await searchWorldwidePlaces(pt.query);
            if (!found.length) {
              throw new Error('Could not find "' + pt.query + '". Try selecting from the dropdown.');
            }
            pt.lat = found[0].lat;
            pt.lon = found[0].lon;
            pt.query = found[0].shortLabel;
          }
          activePoints.push(pt);
        }

        if (activePoints.length < 2) {
          throw new Error('Please provide at least a start location and destination.');
        }

        renderJourneyPoints();
        updatePointMarkersAndSubtitle();

        // 1. Fetch initial OSRM routes
        let osrmRoutes = await fetchOsrmRoutes(activePoints);
        const primaryRoute = osrmRoutes[0];
        const primaryDistKm = primaryRoute.distance / 1000;

        const hasVehicleData =
          state.vehicle.batteryPct !== null &&
          state.vehicle.fullRangeKm !== null &&
          state.vehicle.safeUsableRangeKm !== null;

        let insertedCharger = null;
        let finalOsrmRoutes = osrmRoutes;
        let chargeStopsCount = 0;

        // 2. Check if trip exceeds Safe Usable Range (15% safety reserve)
        if (hasVehicleData && primaryDistKm > state.vehicle.safeUsableRangeKm) {
          setJourneyFeedback('Trip exceeds safe usable range. Locating charging station along route...');

          // Walk along route coordinates to ~80% of Safe Usable Range (or minimum 15% of route if battery is already very low)
          const triggerDistanceKm = Math.max(
            Math.min(primaryDistKm * 0.25, 10),
            state.vehicle.safeUsableRangeKm * 0.8
          );
          const targetCoord = findPointAtDistanceKm(
            primaryRoute.geometry.coordinates,
            Math.min(triggerDistanceKm, primaryDistKm * 0.85)
          );

          if (targetCoord) {
            insertedCharger = await findNearestChargingStation(targetCoord.lat, targetCoord.lon);

            // Insert charging stop before destination and re-route via OSRM
            const waypointsWithCharger = [
              ...activePoints.slice(0, activePoints.length - 1),
              { lat: insertedCharger.lat, lon: insertedCharger.lon },
              activePoints[activePoints.length - 1]
            ];

            try {
              finalOsrmRoutes = await fetchOsrmRoutes(waypointsWithCharger);
            } catch {
              // Keep original route if re-routing through waypoint fails
            }
          }
        }

        // 3. Build formatted route options with traffic & arrival battery
        const labels = ['Fastest route', 'Most efficient', 'Scenic / Alternate'];
        state.routes = finalOsrmRoutes.map((r, idx) => {
          const distKm = r.distance / 1000;
          const traffic = estimateTraffic(distKm, r.duration);

          let charges = 0;
          let chargeTimeMins = 0;
          let arrivalPctText = '--% arrival';

          if (hasVehicleData) {
            const fullKm = state.vehicle.fullRangeKm;
            const startBatt = state.vehicle.batteryPct;
            const battUsedTotalPct = (distKm / fullKm) * 100;

            if (distKm <= state.vehicle.safeUsableRangeKm) {
              charges = 0;
              chargeTimeMins = 0;
              const arrPct = Math.max(15, Math.round(startBatt - battUsedTotalPct));
              arrivalPctText = arrPct + '% arrival';
            } else {
              // Calculate how many ~65% fast-charge sessions (20% -> 85%) are needed
              const usableFirstLeg = Math.max(0, startBatt - 15);
              const deficitPct = Math.max(0, battUsedTotalPct - usableFirstLeg);
              charges = Math.max(1, Math.ceil(deficitPct / 65));
              chargeTimeMins = charges * 25;
              const totalEnergyPct = startBatt + charges * 65;
              const arrPct = Math.max(15, Math.min(85, Math.round(totalEnergyPct - battUsedTotalPct)));
              arrivalPctText = arrPct + '% arrival';
            }
          }

          if (idx === 0) chargeStopsCount = charges;

          return {
            name: labels[idx] || 'Route option ' + (idx + 1),
            distanceKm: distKm,
            durationSec: r.duration,
            totalMinutes: traffic.driveWithTrafficMins + chargeTimeMins,
            traffic,
            charges,
            chargeTimeMins,
            arrivalPctText,
            geometry: r.geometry,
            insertedCharger: charges > 0 ? insertedCharger : null
          };
        });

        state.selectedRouteIndex = 0;
        setJourneyFeedback('');
        renderRouteOptions();
        drawRoutesOnMap(true);

        // 4. Show battery / charging summary banner
        if (hasVehicleData) {
          const selected = state.routes[0];
          if (selected.charges === 0) {
            dom.chargeAlertBanner.className = 'charge-alert-banner visible ok';
            dom.chargeAlertBanner.textContent =
              'No charging stop needed. Trip (' +
              selected.distanceKm.toFixed(1) +
              ' km) fits within your safe usable range of ' +
              Math.round(state.vehicle.safeUsableRangeKm) +
              ' km.';
          } else {
            dom.chargeAlertBanner.className = 'charge-alert-banner visible charge-needed';
            dom.chargeAlertBanner.textContent =
              'Charging stop inserted automatically (' +
              (insertedCharger ? insertedCharger.name : 'EV Station') +
              ') before battery drops below your 15% safety reserve. Estimated charging time: ' +
              selected.chargeTimeMins +
              ' min.';
          }
        }

        // If an auto-inserted charging stop was added, place marker & open card
        if (insertedCharger && chargeStopsCount > 0) {
          renderAutoInsertedChargerMarker(insertedCharger);
          openChargingStopCard(insertedCharger, false);
        }

        showToast('Calculated ' + state.routes.length + ' route option' + (state.routes.length > 1 ? 's' : ''));
      } catch (err) {
        setJourneyFeedback(err.message || 'Failed to calculate route.', true);
      } finally {
        dom.btnUpdateRoute.disabled = false;
        dom.btnUpdateRouteText.textContent = 'Update route';
      }
    }

    function renderAutoInsertedChargerMarker(charger) {
      autoChargerGroup.clearLayers();
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="urf-marker-charger" title="${escapeHtml(charger.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([charger.lat, charger.lon], { icon })
        .on('click', () => openChargingStopCard(charger, false))
        .addTo(autoChargerGroup);
    }

    function renderRouteOptions() {
      const count = state.routes.length;
      dom.routesCount.textContent = count + ' available';

      if (count === 0) {
        dom.routesEmpty.style.display = 'block';
        dom.routesList.innerHTML = '';
        return;
      }

      dom.routesEmpty.style.display = 'none';
      dom.routesList.innerHTML = '';

      state.routes.forEach((route, idx) => {
        const isSelected = idx === state.selectedRouteIndex;
        const distText = route.distanceKm < 10
          ? route.distanceKm.toFixed(1) + ' km'
          : Math.round(route.distanceKm) + ' km';
        const chargeText = route.charges === 1 ? '1 charge' : route.charges + ' charges';

        const card = document.createElement('div');
        card.className = 'route-card' + (isSelected ? ' selected' : '');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        card.innerHTML = `
          <div class="route-card-top">
            <span class="route-card-name">${escapeHtml(route.name)}</span>
            <span class="route-duration-pill">${formatDurationMinutes(route.totalMinutes)}</span>
          </div>
          <div class="route-card-meta">
            <span class="route-meta-item">${distText}</span>
            <span class="route-meta-item">${chargeText}</span>
            <span class="traffic-pill ${route.traffic.cssClass}">${route.traffic.level}</span>
            <span class="route-meta-item">${escapeHtml(route.arrivalPctText)}</span>
          </div>
        `;

        const selectRoute = () => {
          state.selectedRouteIndex = idx;
          renderRouteOptions();
          drawRoutesOnMap(true);
        };

        card.addEventListener('click', selectRoute);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectRoute();
          }
        });

        dom.routesList.appendChild(card);
      });
    }

    function drawRoutesOnMap(fitBounds = false) {
      routeLayerGroup.clearLayers();
      if (!state.routes.length) return;

      // Draw unselected alternatives subtly
      state.routes.forEach((r, idx) => {
        if (idx === state.selectedRouteIndex) return;
        const latlngs = r.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        L.polyline(latlngs, {
          color: '#ffffff',
          weight: 4,
          opacity: 0.4,
          dashArray: '6, 8'
        }).addTo(routeLayerGroup);
      });

      // Draw active route: soft dark outer stroke + luminous lime-green core
      const active = state.routes[state.selectedRouteIndex];
      const latlngs = active.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

      L.polyline(latlngs, {
        color: '#153324',
        weight: 9,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayerGroup);

      const mainLine = L.polyline(latlngs, {
        color: '#c8f169',
        weight: 5,
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayerGroup);

      if (fitBounds) {
        map.fitBounds(mainLine.getBounds(), { padding: [70, 70] });
      }
    }

    dom.btnUpdateRoute.addEventListener('click', calculateRoutes);

    // -------------------------------------------------------------------------
    // 11. FLOATING CHARGING STOP CARD & NEARBY CHARGER SEARCH
    // -------------------------------------------------------------------------
    function openChargingStopCard(charger, allowManualAdd = true) {
      state.selectedCharger = charger;
      dom.csName.textContent = charger.name || 'Charging Station';
      dom.csStatus.textContent = charger.status || 'Available';
      dom.csChargers.textContent = String(charger.chargers || 'N/A');
      dom.csSpeed.textContent = String(charger.speed || '50 kW');
      dom.csChargeTime.textContent = (charger.chargeMinutes || 22) + ' min';
      dom.btnAddChargerAsStop.style.display = allowManualAdd ? 'block' : 'none';
      dom.chargingStopCard.classList.add('visible');
    }

    function closeChargingStopCard() {
      dom.chargingStopCard.classList.remove('visible');
      state.selectedCharger = null;
    }

    dom.btnCloseChargerCard.addEventListener('click', closeChargingStopCard);

    dom.btnAddChargerAsStop.addEventListener('click', () => {
      if (!state.selectedCharger) return;
      const c = state.selectedCharger;
      applyPlaceToJourney('stop', c.name, c.lat, c.lon);
      closeChargingStopCard();
    });

    async function findNearbyChargersInView() {
      if (map.getZoom() < 10) {
        showToast('Zoom in closer to search for nearby EV chargers.');
        return;
      }

      dom.btnFindChargers.classList.add('loading');
      showToast('Searching for EV charging stations in this area...');

      const b = map.getBounds();
      const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
      const query = `[out:json][timeout:12];node["amenity"="charging_station"](${bbox});out body 40;`;
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let elements = [];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${ep}?data=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.elements)) {
              elements = data.elements;
              break;
            }
          }
        } catch {
          // Try next endpoint
        }
      }

      dom.btnFindChargers.classList.remove('loading');
      nearbyChargersGroup.clearLayers();

      if (!elements.length) {
        showToast('No EV charging stations found in the current map view.');
        return;
      }

      elements.forEach(node => {
        const tags = node.tags || {};
        const charger = {
          lat: node.lat,
          lon: node.lon,
          name: tags.name || tags.operator || 'EV Charging Station',
          chargers: tags.capacity || tags['socket:ccs'] || tags['socket:type2'] || 'N/A',
          speed: tags['socket:ccs:output'] || tags['socket:type2:output'] || tags.maxpower || '50 kW',
          status: tags.access === 'private' ? 'Private' : 'Available',
          chargeMinutes: 22
        };

        const icon = L.divIcon({
          className: '',
          html: `
            <div class="urf-marker-charger" title="${escapeHtml(charger.name)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([node.lat, node.lon], { icon })
          .on('click', () => openChargingStopCard(charger, true))
          .addTo(nearbyChargersGroup);
      });

      showToast('Found ' + elements.length + ' EV charging station' + (elements.length === 1 ? '' : 's'));
    }

    // -------------------------------------------------------------------------
    // 12. MAP TOOLBAR & ZOOM CONTROLS
    // -------------------------------------------------------------------------
    function toggleMapLayer() {
      if (state.mapLayer === 'satellite') {
        map.removeLayer(googleSatelliteLayer);
        googleStreetsLayer.addTo(map);
        state.mapLayer = 'streets';
        showToast('Switched to Google Streets map');
      } else {
        map.removeLayer(googleStreetsLayer);
        googleSatelliteLayer.addTo(map);
        state.mapLayer = 'satellite';
        showToast('Switched to Google Satellite Hybrid');
      }
    }

    dom.btnLocateMe.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported in this browser.');
        return;
      }
      showToast('Locating your GPS position...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          gpsMarkerGroup.clearLayers();
          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#c8f169',
            color: '#153324',
            weight: 3,
            fillOpacity: 1
          }).addTo(gpsMarkerGroup);
          map.flyTo([latitude, longitude], 14, { duration: 1 });
          showToast('Centered on your current location');
        },
        () => {
          showToast('Location permission denied or unavailable.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    dom.btnFitRoute.addEventListener('click', () => {
      if (state.routes.length > 0) {
        drawRoutesOnMap(true);
      } else {
        showToast('Calculate a route first to fit map bounds.');
      }
    });

    dom.btnFindChargers.addEventListener('click', findNearbyChargersInView);
    dom.btnToolbarLayer.addEventListener('click', toggleMapLayer);
    dom.btnToggleLayer.addEventListener('click', toggleMapLayer);
    dom.btnZoomIn.addEventListener('click', () => map.zoomIn());
    dom.btnZoomOut.addEventListener('click', () => map.zoomOut());

    // -------------------------------------------------------------------------
    // 13. INITIAL RENDER (COMPLETELY EMPTY, ZERO DEMO DATA)
    // -------------------------------------------------------------------------
// -------------------------------------------------------------------------
    // 13. LOAD SAVED DATA FROM ev_data.html + INITIAL RENDER
    // -------------------------------------------------------------------------
    async function loadSavedEvSetup() {
      const raw = localStorage.getItem('evSetupData');
      if (!raw) return;

      try {
        const saved = JSON.parse(raw);

        if (saved.vehicleName) {
          dom.inputVehicleName.value = saved.vehicleName;
        }

        if (typeof saved.batteryPercent === 'number' && !isNaN(saved.batteryPercent)) {
          dom.inputBatteryPct.value = saved.batteryPercent;
        }

        // ev_data.html asks for remaining range (km); convert to 100% full range
        // so route_planner's battery formula matches your exact remaining range
        if (typeof saved.rangeKm === 'number' && !isNaN(saved.rangeKm)) {
          const batt = saved.batteryPercent > 0 ? saved.batteryPercent : 100;
          dom.inputFullRange.value = Math.round((saved.rangeKm / batt) * 100);
        }

        recalculateVehicleRange();

        // Pre-fill Start location from GPS detected in ev_data.html
        if (saved.location && saved.location.latitude && saved.location.longitude) {
          const { latitude, longitude } = saved.location;
          state.points[0].lat = latitude;
          state.points[0].lon = longitude;
          state.points[0].query = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          renderJourneyPoints();
          updatePointMarkersAndSubtitle();
          map.flyTo([latitude, longitude], 14, { duration: 1 });

          const address = await reverseGeocode(latitude, longitude);
          state.points[0].query = address;
          renderJourneyPoints();
          updatePointMarkersAndSubtitle();
        }
      } catch (err) {
        console.error('Could not load saved EV setup:', err);
      }
    }

    recalculateVehicleRange();
    renderJourneyPoints();
    updatePointMarkersAndSubtitle();
    renderRouteOptions();
    loadSavedEvSetup();

document.addEventListener("DOMContentLoaded", () => {
  // Select all local anchor links (exclude external links or anchors like #id)
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      // 1. Prevent the default instant page jump
      e.preventDefault();
      const targetUrl = link.href;

      // 2. Add the fade-out class to trigger the CSS animation
      document.body.classList.add("fade-out");

      // 3. Wait for the animation to finish (500ms matches the CSS duration)
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500); 
    });
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    document.body.classList.remove("fade-out");
  }
});
