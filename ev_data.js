const form = document.getElementById("evSetupForm");
const evNameInput = document.getElementById("evName");
const evBatteryInput = document.getElementById("evBattery");
const evRangeInput = document.getElementById("evRange");

const evNameError = document.getElementById("evNameError");
const evBatteryError = document.getElementById("evBatteryError");
const evRangeError = document.getElementById("evRangeError");

const locationCard = document.getElementById("locationCard");
const locationIconBox = document.getElementById("locationIconBox");
const locationTitle = document.getElementById("locationTitle");
const locationSubtitle = document.getElementById("locationSubtitle");
const detectLocationBtn = document.getElementById("detectLocationBtn");

const formStatus = document.getElementById("formStatus");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");

let detectedLocation = null;

function validateName(showError = false) {
  const value = evNameInput.value.trim();
  const valid = value.length > 0;

  if (showError) {
    evNameInput.classList.toggle("invalid", !valid);
    evNameError.textContent = valid ? "" : "Please enter your EV vehicle name.";
  } else if (valid) {
    evNameInput.classList.remove("invalid");
    evNameError.textContent = "";
  }

  return valid;
}

function validateBattery(showError = false) {
  const raw = evBatteryInput.value.trim();
  const num = Number(raw);
  const valid = raw !== "" && Number.isFinite(num) && num >= 0 && num <= 100;

  if (showError) {
    evBatteryInput.classList.toggle("invalid", !valid);
    if (raw === "") {
      evBatteryError.textContent = "Please enter the current battery percentage.";
    } else if (!Number.isFinite(num) || num < 0 || num > 100) {
      evBatteryError.textContent = "Battery must be between 0 and 100.";
    } else {
      evBatteryError.textContent = "";
    }
  } else if (valid) {
    evBatteryInput.classList.remove("invalid");
    evBatteryError.textContent = "";
  }

  return valid;
}

function validateRange(showError = false) {
  const raw = evRangeInput.value.trim();
  const num = Number(raw);
  const valid = raw !== "" && Number.isFinite(num) && num >= 0;

  if (showError) {
    evRangeInput.classList.toggle("invalid", !valid);
    if (raw === "") {
      evRangeError.textContent = "Please enter the remaining range in km.";
    } else if (!Number.isFinite(num) || num < 0) {
      evRangeError.textContent = "Range must be 0 or greater.";
    } else {
      evRangeError.textContent = "";
    }
  } else if (valid) {
    evRangeInput.classList.remove("invalid");
    evRangeError.textContent = "";
  }

  return valid;
}

function validateLocation(showError = false) {
  const valid = detectedLocation !== null;

  if (showError && !valid) {
    locationCard.classList.add("error");
    locationTitle.textContent = "Location is required";
    locationSubtitle.textContent = "Detect your live GPS location before continuing";
  }

  return valid;
}

function updateSaveButtonState() {
  const allValid =
    validateName(false) &&
    validateBattery(false) &&
    validateRange(false) &&
    validateLocation(false);

  saveBtn.disabled = !allValid;
}

function setFormStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = type ? `form-status ${type}` : "form-status";
}

function detectLocation() {
  setFormStatus("");
  locationCard.classList.remove("error");

  if (!navigator.geolocation) {
    detectedLocation = null;
    locationCard.classList.remove("detected");
    locationCard.classList.add("error");
    locationIconBox.className = "icon-box icon-peach";
    locationTitle.textContent = "Location unavailable";
    locationSubtitle.textContent = "Your browser does not support GPS geolocation.";
    detectLocationBtn.textContent = "Retry";
    updateSaveButtonState();
    return;
  }

  detectLocationBtn.disabled = true;
  detectLocationBtn.textContent = "Checking...";
  locationTitle.textContent = "Detecting location...";
  locationSubtitle.textContent = "Waiting for browser GPS signal";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      detectedLocation = {
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        timestamp: new Date(position.timestamp).toISOString(),
      };

      locationCard.classList.remove("error");
      locationCard.classList.add("detected");
      locationIconBox.className = "icon-box icon-green";
      locationTitle.textContent = "Location detected";
      locationSubtitle.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)} m)`;

      detectLocationBtn.disabled = false;
      detectLocationBtn.textContent = "Refresh";
      updateSaveButtonState();
    },
    (error) => {
      detectedLocation = null;
      locationCard.classList.remove("detected");
      locationCard.classList.add("error");
      locationIconBox.className = "icon-box icon-peach";

      let errorMessage = "Unable to detect location. Please try again.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = "Location permission denied. Allow access in browser settings.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage = "GPS location information is currently unavailable.";
      } else if (error.code === error.TIMEOUT) {
        errorMessage = "Location request timed out. Please retry.";
      }

      locationTitle.textContent = "Location blocked or failed";
      locationSubtitle.textContent = errorMessage;

      detectLocationBtn.disabled = false;
      detectLocationBtn.textContent = "Retry";
      updateSaveButtonState();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

detectLocationBtn.addEventListener("click", detectLocation);

evNameInput.addEventListener("input", () => {
  setFormStatus("");
  validateName(evNameInput.classList.contains("invalid"));
  updateSaveButtonState();
});
evNameInput.addEventListener("blur", () => {
  validateName(true);
  updateSaveButtonState();
});

evBatteryInput.addEventListener("input", () => {
  setFormStatus("");
  validateBattery(evBatteryInput.classList.contains("invalid"));
  updateSaveButtonState();
});
evBatteryInput.addEventListener("blur", () => {
  validateBattery(true);
  updateSaveButtonState();
});

evRangeInput.addEventListener("input", () => {
  setFormStatus("");
  validateRange(evRangeInput.classList.contains("invalid"));
  updateSaveButtonState();
});
evRangeInput.addEventListener("blur", () => {
  validateRange(true);
  updateSaveButtonState();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const nameValid = validateName(true);
  const batteryValid = validateBattery(true);
  const rangeValid = validateRange(true);
  const locationValid = validateLocation(true);

  if (!nameValid || !batteryValid || !rangeValid || !locationValid) {
    setFormStatus(
      "Please fill in all EV details and detect location before continuing.",
      "error"
    );

    if (!nameValid) {
      evNameInput.focus();
    } else if (!batteryValid) {
      evBatteryInput.focus();
    } else if (!rangeValid) {
      evRangeInput.focus();
    } else if (!locationValid) {
      detectLocationBtn.focus();
    }
    return;
  }

  const evSetupData = {
    vehicleName: evNameInput.value.trim(),
    batteryPercent: Number(evBatteryInput.value.trim()),
    rangeKm: Number(evRangeInput.value.trim()),
    location: detectedLocation,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("evSetupData", JSON.stringify(evSetupData));
  setFormStatus("Saved successfully. Opening dashboard...", "success");
  document.body.classList.add("fade-out");

  setTimeout(() => {
    window.location.href = "route_planner.html";
  }, 400);
});

clearBtn.addEventListener("click", () => {
  form.reset();
  detectedLocation = null;

  evNameInput.classList.remove("invalid");
  evBatteryInput.classList.remove("invalid");
  evRangeInput.classList.remove("invalid");

  evNameError.textContent = "";
  evBatteryError.textContent = "";
  evRangeError.textContent = "";

  locationCard.classList.remove("detected", "error");
  locationIconBox.className = "icon-box icon-peach";
  locationTitle.textContent = "Location not detected";
  locationSubtitle.textContent = "Allow GPS access to detect your EV's live location";
  detectLocationBtn.disabled = false;
  detectLocationBtn.textContent = "Detect";

  setFormStatus("");
  updateSaveButtonState();
});

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = link.href;

      document.body.classList.add("fade-out");

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