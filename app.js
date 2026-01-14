let map;
let marker;
let userLocation = null;
let selectedLocation = null;
let currentAdventure = null;
let shownAdventureIds = new Set(); // Track adventures already shown in current session
let cachedEvents = null; // Cache all events to avoid fetching on every click
let cacheTimestamp = null; // Track when events were cached
let cachedPlaces = null; // Cache all places to avoid fetching on every click
let placesCacheTimestamp = null; // Track when places were cached
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

// Initialize Mapbox centered on San Francisco
function initMap() {
    // Mapbox uses [lng, lat] format
    const sfCenter = [-122.4194, 37.7749];
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: sfCenter,
        zoom: 13
    });

    // Wait for map to load before adding controls
    map.on('load', () => {
        // Add click listener to map
        map.on('click', (event) => {
            const lng = event.lngLat.lng;
            const lat = event.lngLat.lat;
            
            // Check if location is within San Francisco bounds
            if (isInSanFrancisco(lat, lng)) {
                selectedLocation = { lat, lng };
                document.getElementById('selectedLat').value = lat;
                document.getElementById('selectedLng').value = lng;
                
                // Update marker
                updateMarker(lat, lng);
            } else {
                alert('Please select a location within San Francisco, California');
            }
        });
    });
}

// Check if coordinates are within San Francisco bounds
function isInSanFrancisco(lat, lng) {
    // Approximate SF bounds
    const sfBounds = {
        north: 37.8324,
        south: 37.6398,
        east: -122.2818,
        west: -122.5173
    };
    
    return lat >= sfBounds.south && lat <= sfBounds.north &&
           lng >= sfBounds.west && lng <= sfBounds.east;
}

// Create or update marker at location
function updateMarker(lat, lng) {
    // Mapbox uses [lng, lat] format
    const lngLat = [lng, lat];
    
    if (marker) {
        marker.setLngLat(lngLat);
    } else {
        // Create a DOM element for the marker
        const el = document.createElement('div');
        el.className = 'mapbox-marker';
        el.innerHTML = '📍';
        el.style.fontSize = '32px';
        el.style.cursor = 'pointer';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.textAlign = 'center';
        el.style.lineHeight = '32px';
        
        marker = new mapboxgl.Marker({
            element: el,
            draggable: true
        })
        .setLngLat(lngLat)
        .addTo(map);
        
        // Add drag end listener
        marker.on('dragend', () => {
            const draggedLngLat = marker.getLngLat();
            const draggedLat = draggedLngLat.lat;
            const draggedLng = draggedLngLat.lng;
            
            if (isInSanFrancisco(draggedLat, draggedLng)) {
                selectedLocation = { lat: draggedLat, lng: draggedLng };
                document.getElementById('selectedLat').value = draggedLat;
                document.getElementById('selectedLng').value = draggedLng;
            } else {
                marker.setLngLat([selectedLocation.lng || -122.4194, selectedLocation.lat || 37.7749]);
                alert('Please keep the marker within San Francisco, California');
            }
        });
    }
}

// Initialize map when DOM is ready
(function() {
    function init() {
        if (typeof MAPBOX_TOKEN !== 'undefined' && MAPBOX_TOKEN) {
            initMap();
        } else {
            console.error('Please set your MAPBOX_TOKEN in config.js');
            document.getElementById('map').innerHTML = '<p style="padding: 20px; text-align: center;">Please configure your Mapbox token in config.js</p>';
        }
        
        // Set up locate button event listener
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', function handleLocateClick() {
                console.log('Locate button clicked');
                if (navigator.geolocation) {
                    const originalHTML = locateBtn.innerHTML;
                    locateBtn.disabled = true;
                    locateBtn.innerHTML = 'Locating...';
                    
                    console.log('Requesting geolocation...');
                    
                    const handleLocation = (position) => {
                        console.log('Geolocation success:', position);
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        console.log('Got location:', lat, lng);
                        
                        if (isInSanFrancisco(lat, lng)) {
                            console.log('Location is in SF, updating map and marker');
                            userLocation = { lat, lng };
                            selectedLocation = { lat, lng };
                            document.getElementById('selectedLat').value = lat;
                            document.getElementById('selectedLng').value = lng;
                            
                            // Center map on user location (Mapbox uses [lng, lat])
                            if (map) {
                                console.log('Flying to location on map');
                                map.flyTo({
                                    center: [lng, lat],
                                    zoom: 15
                                });
                            } else {
                                console.error('Map is not initialized yet');
                            }
                            
                            // Update marker
                            console.log('Updating marker');
                            updateMarker(lat, lng);
                            console.log('Location set successfully');
                        } else {
                            console.log('Location is not in SF bounds');
                            alert('You must be in San Francisco, California to use this feature. Please select a location on the map.');
                        }
                        
                        locateBtn.disabled = false;
                        locateBtn.innerHTML = originalHTML;
                    };
                    
                    const handleError = (error) => {
                        console.error('Geolocation error:', error);
                        console.error('Error code:', error.code);
                        console.error('Error message:', error.message);
                        
                        let errorMsg = 'Unable to get your location. ';
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMsg += 'Please allow location access in your browser settings.';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMsg += 'Location information is unavailable.';
                                break;
                            case error.TIMEOUT:
                                errorMsg += 'Location request timed out. Please try again or select a location on the map.';
                                break;
                            default:
                                errorMsg += 'Please select a location on the map.';
                                break;
                        }
                        
                        alert(errorMsg);
                        locateBtn.disabled = false;
                        locateBtn.innerHTML = originalHTML;
                    };
                    
                    const watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            navigator.geolocation.clearWatch(watchId);
                            handleLocation(position);
                        },
                        handleError,
                        {
                            enableHighAccuracy: false,
                            maximumAge: 300000
                        }
                    );
                } else {
                    console.error('Geolocation is not supported');
                    alert('Geolocation is not supported by your browser. Please select a location on the map.');
                }
            });
        } else {
            console.error('Locate button not found');
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Reset shown adventures when location or vibe changes
function resetShownAdventures() {
    shownAdventureIds.clear();
    cachedEvents = null; // Clear cache when resetting
    cacheTimestamp = null;
    cachedPlaces = null; // Clear places cache when resetting
    placesCacheTimestamp = null;
    const btn = document.getElementById('createAdventureBtn');
    btn.innerHTML = 'create adventure!';
    // Reset button style back to primary (solid green)
    btn.classList.remove('btn-primary-outlined');
    btn.classList.add('btn-primary');
}

// Track location and vibe changes to reset shown adventures
let lastSelectedLocation = null;
let lastSelectedVibe = null;

// Create adventure button
document.getElementById('createAdventureBtn').addEventListener('click', async () => {
    if (!selectedLocation) {
        alert('Please select a location first (use "locate me" or click on the map)');
        return;
    }

    const selectedVibe = document.querySelector('input[name="vibe"]:checked')?.value;
    
    // Reset shown adventures if location or vibe changed
    const locationChanged = lastSelectedLocation && (
        lastSelectedLocation.lat !== selectedLocation.lat || 
        lastSelectedLocation.lng !== selectedLocation.lng
    );
    const vibeChanged = lastSelectedVibe !== selectedVibe;
    
    if (locationChanged || vibeChanged) {
        resetShownAdventures();
    }
    
    lastSelectedLocation = { ...selectedLocation };
    lastSelectedVibe = selectedVibe;
    
    try {
        const excludedIds = Array.from(shownAdventureIds);
        // Check if we're in "tomorrow mode" (last adventure was a tomorrow event)
        const inTomorrowMode = currentAdventure && currentAdventure.futureMessage && selectedVibe === 'activity';
        const adventure = await getRandomAdventure(selectedLocation, selectedVibe, excludedIds, inTomorrowMode);
        
        if (adventure) {
            const adventureId = getAdventureId(adventure);
            shownAdventureIds.add(adventureId);
            currentAdventure = adventure;
            
            // Change button text and style after first adventure
            const btn = document.getElementById('createAdventureBtn');
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-primary-outlined');
            // Add cache-busting parameter to force reload of updated SVG
            const cacheBuster = '?v=' + Date.now();
            btn.innerHTML = '<img src="icons/rotate-ccw.svg' + cacheBuster + '" alt="" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.25em;"> new adventure!';
            
            // Check if it has a futureMessage (10am suggestion)
            if (adventure.futureMessage) {
                displayFutureAdventure(adventure);
            } else {
                displayAdventure(adventure);
            }
            document.getElementById('adventureSection').style.display = 'block';
            document.getElementById('adventureSection').scrollIntoView({ behavior: 'smooth' });
        } else {
            // Display "nothing nearby :(" message when no more adventures
            displayNothingNearby();
            document.getElementById('adventureSection').style.display = 'block';
            document.getElementById('adventureSection').scrollIntoView({ behavior: 'smooth' });
            
            // Reset for next session (when location/vibe changes)
            resetShownAdventures();
        }
    } catch (error) {
        console.error('Error creating adventure:', error);
        alert('Error creating adventure. Please try again.');
    }
});

// Calculate distance between two lat/lng points using Haversine formula (returns miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get current time in PST/PDT - returns an object with date components
function getCurrentPSTTime() {
    const now = new Date();
    // Get PST time components
    const pstOptions = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const pstString = now.toLocaleString('en-US', pstOptions);
    // Format: "MM/DD/YYYY, HH:MM:SS"
    const [datePart, timePart] = pstString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    
    // Create a date object (will be in local time but we'll only use the components)
    const pstDate = new Date(year, parseInt(month) - 1, day, parseInt(hour), parseInt(minute), parseInt(second));
    return pstDate;
}

// Parse time string to minutes since midnight (handles various formats)
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    
    // Remove whitespace and convert to lowercase
    const cleaned = timeStr.trim().toLowerCase();
    
    // Try to parse various formats
    // Format: "9:00 AM", "9am", "09:00", "12:00" (without AM/PM), etc.
    const patterns = [
        /(\d+):(\d+)\s*(am|pm)/,  // "9:00 AM" or "9:00 PM"
        /(\d+)\s*(am|pm)/,         // "9 AM" or "9 PM"
        /(\d+):(\d+)/,             // "09:00" or "12:00" (24-hour or time without AM/PM - assume 24-hour if >= 12, otherwise assume PM context)
        /(\d+)/                     // "9" (assume 24-hour)
    ];
    
    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            const ampm = match[3] || (match[4] || '');
            
            if (ampm) {
                // Has AM/PM indicator
                if (ampm === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (ampm === 'am' && hours === 12) {
                    hours = 0;
                }
            } else {
                // No AM/PM - if hours < 12, assume PM (common in business hours like "12:00" means noon)
                // Actually, let's be more careful - "12:00" usually means noon (12 PM), not midnight
                // But if it's in the context of a close time like "12:00 – 9:00 PM", 
                // the "12:00" is likely noon. Let's assume times without AM/PM are 24-hour format
                // But wait, "12:00" could be noon or midnight. In business hours context, it's usually noon.
                // For now, let's assume it's 24-hour format, so "12:00" = noon, "13:00" = 1pm, etc.
                // But if hours < 12 and no AM/PM, we might need context. Let's assume it's already in 24-hour.
            }
            
            return hours * 60 + minutes;
        }
    }
    
    return null;
}

// Check if a place is currently open based on hours string
function isPlaceOpen(hoursStr) {
    if (!hoursStr) {
        console.log('No hours data, assuming closed');
        return false; // If no hours, assume closed (more restrictive)
    }
    
    const currentTime = getCurrentPSTTime();
    const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Try to parse hours - could be JSON, string, array, etc.
    let hours;
    try {
        hours = typeof hoursStr === 'string' ? JSON.parse(hoursStr) : hoursStr;
    } catch (e) {
        // Not JSON, treat as string or use as-is
        hours = hoursStr;
    }
    
    // Handle array format: ['Monday: 11:00 AM – 8:00 PM', 'Tuesday: Closed', ...]
    if (Array.isArray(hours)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = dayNames[currentDay];
        
        // Find the entry for today
        const todayEntry = hours.find(entry => {
            const entryStr = String(entry);
            return entryStr.toLowerCase().startsWith(currentDayName.toLowerCase());
        });
        
        if (!todayEntry) {
            console.log('No entry found for', currentDayName);
            return false;
        }
        
        const entryStr = String(todayEntry);
        
        // Check if closed
        if (entryStr.toLowerCase().includes('closed')) {
            return false;
        }
        
        // Extract time range (format: "Monday: 11:00 AM – 8:00 PM" or "Saturday: 12:00 – 9:00 PM")
        // Split by colon and get the time part (everything after the first colon which is the day name)
        const colonIndex = entryStr.indexOf(':');
        const timePart = entryStr.substring(colonIndex + 1).trim();
        
        // Split by dash/en-dash/em-dash to get open and close times
        const timeRange = timePart.split(/[–\-]/).map(t => t.trim());
        if (timeRange.length === 2) {
            let openTime = timeRange[0];
            let closeTime = timeRange[1];
            
            // If open time has no AM/PM but close time does, infer AM for open time if it's before close time
            // This handles cases like "12:00 – 9:00 PM" where "12:00" means noon (12 PM)
            if (!openTime.match(/\s*(am|pm)/i) && closeTime.match(/\s*(am|pm)/i)) {
                // If open time is "12:00", it's likely noon (12 PM), not midnight
                // Otherwise, if open time hour is less than close time hour (in 24h), assume it's already 24h format
                // Actually, let's just parse it as-is and assume it's 24-hour format
                // But "12:00" in business context is usually noon, so let's add "PM" if no AM/PM
                // Wait, let's check the close time - if it has PM and the open hour is 12, it's likely 12 PM (noon)
                const closeMatch = closeTime.match(/(\d+):?(\d*)\s*(am|pm)/i);
                if (closeMatch) {
                    const closeHour = parseInt(closeMatch[1]);
                    const closeIsPM = closeMatch[3].toLowerCase() === 'pm';
                    const closeHour24 = closeIsPM && closeHour !== 12 ? closeHour + 12 : (closeIsPM ? closeHour : closeHour);
                    
                    const openMatch = openTime.match(/(\d+):?(\d*)/);
                    if (openMatch) {
                        const openHour = parseInt(openMatch[1]);
                        // If open hour is 12 and close is PM, open is likely 12 PM (noon)
                        if (openHour === 12 && closeHour24 >= 12) {
                            openTime = openTime + ' PM';
                        }
                        // If open hour is less than close hour (in 24h), assume open is already in 24h format (no change needed)
                        // Otherwise, if open < close in 24h sense, open might be PM too
                        // Actually, let's be simpler: if it's "12:00" assume noon (12 PM)
                        if (openHour === 12 && !openTime.match(/\s*(am|pm)/i)) {
                            openTime = openTime + ' PM';
                        }
                    }
                }
            }
            
            const openMinutes = parseTimeToMinutes(openTime);
            const closeMinutes = parseTimeToMinutes(closeTime);
            
            if (openMinutes !== null && closeMinutes !== null) {
                const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
                console.log('Place open check (array format):', {
                    currentMinutes,
                    openMinutes,
                    closeMinutes,
                    isOpen,
                    openTime,
                    closeTime,
                    todayEntry
                });
                return isOpen;
            }
        }
        
        console.log('Could not parse time range from:', timePart);
        return false;
    }
    
    // If it's an object with day keys
    if (typeof hours === 'object' && hours !== null && !Array.isArray(hours)) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[currentDay];
        const dayHours = hours[currentDayName] || hours[currentDayName.toLowerCase()] || hours[String(currentDay)];
        
        if (!dayHours || dayHours === 'closed' || dayHours === 'CLOSED') {
            return false;
        }
        
        // Parse time range like "9:00 AM - 5:00 PM"
        const timeRange = String(dayHours).split(/[–-]/).map(t => t.trim());
        if (timeRange.length === 2) {
            const openMinutes = parseTimeToMinutes(timeRange[0]);
            const closeMinutes = parseTimeToMinutes(timeRange[1]);
            
            if (openMinutes !== null && closeMinutes !== null) {
                const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
                console.log('Place open check (object format):', {
                    currentMinutes,
                    openMinutes,
                    closeMinutes,
                    isOpen,
                    dayHours
                });
                return isOpen;
            }
        }
    }
    
    // If it's a simple string like "9:00 AM - 5:00 PM"
    if (typeof hours === 'string') {
        const timeRange = hours.split(/[–-]/).map(t => t.trim());
        if (timeRange.length === 2) {
            const openMinutes = parseTimeToMinutes(timeRange[0]);
            const closeMinutes = parseTimeToMinutes(timeRange[1]);
            
            if (openMinutes !== null && closeMinutes !== null) {
                const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
                console.log('Place open check (string format):', {
                    currentMinutes,
                    openMinutes,
                    closeMinutes,
                    isOpen,
                    hours
                });
                return isOpen;
            }
        }
    }
    
    // If we can't parse, assume closed (more restrictive)
    console.log('Could not parse hours:', hoursStr, typeof hoursStr);
    return false;
}

// Check if a place is open at a specific time (10am)
function isPlaceOpenAt10AM(hoursStr) {
    if (!hoursStr) return false;
    
    // Get the target day (today or tomorrow at 10am)
    const currentTime = getCurrentPSTTime();
    const currentHour = currentTime.getHours();
    
    // Determine if we're looking at today or tomorrow
    // If it's 9pm-11:59pm, look for tomorrow
    // If it's 12am-9am, look for today
    let targetDay = currentTime.getDay();
    if (currentHour >= 21) {
        // After 9pm, look for tomorrow
        targetDay = (currentTime.getDay() + 1) % 7;
    }
    
    const targetMinutes = 10 * 60; // 10am = 600 minutes
    
    // Try to parse hours
    let hours;
    try {
        hours = typeof hoursStr === 'string' ? JSON.parse(hoursStr) : hoursStr;
    } catch (e) {
        hours = hoursStr;
    }
    
    // Handle array format
    if (Array.isArray(hours)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDayName = dayNames[targetDay];
        
        const dayEntry = hours.find(entry => {
            const entryStr = String(entry);
            return entryStr.toLowerCase().startsWith(targetDayName.toLowerCase());
        });
        
        if (!dayEntry) return false;
        
        const entryStr = String(dayEntry);
        if (entryStr.toLowerCase().includes('closed')) return false;
        
        const colonIndex = entryStr.indexOf(':');
        const timePart = entryStr.substring(colonIndex + 1).trim();
        const timeRange = timePart.split(/[–\-]/).map(t => t.trim());
        
        if (timeRange.length === 2) {
            let openTime = timeRange[0];
            let closeTime = timeRange[1];
            
            // Handle "12:00" format
            if (!openTime.match(/\s*(am|pm)/i) && closeTime.match(/\s*(am|pm)/i)) {
                const openMatch = openTime.match(/(\d+):?(\d*)/);
                if (openMatch && parseInt(openMatch[1]) === 12) {
                    openTime = openTime + ' PM';
                }
            }
            
            const openMinutes = parseTimeToMinutes(openTime);
            const closeMinutes = parseTimeToMinutes(closeTime);
            
            if (openMinutes !== null && closeMinutes !== null) {
                // Check if 10am (600 minutes) is within the open hours
                return targetMinutes >= openMinutes && targetMinutes <= closeMinutes;
            }
        }
    }
    
    return false;
}

// Check if an event is happening the next day (any time)
// Check if event is happening on the next calendar day (any time)
function isEventHappeningNextDay(startTime, endTime) {
    if (!startTime) {
        return false;
    }
    
    // Get today's date in PST
    const now = new Date();
    const pstOptions = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayPSTString = now.toLocaleString('en-US', pstOptions);
    // Format: "MM/DD/YYYY"
    const [todayMonth, todayDay, todayYear] = todayPSTString.split('/');
    
    // Calculate tomorrow's date components in PST
    const todayDate = new Date(parseInt(todayYear), parseInt(todayMonth) - 1, parseInt(todayDay));
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    const tomorrowYear = tomorrowDate.getFullYear();
    const tomorrowMonth = tomorrowDate.getMonth();
    const tomorrowDay = tomorrowDate.getDate();
    
    // Parse start time
    let start;
    if (startTime instanceof Date) {
        start = startTime;
    } else if (typeof startTime === 'string') {
        start = new Date(startTime);
    } else {
        return false;
    }
    
    // Check if start time is valid
    if (isNaN(start.getTime())) {
        return false;
    }
    
    // Convert start time to PST for date comparison
    const startPSTString = start.toLocaleString('en-US', pstOptions);
    // Format: "MM/DD/YYYY"
    const [month, day, year] = startPSTString.split('/');
    
    // Get start date components in PST
    const startYear = parseInt(year);
    const startMonth = parseInt(month) - 1; // Month is 0-indexed
    const startDay = parseInt(day);
    
    // Check if event starts on tomorrow (any time)
    return startYear === tomorrowYear && 
           startMonth === tomorrowMonth && 
           startDay === tomorrowDay;
}

// Check if an event starts at/around 10am (for future suggestions)
function isEventStartingAt10AM(startTime, endTime) {
    if (!startTime) return false;
    
    const currentTime = getCurrentPSTTime();
    const currentHour = currentTime.getHours();
    
    // Determine target day (today or tomorrow)
    let targetDay = currentTime.getDay();
    if (currentHour >= 21) {
        // After 9pm, look for tomorrow
        targetDay = (currentTime.getDay() + 1) % 7;
    }
    
    // Parse start time
    let start;
    if (startTime instanceof Date) {
        start = startTime;
    } else if (typeof startTime === 'string') {
        start = new Date(startTime);
    } else {
        return false;
    }
    
    // Convert to PST for comparison (similar to getCurrentPSTTime)
    const pstOptions = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'long' };
    const pstString = start.toLocaleString('en-US', pstOptions);
    // Format: "Monday, MM/DD/YYYY, HH:MM:SS"
    const parts = pstString.split(', ');
    const dayName = parts[0];
    const datePart = parts[1];
    const timePart = parts[2];
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    
    // Create a date object for comparison (components only)
    const startPST = new Date(year, parseInt(month) - 1, day, parseInt(hour), parseInt(minute), parseInt(second));
    const startDay = startPST.getDay();
    const startHour = startPST.getHours();
    const startMinutes = startPST.getMinutes();
    const startTotalMinutes = startHour * 60 + startMinutes;
    
    // Check if event starts on target day and at/around 10am (between 9:30am and 10:30am)
    const targetMinutes = 10 * 60; // 10am
    const isOnTargetDay = startDay === targetDay;
    const isAround10AM = startTotalMinutes >= (9 * 60 + 30) && startTotalMinutes <= (10 * 60 + 30);
    
    return isOnTargetDay && isAround10AM;
}

// Check if an event is currently happening
// Check if event starts at least 30 minutes from now and before end of day
function isEventStartingSoon(startTime) {
    if (!startTime) return false;
    
    const currentPST = getCurrentPSTTime();
    
    // Parse start time
    let start;
    if (startTime instanceof Date) {
        start = startTime;
    } else if (typeof startTime === 'string') {
        start = new Date(startTime);
    } else {
        return false;
    }
    
    // Check if start time is valid
    if (isNaN(start.getTime())) {
        return false;
    }
    
    // Get date components for today in PST
    const currentYear = currentPST.getFullYear();
    const currentMonth = currentPST.getMonth();
    const currentDate = currentPST.getDate();
    
    // Get date components for start time in PST
    const startPST = new Date(start.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const startYear = startPST.getFullYear();
    const startMonth = startPST.getMonth();
    const startDay = startPST.getDate();
    
    // Check if event is on the same day
    const isSameDay = startYear === currentYear && 
                      startMonth === currentMonth && 
                      startDay === currentDate;
    
    if (!isSameDay) {
        // Only consider events happening today
        return false;
    }
    
    // Calculate 30 minutes from now (in milliseconds)
    const thirtyMinutesFromNow = currentPST.getTime() + 30 * 60 * 1000;
    
    // Check if event starts at least 30 minutes from now
    if (start.getTime() < thirtyMinutesFromNow) {
        return false;
    }
    
    // Calculate end of day (11:59:59.999 PM today in PST)
    const endOfDay = new Date(currentPST);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Event must start before end of day (compare using getTime() which is timezone-independent)
    return start.getTime() <= endOfDay.getTime();
}

function isEventHappening(startTime, endTime) {
    if (!startTime || !endTime) {
        console.log('Missing start or end time, assuming not happening');
        return false; // If no times, assume not happening (more restrictive)
    }
    
    const now = new Date();
    const currentPST = getCurrentPSTTime();
    
    // Parse start and end times (could be Date objects, ISO strings, or time strings)
    let start, end;
    
    if (startTime instanceof Date) {
        start = startTime;
    } else if (typeof startTime === 'string') {
        start = new Date(startTime);
    } else {
        console.log('Could not parse startTime:', startTime);
        return false; // Can't parse, assume not happening
    }
    
    if (endTime instanceof Date) {
        end = endTime;
    } else if (typeof endTime === 'string') {
        end = new Date(endTime);
    } else {
        console.log('Could not parse endTime:', endTime);
        return false; // Can't parse, assume not happening
    }
    
    // Compare times (assume startTime and endTime are already in PST or UTC that represents PST)
    // If they're stored as ISO strings, they should be comparable directly
    const isHappening = currentPST >= start && currentPST <= end;
    console.log('Event happening check:', {
        currentPST: currentPST.toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
        isHappening: isHappening
    });
    return isHappening;
}

// Check if event cost is $20 or less
function isEventUnder20(cost) {
    if (!cost) return true; // If no cost, assume it's free/under $20
    const costNum = typeof cost === 'string' ? parseFloat(cost.replace('$', '')) : parseFloat(cost);
    return !isNaN(costNum) && costNum <= 20;
}

// Generate a unique ID for an adventure (for tracking shown adventures)
function getAdventureId(adventure) {
    // Use id if available, otherwise create a unique key from name and location
    if (adventure.id) {
        return `${adventure.type}_${adventure.id}`;
    }
    const name = adventure.name || adventure.title || '';
    const lat = adventure.latitude || adventure.lat || '';
    const lng = adventure.longitude || adventure.lng || '';
    return `${adventure.type}_${name}_${lat}_${lng}`;
}

// Get random adventure from Supabase near the selected location
async function getRandomAdventure(location, vibe, excludedIds = [], inTomorrowMode = false) {
    try {
        let adventures = [];
        
        // Filter by vibe to determine which tables to query
        if (vibe === 'caffeine') {
            // Caffeine fix: only places_sf with tag "cafe" that are currently open
            // Use cached places if available and fresh, otherwise fetch
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                    // Fetch all places (filtering by tag on database side may not work depending on schema)
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                
                // Cache the places
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        // Check if item has tag "cafe" (handle both string and array formats)
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasCafeTag = tagArray.some(t => t.toLowerCase() === 'cafe');
                        
                        // Check if currently open
                        const isOpen = isPlaceOpen(item.hours);
                        
                        return hasCafeTag && isOpen;
                    })
                    .map(item => ({
                        ...item,
                        type: 'place'
                    }));
            }
        } else if (vibe === 'food') {
            // Yummy snack: only places_sf with tag "bakery" that are currently open
            // Use cached places if available and fresh, otherwise fetch
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                // Fetch all places (filtering by tag on database side may not work depending on schema)
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                
                // Cache the places
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        // Check if item has tag "bakery" (handle both string and array formats)
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasBakeryTag = tagArray.some(t => t.toLowerCase() === 'bakery');
                        
                        // Check if currently open
                        const isOpen = isPlaceOpen(item.hours);
                        
                        return hasBakeryTag && isOpen;
                    })
                    .map(item => ({
                        ...item,
                        type: 'place'
                    }));
            }
        } else if (vibe === 'bigfood') {
            // Big food: only places_sf with tag "restaurant" that are currently open
            // Use cached places if available and fresh, otherwise fetch
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                // Fetch all places (filtering by tag on database side may not work depending on schema)
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                
                // Cache the places
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        // Check if item has tag "restaurant" (handle both string and array formats)
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasRestaurantTag = tagArray.some(t => t.toLowerCase() === 'restaurant');
                        
                        // Check if currently open
                        const isOpen = isPlaceOpen(item.hours);
                        
                        return hasRestaurantTag && isOpen;
                    })
                    .map(item => ({
                        ...item,
                        type: 'place'
                    }));
            }
        } else if (vibe === 'activity') {
            // Fun activity: events that start at least 30 minutes from now, before end of day, cost $20 or less
            // Filter on database side to only fetch relevant events
            
            const currentPST = getCurrentPSTTime();
            
            // Calculate 30 minutes from now
            const thirtyMinutesFromNow = new Date(currentPST.getTime() + 30 * 60 * 1000);
            
            // Calculate end of day (11:59:59.999 PM today in PST)
            const endOfDay = new Date(currentPST);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Convert to ISO strings for database query (assuming start_time is stored as timestamp)
            const minStartTime = thirtyMinutesFromNow.toISOString();
            const maxStartTime = endOfDay.toISOString();
            
            // Query with date range filter and cost filter on database side
            // Note: Cost filtering might need to be done client-side if cost is stored as string with $ sign
            let eventsQuery = supabaseClient
                .from('events')
                .select('*')
                .gte('start_time', minStartTime)
                .lte('start_time', maxStartTime);
            
            const eventsResult = await eventsQuery;
            
            if (eventsResult.data) {
                adventures = eventsResult.data
                    .filter(item => {
                        // Cost filtering still needs to be client-side (handles $ signs, strings, etc.)
                        const isUnder20 = isEventUnder20(item.cost);
                        return isUnder20;
                    })
                    .map(item => ({
                        ...item,
                        type: 'event'
                    }));
            }
        } else {
            // No vibe selected: get from both tables
            // Use cached places if available
            let allPlaces = [];
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            // For events: filter by date range (starting soon) and cost
            const currentTime = getCurrentPSTTime();
            const thirtyMinutesFromNow = new Date(currentTime.getTime() + 30 * 60 * 1000);
            const endOfDay = new Date(currentTime);
            endOfDay.setHours(23, 59, 59, 999);
            
            const minStartTime = thirtyMinutesFromNow.toISOString();
            const maxStartTime = endOfDay.toISOString();
            
            let eventsQuery = supabaseClient
                .from('events')
                .select('*')
                .gte('start_time', minStartTime)
                .lte('start_time', maxStartTime);
            
            const eventsResult = await eventsQuery;
            
            if (eventsResult.data) {
                adventures = adventures.concat(eventsResult.data
                    .filter(item => {
                        // Cost filtering still needs to be client-side (handles $ signs, strings, etc.)
                        const isUnder20 = isEventUnder20(item.cost);
                        return isUnder20;
                    })
                    .map(item => ({
                        ...item,
                        type: 'event'
                    })));
            }
            
            if (allPlaces.length > 0) {
                adventures = adventures.concat(allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        // Check if item has one of the allowed tags (handle both string and array formats)
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const allowedTags = ['cafe', 'bakery', 'restaurant', 'nature', 'bar', 'book_store'];
                        const hasAllowedTag = tagArray.some(t => allowedTags.includes(t.toLowerCase()));
                        
                        if (!hasAllowedTag) return false;
                        
                        // Check if currently open
                        const isOpen = isPlaceOpen(item.hours);
                        return isOpen;
                    })
                    .map(item => ({
                        ...item,
                        type: 'place'
                    })));
            }
        }

        // Filter to SF only (additional safety check) and add distance
        adventures = adventures
            .filter(adv => {
                if (adv.latitude && adv.longitude) {
                    return isInSanFrancisco(adv.latitude, adv.longitude);
                }
                return false; // Only include adventures with coordinates
            })
            .map(adv => {
                // Calculate distance from selected location
                const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    adv.latitude || adv.lat,
                    adv.longitude || adv.lng
                );
                return {
                    ...adv,
                    distance: distance
                };
            });

        // Filter out excluded adventures (already shown)
        const excludedSet = new Set(excludedIds);
        adventures = adventures.filter(adv => !excludedSet.has(getAdventureId(adv)));

        // For activities, prioritize by start time instead of distance
        if (vibe === 'activity') {
            // Only check today's events if we're NOT in tomorrow mode
            // If we're already showing tomorrow events, skip today check and go straight to tomorrow
            if (!inTomorrowMode) {
                // Filter to events within 7 miles
                const nearbyEvents = adventures.filter(adv => adv.distance <= 7);
                
                if (nearbyEvents.length > 0) {
                    // Sort by start time (soonest first)
                    nearbyEvents.sort((a, b) => {
                        const startTimeA = a.start_time || a.startTime;
                        const startTimeB = b.start_time || b.startTime;
                        
                        if (!startTimeA && !startTimeB) return 0;
                        if (!startTimeA) return 1;
                        if (!startTimeB) return -1;
                        
                        const dateA = startTimeA instanceof Date ? startTimeA : new Date(startTimeA);
                        const dateB = startTimeB instanceof Date ? startTimeB : new Date(startTimeB);
                        
                        return dateA.getTime() - dateB.getTime();
                    });
                    
                    // Return the soonest event
                    return nearbyEvents[0];
                }
            }
            
            // No events found within 7 miles for today (or we're in tomorrow mode)
            // Search for next day options - excludedIds will ensure we don't show duplicates
            const tomorrowAdventure = await getAdventureAt10AM(location, vibe, false, excludedIds);
            
            // If we found a tomorrow adventure, return it
            if (tomorrowAdventure) {
                return tomorrowAdventure;
            }
            
            // If no tomorrow adventures found either, return null
            return null;
        }

        // For places (caffeine, food, or no vibe), use distance-based search
        // Helper function to shuffle array (Fisher-Yates shuffle)
        const shuffleArray = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Search in expanding radius: 0.5, 1, 1.5, 2, 3, 5 miles
        const searchRadii = [0.5, 1, 1.5, 2, 3, 5];
        
        for (const radius of searchRadii) {
            const nearbyAdventures = adventures.filter(adv => adv.distance <= radius);
            
            if (nearbyAdventures.length > 0) {
                // Shuffle nearby adventures to ensure true randomness (not just database order)
                const shuffled = shuffleArray(nearbyAdventures);
                // Select random adventure from shuffled nearby adventures
                const randomIndex = Math.floor(Math.random() * shuffled.length);
                return shuffled[randomIndex];
            }
        }

        // Nothing found within any radius - check if we should search for 10am options
        const currentTime = getCurrentPSTTime();
        const currentHour = currentTime.getHours();
        const isLateNight = currentHour >= 21; // 9pm-11:59pm
        const isEarlyMorning = currentHour < 9; // 12am-8:59am
        
        if (isLateNight || isEarlyMorning) {
            // Try to find something open at 10am
            return await getAdventureAt10AM(location, vibe, isLateNight, excludedIds);
        }
        
        // Nothing found within any radius
        return null;
    } catch (error) {
        console.error('Error fetching adventures:', error);
        throw error;
    }
}

// Get adventure that's open at 10am (for late night/early morning scenarios)
// For activities, gets next day events with appropriate message
async function getAdventureAt10AM(location, vibe, isLateNight, excludedIds = []) {
    try {
        let adventures = [];
        // For activities, always use the "city has gone to sleep" message
        const message = (vibe === 'activity') 
            ? "the city has gone to sleep... but here's what you can do tomorrow:"
            : (isLateNight 
                ? "the city has gone to sleep... but here's what you can do tomorrow:"
                : "the city hasn't woken up yet... but here's what you can do a bit later:");
        
        // Filter by vibe to determine which tables to query
        if (vibe === 'caffeine') {
            // Use cached places if available and fresh
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasCafeTag = tagArray.some(t => t.toLowerCase() === 'cafe');
                        const openAt10AM = isPlaceOpenAt10AM(item.hours);
                        return hasCafeTag && openAt10AM;
                    })
                    .map(item => ({ ...item, type: 'place', futureMessage: message }));
            }
        } else if (vibe === 'food') {
            // Use cached places if available and fresh
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasBakeryTag = tagArray.some(t => t.toLowerCase() === 'bakery');
                        const openAt10AM = isPlaceOpenAt10AM(item.hours);
                        return hasBakeryTag && openAt10AM;
                    })
                    .map(item => ({ ...item, type: 'place', futureMessage: message }));
            }
        } else if (vibe === 'bigfood') {
            // Use cached places if available and fresh
            let allPlaces = [];
            
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const hasRestaurantTag = tagArray.some(t => t.toLowerCase() === 'restaurant');
                        const openAt10AM = isPlaceOpenAt10AM(item.hours);
                        return hasRestaurantTag && openAt10AM;
                    })
                    .map(item => ({ ...item, type: 'place', futureMessage: message }));
            }
        } else if (vibe === 'activity') {
            // Fun activity: events happening the next day (any time) and cost $20 or less
            // Filter on database side to only fetch tomorrow's events
            
            // Get today's date in PST
            const now = new Date();
            const pstOptions = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
            const todayPSTString = now.toLocaleString('en-US', pstOptions);
            const [todayMonth, todayDay, todayYear] = todayPSTString.split('/');
            
            // Calculate tomorrow's date
            const todayDate = new Date(parseInt(todayYear), parseInt(todayMonth) - 1, parseInt(todayDay));
            const tomorrowDate = new Date(todayDate);
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            
            // Calculate start and end of tomorrow in PST
            const tomorrowStart = new Date(tomorrowDate);
            tomorrowStart.setHours(0, 0, 0, 0);
            
            const tomorrowEnd = new Date(tomorrowDate);
            tomorrowEnd.setHours(23, 59, 59, 999);
            
            // Convert to ISO strings for database query
            const tomorrowStartISO = tomorrowStart.toISOString();
            const tomorrowEndISO = tomorrowEnd.toISOString();
            
            // Query with date range filter for tomorrow
            let eventsQuery = supabaseClient
                .from('events')
                .select('*')
                .gte('start_time', tomorrowStartISO)
                .lte('start_time', tomorrowEndISO);
            
            const eventsResult = await eventsQuery;
            
            if (eventsResult.data) {
                adventures = eventsResult.data
                    .filter(item => {
                        // Cost filtering still needs to be client-side
                        const isUnder20 = isEventUnder20(item.cost);
                        return isUnder20;
                    })
                    .map(item => ({ ...item, type: 'event', futureMessage: message }));
            }
        } else {
            // No vibe: search places only (events are unpredictable)
            // Use cached places if available
            let allPlaces = [];
            if (cachedPlaces && placesCacheTimestamp && (Date.now() - placesCacheTimestamp) < CACHE_DURATION) {
                allPlaces = cachedPlaces;
            } else {
                const placesResult = await supabaseClient.from('places_sf').select('*');
                allPlaces = placesResult.data || [];
                cachedPlaces = allPlaces;
                placesCacheTimestamp = Date.now();
            }
            
            if (allPlaces.length > 0) {
                adventures = allPlaces
                    .filter(item => {
                        // Only include places with our_description
                        if (!item.our_description) return false;
                        
                        // Check if item has one of the allowed tags (handle both string and array formats)
                        const tags = item.tag || item.tags || [];
                        const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
                        const allowedTags = ['cafe', 'bakery', 'restaurant', 'nature', 'bar', 'book_store'];
                        const hasAllowedTag = tagArray.some(t => allowedTags.includes(t.toLowerCase()));
                        
                        if (!hasAllowedTag) return false;
                        
                        return isPlaceOpenAt10AM(item.hours);
                    })
                    .map(item => ({ ...item, type: 'place', futureMessage: message }));
            }
        }
        
        // Filter to SF only and add distance
        adventures = adventures
            .filter(adv => {
                if (adv.latitude && adv.longitude) {
                    return isInSanFrancisco(adv.latitude, adv.longitude);
                }
                return false;
            })
            .map(adv => {
                const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    adv.latitude || adv.lat,
                    adv.longitude || adv.lng
                );
                return { ...adv, distance };
            });
        
        // Filter out excluded adventures (already shown)
        const excludedSet = new Set(excludedIds);
        adventures = adventures.filter(adv => !excludedSet.has(getAdventureId(adv)));

        // For activities, return random event from within 7 miles (for tomorrow's events)
        if (vibe === 'activity') {
            // Filter to events within 7 miles (no expanding radius - just 7 miles max)
            const nearbyEvents = adventures.filter(adv => adv.distance <= 7);
            
            if (nearbyEvents.length > 0) {
                // Shuffle array to ensure random order (Fisher-Yates shuffle)
                const shuffleArray = (array) => {
                    const shuffled = [...array];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    return shuffled;
                };
                
                // Shuffle and return a random event (excludedIds already filtered out above)
                const shuffled = shuffleArray(nearbyEvents);
                const randomIndex = Math.floor(Math.random() * shuffled.length);
                return shuffled[randomIndex];
            }
            
            // If no events within 7 miles, return null (will show "nothing nearby")
            return null;
        }

        // For places (caffeine, food), use distance-based search
        // Helper function to shuffle array (Fisher-Yates shuffle)
        const shuffleArray = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Search in expanding radius
        const searchRadii = [0.5, 1, 1.5, 2, 3, 5];
        for (const radius of searchRadii) {
            const nearbyAdventures = adventures.filter(adv => adv.distance <= radius);
            if (nearbyAdventures.length > 0) {
                // Shuffle nearby adventures to ensure true randomness (not just database order)
                const shuffled = shuffleArray(nearbyAdventures);
                const randomIndex = Math.floor(Math.random() * shuffled.length);
                return shuffled[randomIndex];
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching 10am adventure:', error);
        return null;
    }
}

// Format time for display (HH:MM AM/PM)
function formatTime(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const pst = new Date(d.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const hours = pst.getHours();
    const minutes = pst.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

// Format event time range (e.g., "5pm - 7pm")
function formatEventTimeRange(startTime, endTime) {
    if (!startTime || !endTime) return '';
    const start = formatTimeSimple(startTime);
    const end = formatTimeSimple(endTime);
    return `${start} - ${end}`;
}

// Format place hours for today (e.g., "9am - 5pm")
function formatPlaceHoursToday(hoursStr) {
    if (!hoursStr) return '';
    
    const currentTime = getCurrentPSTTime();
    const currentDay = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
    return formatPlaceHoursForDay(hoursStr, currentDay);
}

// Format place hours for tomorrow (e.g., "9am - 5pm")
function formatPlaceHoursTomorrow(hoursStr) {
    if (!hoursStr) return '';
    
    const currentTime = getCurrentPSTTime();
    const currentDay = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
    const tomorrowDay = (currentDay + 1) % 7; // Next day, wrapping around
    return formatPlaceHoursForDay(hoursStr, tomorrowDay);
}

// Format place hours for a specific day (e.g., "9am - 5pm")
function formatPlaceHoursForDay(hoursStr, targetDay) {
    if (!hoursStr) return '';
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayName = dayNames[targetDay];
    
    // Try to parse hours
    let hours;
    try {
        hours = typeof hoursStr === 'string' ? JSON.parse(hoursStr) : hoursStr;
    } catch (e) {
        hours = hoursStr;
    }
    
    // Handle array format
    if (Array.isArray(hours)) {
        const dayEntry = hours.find(entry => {
            const entryStr = String(entry);
            return entryStr.toLowerCase().startsWith(targetDayName.toLowerCase());
        });
        
        if (!dayEntry) return '';
        
        const entryStr = String(dayEntry);
        if (entryStr.toLowerCase().includes('closed')) return 'Closed';
        
        // Extract time range (format: "Monday: 11:00 AM – 8:00 PM")
        const colonIndex = entryStr.indexOf(':');
        if (colonIndex === -1) return '';
        
        const timePart = entryStr.substring(colonIndex + 1).trim();
        const timeRange = timePart.split(/[–\-]/).map(t => t.trim());
        
        if (timeRange.length === 2) {
            // Format times to match event format (e.g., "9am - 5pm")
            const openTime = formatHoursString(timeRange[0]);
            const closeTime = formatHoursString(timeRange[1]);
            return `${openTime} - ${closeTime}`;
        }
    }
    
    return '';
}

// Helper function to format hour string (e.g., "11:00 AM" -> "11am")
function formatHoursString(timeStr) {
    if (!timeStr) return '';
    
    // Remove leading/trailing whitespace
    timeStr = timeStr.trim();
    
    // Match format like "11:00 AM" or "12:00 PM" or "9:30 PM"
    const match = timeStr.match(/(\d+):?(\d*)\s*(AM|PM|am|pm)/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const ampm = match[3].toLowerCase();
        
        // Convert to 24-hour for consistency, then back to 12-hour without leading zero for minutes
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        const ampmDisplay = hours >= 12 ? 'pm' : 'am';
        
        if (minutes === 0) {
            return `${displayHours}${ampmDisplay}`;
        } else {
            const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
            return `${displayHours}:${displayMinutes}${ampmDisplay}`;
        }
    }
    
    // If no match, try to parse as-is or return original
    return timeStr;
}

// Format time simply (e.g., "5pm" or "9:30am")
function formatTimeSimple(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const pst = new Date(d.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const hours = pst.getHours();
    const minutes = pst.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    if (minutes === 0) {
        return `${displayHours}${ampm}`;
    }
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes}${ampm}`;
}

// Format address to show only street address and city
function formatAddress(address) {
    if (!address) return '';
    
    // Split by comma
    const parts = address.split(',').map(part => part.trim());
    
    if (parts.length === 0) return address;
    
    // If we have at least 2 parts, take first (street) and second (city)
    // If only one part, return as is
    if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
    }
    
    return parts[0];
}

// Display adventure
function displayAdventure(adventure) {
    const name = adventure.name || adventure.title || 'Adventure';
    const fullAddress = adventure.address || adventure.location || '';
    const address = formatAddress(fullAddress);
    // For places, use our_description; for events, use title for description element
    const description = adventure.type === 'place' 
        ? (adventure.our_description || '') 
        : (adventure.title || adventure.name || '');
    const lat = adventure.latitude || adventure.lat || selectedLocation.lat;
    const lng = adventure.longitude || adventure.lng || selectedLocation.lng;

    // Hide disclaimer (if it exists from previous future adventure) and show Google Maps link
    const disclaimerEl = document.getElementById('disclaimerMessage');
    if (disclaimerEl) {
        disclaimerEl.style.display = 'none';
    }
    document.getElementById('googleMapsLink').style.display = 'block';
    
    // For places (caffeine/snacks), use search format with coordinates only (no place_id)
    // For events, use directions format
    let mapsUrl;
    if (adventure.type === 'place') {
        // Use search format with just coordinates - prevents showing place name
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
        // For events, use directions format
        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    
    document.getElementById('googleMapsLink').href = mapsUrl;

    // Create description element above info bar if description exists
    let descriptionEl = document.getElementById('adventureDescription');
    if (description) {
        if (!descriptionEl) {
            descriptionEl = document.createElement('p');
            descriptionEl.id = 'adventureDescription';
            descriptionEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
            descriptionEl.style.fontSize = '1.1rem';
            descriptionEl.style.fontWeight = 'bold';
            descriptionEl.style.lineHeight = '1.6';
            descriptionEl.style.marginBottom = '15px';
            descriptionEl.style.textAlign = 'center';
            descriptionEl.style.padding = '0 0px';
            // Insert after Google Maps link
            const googleMapsLink = document.getElementById('googleMapsLink');
            googleMapsLink.parentNode.insertBefore(descriptionEl, googleMapsLink.nextSibling);
        }
        // Add emoji in front of description if it exists (for places)
        const emoji = adventure.emoji || '';
        const descriptionWithEmoji = emoji ? `${emoji} ${description}` : description;
        descriptionEl.textContent = descriptionWithEmoji;
        descriptionEl.style.display = 'block';
    } else if (descriptionEl) {
        descriptionEl.style.display = 'none';
    }

    // Create or update info bar element right after description (or Google Maps button if no description)
    let infoBarEl = document.getElementById('adventureInfoBar');
    if (!infoBarEl) {
        infoBarEl = document.createElement('div');
        infoBarEl.id = 'adventureInfoBar';
        infoBarEl.style.display = 'flex';
        infoBarEl.style.justifyContent = 'center';
        infoBarEl.style.alignItems = 'center';
        infoBarEl.style.gap = '12px';
        infoBarEl.style.flexWrap = 'wrap';
        infoBarEl.style.marginBottom = '15px';
        infoBarEl.style.paddingBottom = '20px';
        infoBarEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
        // Insert after description (or Google Maps link if no description)
        const insertAfter = descriptionEl || document.getElementById('googleMapsLink');
        insertAfter.parentNode.insertBefore(infoBarEl, insertAfter.nextSibling);
    }
    
    // Build info bar content based on adventure type
    let infoBarHTML = '';
    
    if (adventure.type === 'event') {
        // For events: distance, cost, time
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        const cost = adventure.cost || 0;
        let priceDisplay = 'free';
        const costNum = typeof cost === 'string' ? parseFloat(cost.replace('$', '')) : parseFloat(cost);
        if (!isNaN(costNum) && costNum > 0) {
            const costStr = String(cost);
            priceDisplay = costStr.startsWith('$') ? costStr : `$${costStr}`;
        }
        const timeRange = formatEventTimeRange(adventure.start_time || adventure.startTime, adventure.end_time || adventure.endTime);
        
        infoBarHTML = '';
        if (distance) {
            infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
                <img src="icons/ruler.svg" alt="" style="width: 16px; height: 16px;">
                <span>${distance}</span>
            </div>`;
        }
        infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
            <img src="icons/piggy-bank.svg" alt="" style="width: 16px; height: 16px;">
            <span>${priceDisplay}</span>
        </div>`;
        if (timeRange) {
            infoBarHTML += `<div style="background-color: #b8e6b8; padding: 4px 12px; border-radius: 6px;">
                <span>${timeRange}</span>
            </div>`;
        }
    } else {
        // For places: distance and open hours
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        const hoursDisplay = formatPlaceHoursToday(adventure.hours);
        
        infoBarHTML = '';
        if (distance) {
            infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
                <img src="icons/ruler.svg" alt="" style="width: 16px; height: 16px;">
                <span>${distance}</span>
            </div>`;
        }
        if (hoursDisplay) {
            infoBarHTML += `<div style="background-color: #b8e6b8; padding: 4px 12px; border-radius: 6px;">
                <span>${hoursDisplay}</span>
            </div>`;
        }
    }
    
    infoBarEl.innerHTML = infoBarHTML;
    infoBarEl.style.display = infoBarHTML ? 'flex' : 'none';


    // Format content based on type
    let contentHTML = '';
    
    if (adventure.type === 'event') {
        // Format events with emoji, price, event URLs, and time range
        const emoji = adventure.emoji || '';
        const cost = adventure.cost || 0;
        let priceDisplay = 'free';
        // Check if cost is zero (handle various formats: 0, '0', '$0', '$0.00', '0.00', 0.00)
        const costNum = typeof cost === 'string' ? parseFloat(cost.replace('$', '')) : parseFloat(cost);
        if (!isNaN(costNum) && costNum > 0) {
            const costStr = String(cost);
            priceDisplay = costStr.startsWith('$') ? costStr : `$${costStr}`;
        }
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        
        // Parse event_urls (could be array or string)
        let eventUrls = [];
        if (adventure.event_urls) {
            try {
                eventUrls = typeof adventure.event_urls === 'string' 
                    ? JSON.parse(adventure.event_urls) 
                    : adventure.event_urls;
                if (!Array.isArray(eventUrls)) {
                    eventUrls = [];
                }
            } catch (e) {
                eventUrls = [];
            }
        }
        
        const timeRange = formatEventTimeRange(adventure.start_time || adventure.startTime, adventure.end_time || adventure.endTime);
        
        contentHTML = `
            <div style="background-color: #f5f1e8; border-radius: 12px; padding: 24px;">
                <h3 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 16px; font-family: Georgia, 'Times New Roman', serif;">
                    ${emoji ? emoji + ' ' : ''}${name}
                </h3>
                ${adventure.description ? `<p style="margin-bottom: 16px; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6;">${adventure.description}</p>` : ''}
                ${eventUrls.length > 0 ? `<a href="${eventUrls[0]}" target="_blank" style="display: inline-block; background-color: #b8e6b8; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-family: Georgia, 'Times New Roman', serif; margin-top: 8px;">
                    Event page →
                </a>` : ''}
            </div>
        `;
    } else {
        // Format places normally
        contentHTML = `
            <h3>${name}</h3>
            ${address ? `<p class="address">📍 ${address}</p>` : ''}
        `;
    }

    // Store adventure content for reveal
    document.getElementById('adventureContent').innerHTML = contentHTML;

    // Reset reveal button
    document.getElementById('adventureContent').style.display = 'none';
    document.getElementById('revealBtn').style.display = 'block';
    document.getElementById('revealBtn').innerHTML = 'tap to reveal your adventure<br><br><i>(we recommend keeping it a surprise until you arrive)</i>';
    // Reset box to green background
    document.getElementById('adventureReveal').classList.remove('revealed');
}


// Display future adventure (10am suggestion)
function displayFutureAdventure(adventure) {
    const name = adventure.name || adventure.title || 'Adventure';
    const fullAddress = adventure.address || adventure.location || '';
    const address = formatAddress(fullAddress);
    // For places, use our_description; for events, use title for description element
    const description = adventure.type === 'place' 
        ? (adventure.our_description || '') 
        : (adventure.title || adventure.name || '');
    const lat = adventure.latitude || adventure.lat || selectedLocation.lat;
    const lng = adventure.longitude || adventure.lng || selectedLocation.lng;
    const message = adventure.futureMessage || '';

    // Hide Google Maps link, show disclaimer instead (no events/places today)
    document.getElementById('googleMapsLink').style.display = 'none';
    
    // Create or update disclaimer element where button normally is
    let disclaimerEl = document.getElementById('disclaimerMessage');
    if (!disclaimerEl) {
        disclaimerEl = document.createElement('p');
        disclaimerEl.id = 'disclaimerMessage';
        disclaimerEl.style.fontStyle = 'italic';
        disclaimerEl.style.textAlign = 'center';
        disclaimerEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
        disclaimerEl.style.padding = '0 16px 10px 16px';
        // Insert before the adventure reveal
        const adventureReveal = document.getElementById('adventureReveal');
        adventureReveal.parentNode.insertBefore(disclaimerEl, adventureReveal);
    }
    disclaimerEl.textContent = message;
    disclaimerEl.style.display = 'block';

    // Create description element above info bar if description exists
    let descriptionEl = document.getElementById('adventureDescription');
    if (description) {
        if (!descriptionEl) {
            descriptionEl = document.createElement('p');
            descriptionEl.id = 'adventureDescription';
            descriptionEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
            descriptionEl.style.fontSize = '1.2rem';
            descriptionEl.style.fontWeight = 'bold';
            descriptionEl.style.lineHeight = '1.6';
            descriptionEl.style.marginBottom = '15px';
            descriptionEl.style.textAlign = 'center';
            descriptionEl.style.padding = '0 0px';
            // Insert after disclaimer message
            disclaimerEl.parentNode.insertBefore(descriptionEl, disclaimerEl.nextSibling);
        }
        // Add emoji in front of description if it exists (for places)
        const emoji = adventure.emoji || '';
        const descriptionWithEmoji = emoji ? `${emoji} ${description}` : description;
        descriptionEl.textContent = descriptionWithEmoji;
        descriptionEl.style.display = 'block';
    } else if (descriptionEl) {
        descriptionEl.style.display = 'none';
    }

    // Create or update info bar element right after description (or disclaimer if no description)
    let infoBarEl = document.getElementById('adventureInfoBar');
    if (!infoBarEl) {
        infoBarEl = document.createElement('div');
        infoBarEl.id = 'adventureInfoBar';
        infoBarEl.style.display = 'flex';
        infoBarEl.style.justifyContent = 'center';
        infoBarEl.style.alignItems = 'center';
        infoBarEl.style.gap = '12px';
        infoBarEl.style.flexWrap = 'wrap';
        infoBarEl.style.marginBottom = '15px';
        infoBarEl.style.paddingBottom = '20px';
        infoBarEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
        // Insert after description (or disclaimer if no description)
        const insertAfter = descriptionEl || disclaimerEl;
        insertAfter.parentNode.insertBefore(infoBarEl, insertAfter.nextSibling);
    }
    
    // Build info bar content based on adventure type
    let infoBarHTML = '';
    
    if (adventure.type === 'event') {
        // For events: distance, cost, time
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        const cost = adventure.cost || 0;
        let priceDisplay = 'free';
        const costNum = typeof cost === 'string' ? parseFloat(cost.replace('$', '')) : parseFloat(cost);
        if (!isNaN(costNum) && costNum > 0) {
            const costStr = String(cost);
            priceDisplay = costStr.startsWith('$') ? costStr : `$${costStr}`;
        }
        const timeRange = formatEventTimeRange(adventure.start_time || adventure.startTime, adventure.end_time || adventure.endTime);
        
        infoBarHTML = '';
        if (distance) {
            infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
                <img src="icons/ruler.svg" alt="" style="width: 16px; height: 16px;">
                <span>${distance}</span>
            </div>`;
        }
        infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
            <img src="icons/piggy-bank.svg" alt="" style="width: 16px; height: 16px;">
            <span>${priceDisplay}</span>
        </div>`;
        if (timeRange) {
            infoBarHTML += `<div style="background-color: #b8e6b8; padding: 4px 12px; border-radius: 6px;">
                <span>${timeRange}</span>
            </div>`;
        }
    } else {
        // For places: distance and open hours
        // For future places (displayFutureAdventure), show tomorrow's hours range
        // For regular places (displayAdventure), show today's hours range
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        // Since this is displayFutureAdventure, show tomorrow's hours
        const hoursDisplay = formatPlaceHoursTomorrow(adventure.hours);
        
        infoBarHTML = '';
        if (distance) {
            infoBarHTML += `<div style="display: flex; align-items: center; gap: 6px;">
                <img src="icons/ruler.svg" alt="" style="width: 16px; height: 16px;">
                <span>${distance}</span>
            </div>`;
        }
        if (hoursDisplay) {
            infoBarHTML += `<div style="background-color: #b8e6b8; padding: 4px 12px; border-radius: 6px;">
                <span>${hoursDisplay}</span>
            </div>`;
        }
    }
    
    infoBarEl.innerHTML = infoBarHTML;
    infoBarEl.style.display = infoBarHTML ? 'flex' : 'none';


    // Format content based on type
    let contentHTML = '';
    
    if (adventure.type === 'event') {
        // Format events with emoji, price, event URLs, and time range
        const emoji = adventure.emoji || '';
        const cost = adventure.cost || 0;
        let priceDisplay = 'free';
        // Check if cost is zero (handle various formats: 0, '0', '$0', '$0.00', '0.00', 0.00)
        const costNum = typeof cost === 'string' ? parseFloat(cost.replace('$', '')) : parseFloat(cost);
        if (!isNaN(costNum) && costNum > 0) {
            const costStr = String(cost);
            priceDisplay = costStr.startsWith('$') ? costStr : `$${costStr}`;
        }
        const distance = adventure.distance ? `${adventure.distance.toFixed(1)} miles away` : '';
        
        // Parse event_urls (could be array or string)
        let eventUrls = [];
        if (adventure.event_urls) {
            try {
                eventUrls = typeof adventure.event_urls === 'string' 
                    ? JSON.parse(adventure.event_urls) 
                    : adventure.event_urls;
                if (!Array.isArray(eventUrls)) {
                    eventUrls = [];
                }
            } catch (e) {
                eventUrls = [];
            }
        }
        
        const timeRange = formatEventTimeRange(adventure.start_time || adventure.startTime, adventure.end_time || adventure.endTime);
        
        contentHTML = `
            <div style="background-color: #f5f1e8; border-radius: 12px; padding: 24px;">
                <h3 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 16px; font-family: Georgia, 'Times New Roman', serif;">
                    ${emoji ? emoji + ' ' : ''}${name}
                </h3>
                ${adventure.description ? `<p style="margin-bottom: 16px; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6;">${adventure.description}</p>` : ''}
                ${eventUrls.length > 0 ? `<a href="${eventUrls[0]}" target="_blank" style="display: inline-block; background-color: #b8e6b8; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-family: Georgia, 'Times New Roman', serif; margin-top: 8px;">
                    Event page →
                </a>` : ''}
            </div>
        `;
    } else {
        // Format places normally
        contentHTML = `
            <h3>${name}</h3>
            ${address ? `<p class="address">📍 ${address}</p>` : ''}
        `;
    }

    // Store adventure content for reveal with special message
    document.getElementById('adventureContent').innerHTML = contentHTML;

    // Reset reveal button
    document.getElementById('adventureContent').style.display = 'none';
    document.getElementById('revealBtn').style.display = 'block';
    document.getElementById('revealBtn').innerHTML = 'tap to reveal your adventure<br><br><i>(we recommend keeping it a surprise until you arrive)</i>';
    // Reset box to green background
    document.getElementById('adventureReveal').classList.remove('revealed');
}

// Display "nothing nearby" message
function displayNothingNearby() {
    // Hide Google Maps link, description, info bar, and reveal instruction
    document.getElementById('googleMapsLink').style.display = 'none';
    const descriptionEl = document.getElementById('adventureDescription');
    if (descriptionEl) {
        descriptionEl.style.display = 'none';
    }
    const infoBarEl = document.getElementById('adventureInfoBar');
    if (infoBarEl) {
        infoBarEl.style.display = 'none';
    }
    const disclaimerEl = document.getElementById('disclaimerMessage');
    if (disclaimerEl) {
        disclaimerEl.style.display = 'none';
    }
    
    // Show "nothing nearby :(" message
    document.getElementById('adventureContent').innerHTML = `
        <h3>nothing nearby :(</h3>
        <p>Try selecting a different location or adjusting your vibe filter!</p>
    `;
    
    document.getElementById('adventureContent').style.display = 'block';
    document.getElementById('revealBtn').style.display = 'none';
}

// Reveal adventure button
document.getElementById('revealBtn').addEventListener('click', () => {
    document.getElementById('adventureContent').style.display = 'block';
    document.getElementById('revealBtn').style.display = 'none';
    // Change box to transparent background
    document.getElementById('adventureReveal').classList.add('revealed');
});
