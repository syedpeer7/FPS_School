let map;
let fpsMarkers = [];
let schoolMarkers = [];
let routeControls = [];
let processedData = null;
let distanceData = [];
let routingService = null;

// Initialize map
function initMap() {
    map = L.map('map').setView([16.2160, 81.1498], 8);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Calculate road distance using routing service
async function calculateRoadDistance(fromLat, fromLon, toLat, toLon) {
    return new Promise((resolve, reject) => {
        try {
            const waypoints = [
                L.latLng(fromLat, fromLon),
                L.latLng(toLat, toLon)
            ];

            const routingControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                addWaypoints: false,
                createMarker: function() { return null; }, // Don't create markers
                lineOptions: {
                    styles: [{ color: '#f39c12', weight: 4, opacity: 0.8 }]
                },
                show: false, // Don't show instructions panel
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                })
            });

            routingControl.on('routesfound', function(e) {
                const routes = e.routes;
                if (routes && routes.length > 0) {
                    const route = routes[0];
                    const distance = (route.summary.totalDistance / 1000).toFixed(2); // Convert to km
                    const time = Math.round(route.summary.totalTime / 60); // Convert to minutes
                    
                    // Hide the routing instructions container
                    setTimeout(() => {
                        const container = routingControl.getContainer();
                        if (container) {
                            container.style.display = 'none';
                        }
                    }, 100);
                    
                    resolve({
                        distance: parseFloat(distance),
                        time: time,
                        routeControl: routingControl,
                        coordinates: route.coordinates
                    });
                } else {
                    reject(new Error('No route found'));
                }
            });

            routingControl.on('routingerror', function(e) {
                reject(new Error('Routing error: ' + e.error));
            });

            // Initialize the routing (but don't add to map yet)
            routingControl.route();
            
        } catch (error) {
            reject(error);
        }
    });
}

// Process uploaded data with road distance calculation (FPS to School matrix)
async function processDataWithRoadDistances(data) {
    const mandals = {};
    const allDistances = [];
    let processed = 0;

    // First pass: collect all unique FPS and School locations
    const fpsPoints = new Map(); // shopNo -> {lat, lon, mandal}
    const schoolPoints = new Map(); // schoolName -> {lat, lon, mandal}

    data.forEach(row => {
        const mandalName = row['Mandal name'] || row['Mandal_name'] || '';
        const mandalCode = row['Mandal code'] || row['Mandal_code'] || '';
        const schoolName = row['name_of_the_school'] || '';
        const fpsLat = parseFloat(row['FPS Lattitude'] || row['FPS_Lattitude'] || 0);
        const fpsLon = parseFloat(row['FPS Logitude'] || row['FPS_Longitude'] || 0);
        const schoolLat = parseFloat(row['School Lattitude'] || row['School_Lattitude'] || 0);
        const schoolLon = parseFloat(row['School Longitude'] || row['School_Longitude'] || 0);
        const shopNo = row['shop_no'] || row['MLS name'] || '';
        const totalStudents = parseInt(row['Total Students'] || row['total_students'] || 0);

        // Initialize mandal if not exists
        if (!mandals[mandalName]) {
            mandals[mandalName] = {
                name: mandalName,
                code: mandalCode,
                fpsShops: new Set(),
                schools: new Set(),
                fpsCoords: new Map(),
                schoolCoords: new Map(),
                totalStudents: 0,
                distanceStats: {
                    lessThan1km: 0,
                    between1to2km: 0,
                    between2to5km: 0,
                    moreThan5km: 0
                }
            };
        }

        const mandal = mandals[mandalName];

        // Collect unique FPS points
        if (fpsLat && fpsLon && shopNo && !fpsPoints.has(shopNo)) {
            fpsPoints.set(shopNo, {lat: fpsLat, lon: fpsLon, mandal: mandalName});
            mandal.fpsShops.add(shopNo);
            mandal.fpsCoords.set(shopNo, {lat: fpsLat, lon: fpsLon, shop: shopNo});
        }

        // Collect unique School points
        if (schoolLat && schoolLon && schoolName && !schoolPoints.has(schoolName)) {
            schoolPoints.set(schoolName, {lat: schoolLat, lon: schoolLon, mandal: mandalName, students: totalStudents});
            mandal.schools.add(schoolName);
            mandal.schoolCoords.set(schoolName, {lat: schoolLat, lon: schoolLon, name: schoolName});
            mandal.totalStudents += totalStudents;
        }
    });

    const totalCalculations = fpsPoints.size * schoolPoints.size;
    console.log(`Will calculate ${totalCalculations} distances (${fpsPoints.size} FPS × ${schoolPoints.size} Schools)`);

    document.getElementById('progressSection').style.display = 'block';

    // Calculate distance from every FPS to every School
    const schoolNearestFPS = new Map(); // schoolName -> {nearestFPS, distance, time, routeControl}

    for (const [fpsShop, fpsData] of fpsPoints) {
        for (const [schoolName, schoolData] of schoolPoints) {
            try {
                updateProgress(processed, totalCalculations, 
                    `Calculating: ${fpsShop} → ${schoolName} (${processed + 1}/${totalCalculations})`);

                const routeInfo = await calculateRoadDistance(
                    fpsData.lat, fpsData.lon, 
                    schoolData.lat, schoolData.lon
                );

                const distance = routeInfo.distance;
                console.log(`${fpsShop} → ${schoolName}: ${distance}km`);

                // Store all distance combinations for the table
                allDistances.push({
                    shopNo: fpsShop,
                    schoolName: schoolName,
                    distance: distance,
                    time: routeInfo.time,
                    mandal: fpsData.mandal,
                    routeControl: routeInfo.routeControl,
                    fpsCoords: {lat: fpsData.lat, lon: fpsData.lon},
                    schoolCoords: {lat: schoolData.lat, lon: schoolData.lon}
                });

                // Check if this is the nearest FPS for this school
                if (!schoolNearestFPS.has(schoolName) || 
                    distance < schoolNearestFPS.get(schoolName).distance) {
                    
                    schoolNearestFPS.set(schoolName, {
                        nearestFPS: fpsShop,
                        distance: distance,
                        time: routeInfo.time,
                        routeControl: routeInfo.routeControl,
                        fpsCoords: {lat: fpsData.lat, lon: fpsData.lon},
                        schoolCoords: {lat: schoolData.lat, lon: schoolData.lon},
                        mandal: schoolData.mandal
                    });
                }

                // Delay to avoid overwhelming the routing service
                await new Promise(resolve => setTimeout(resolve, 150));

            } catch (error) {
                console.warn(`Could not calculate route for ${fpsShop} to ${schoolName}:`, error);
                
                // Use straight-line distance as fallback
                const straightDistance = calculateStraightDistance(
                    fpsData.lat, fpsData.lon, 
                    schoolData.lat, schoolData.lon
                );

                console.log(`${fpsShop} → ${schoolName}: ${straightDistance}km (estimated)`);

                allDistances.push({
                    shopNo: fpsShop,
                    schoolName: schoolName,
                    distance: straightDistance,
                    time: Math.round(straightDistance * 2),
                    mandal: fpsData.mandal,
                    routeControl: null,
                    fpsCoords: {lat: fpsData.lat, lon: fpsData.lon},
                    schoolCoords: {lat: schoolData.lat, lon: schoolData.lon},
                    isEstimated: true
                });

                // Check if this is the nearest FPS for this school (fallback)
                if (!schoolNearestFPS.has(schoolName) || 
                    straightDistance < schoolNearestFPS.get(schoolName).distance) {
                    
                    schoolNearestFPS.set(schoolName, {
                        nearestFPS: fpsShop,
                        distance: straightDistance,
                        time: Math.round(straightDistance * 2),
                        routeControl: null,
                        fpsCoords: {lat: fpsData.lat, lon: fpsData.lon},
                        schoolCoords: {lat: schoolData.lat, lon: schoolData.lon},
                        mandal: schoolData.mandal,
                        isEstimated: true
                    });
                }
            }

            processed++;
            updateProgress(processed, totalCalculations);
        }
    }

    // Now calculate statistics based on nearest FPS for each school
    console.log('Calculating statistics based on nearest FPS for each school...');
    schoolNearestFPS.forEach((nearestData, schoolName) => {
        const mandal = mandals[nearestData.mandal];
        if (mandal) {
            const distance = nearestData.distance;
            if (distance < 1) {
                mandal.distanceStats.lessThan1km++;
            } else if (distance < 2) {
                mandal.distanceStats.between1to2km++;
            } else if (distance < 5) {
                mandal.distanceStats.between2to5km++;
            } else {
                mandal.distanceStats.moreThan5km++;
            }
            
            console.log(`${schoolName} nearest to ${nearestData.nearestFPS} at ${distance}km`);
        }
    });

    // Log final statistics
    Object.values(mandals).forEach(mandal => {
        console.log(`${mandal.name} Final Statistics:`, mandal.distanceStats);
    });

    document.getElementById('progressSection').style.display = 'none';
    
    return { 
        mandals, 
        distances: allDistances,
        nearestFPSForSchools: schoolNearestFPS
    };
}

// Straight-line distance calculation (fallback)
function calculateStraightDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update progress bar
function updateProgress(current, total, message = '') {
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = 
        message || `Processing... ${current}/${total} (${Math.round(percentage)}%)`;
}

// Enhanced display summary with new format (removed "0 Students" and "See tab 'Raw Data' for details")
function displaySummary(mandalData, nearestFPSData) {
    const mandals = Object.values(mandalData);
    
    if (mandals.length === 0) return;
    
    let combinedStats = {
        name: mandals.length > 1 ? "ALL MANDALS" : mandals[0].name.toUpperCase(),
        totalFPS: 0,
        totalSchools: 0,
        totalStudents: 0,
        fpsSupplyingSchools: 0,
        distanceStats: {
            lessThan1km: 0,
            between1to2km: 0,
            between2to5km: 0,
            moreThan5km: 0
        }
    };

    // Combine stats from all mandals
    mandals.forEach(mandal => {
        combinedStats.totalFPS += mandal.fpsShops.size;
        combinedStats.totalSchools += mandal.schools.size;
        combinedStats.totalStudents += mandal.totalStudents;
        combinedStats.distanceStats.lessThan1km += mandal.distanceStats.lessThan1km;
        combinedStats.distanceStats.between1to2km += mandal.distanceStats.between1to2km;
        combinedStats.distanceStats.between2to5km += mandal.distanceStats.between2to5km;
        combinedStats.distanceStats.moreThan5km += mandal.distanceStats.moreThan5km;
    });

    // Calculate FPS that are supplying schools (assuming those with schools within 2km)
    const uniqueSupplyingFPS = new Set();
    nearestFPSData.forEach((nearestData, schoolName) => {
        if (nearestData.distance <= 2) {
            uniqueSupplyingFPS.add(nearestData.nearestFPS);
        }
    });
    combinedStats.fpsSupplyingSchools = uniqueSupplyingFPS.size;

    document.getElementById('mandalHeader').textContent = `${combinedStats.name} Mandal`;

    // Build summary HTML without "0 Students" and "See tab 'Raw Data' for details"
    let summaryHTML = `
        <div class="summary-line bold">${combinedStats.totalFPS} FPS shops</div>
        <div class="summary-line bold">${combinedStats.totalSchools} Government run Schools</div>`;
    
    // Only show students if count is greater than 0
    if (combinedStats.totalStudents > 0) {
        summaryHTML += `<div class="summary-line bold spacing">${combinedStats.totalStudents.toLocaleString()} Students</div>`;
    } else {
        summaryHTML += `<div class="summary-line bold spacing"></div>`;
    }
    
    summaryHTML += `
        <div class="summary-line">* Pvt excluded</div>
        <div class="summary-line spacing">${combinedStats.fpsSupplyingSchools} FPS Shops supply schools</div>
        <div class="summary-line spacing">${combinedStats.distanceStats.lessThan1km} Schools are less than 1 km Away from FPS</div>
        <div class="summary-line">${combinedStats.distanceStats.between1to2km} Schools are between 1-2 km away from FPS</div>
        <div class="summary-line">${combinedStats.distanceStats.between2to5km} Schools are between 2-5 kms way from FPS</div>
        <div class="summary-line spacing">${combinedStats.distanceStats.moreThan5km} Schools are more than 5 Kms Away from FPS</div>
    `;

    document.getElementById('summaryStats').innerHTML = summaryHTML;

    // Log for debugging
    console.log('Combined Statistics (based on nearest FPS per school):', combinedStats);
}

// PDF download handler
document.getElementById('downloadPdfBtn').addEventListener('click', async function() {
    const summaryCard = document.querySelector('.summary-card');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
    });

    // Hide the button for PDF
    const btn = summaryCard.querySelector('#downloadPdfBtn');
    if (btn) btn.style.display = 'none';

    await doc.html(summaryCard, {
        callback: function (doc) {
            doc.save('FPS_School_Summary.pdf');
            if (btn) btn.style.display = ''; // Restore button
        },
        margin: [20, 20, 20, 20],
        autoPaging: true,
        x: 10,
        y: 10,
        width: 500,
        windowWidth: 800
    });
});

// Add markers to map with enhanced data
function addMarkersToMap(mandalData, distances, nearestFPSData) {
    clearMap();
    let bounds = [];

    Object.values(mandalData).forEach(mandal => {
        // Add FPS markers
        mandal.fpsCoords.forEach((coord, shopNo) => {
            // Count how many schools this FPS is nearest to
            let schoolsServed = 0;
            nearestFPSData.forEach((nearestData, schoolName) => {
                if (nearestData.nearestFPS === shopNo) {
                    schoolsServed++;
                }
            });

            const marker = L.circleMarker([coord.lat, coord.lon], {
                color: '#c0392b',
                fillColor: '#e74c3c',
                fillOpacity: 0.8,
                radius: Math.max(10, Math.min(20, 8 + schoolsServed * 2)), // Size based on schools served
                weight: 3
            }).addTo(map);

            marker.bindPopup(`
                <strong>🏪 Fair Price Shop</strong><br>
                Shop: ${shopNo}<br>
                Mandal: ${mandal.name}<br>
                <strong>Nearest to ${schoolsServed} school(s)</strong><br>
                Coordinates: ${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}
            `);

            fpsMarkers.push(marker);
            bounds.push([coord.lat, coord.lon]);
        });

        // Add School markers
        mandal.schoolCoords.forEach((coord, schoolName) => {
            const nearestFPSInfo = nearestFPSData.get(schoolName);
            let markerColor = '#3498db'; // Default blue
            let fillColor = '#3498db';

            // Color code based on distance to nearest FPS
            if (nearestFPSInfo) {
                if (nearestFPSInfo.distance < 1) {
                    markerColor = '#27ae60'; // Green for < 1km
                    fillColor = '#2ecc71';
                } else if (nearestFPSInfo.distance < 2) {
                    markerColor = '#f39c12'; // Orange for 1-2km
                    fillColor = '#e67e22';
                } else if (nearestFPSInfo.distance < 5) {
                    markerColor = '#e67e22'; // Dark orange for 2-5km
                    fillColor = '#d35400';
                } else {
                    markerColor = '#e74c3c'; // Red for > 5km
                    fillColor = '#c0392b';
                }
            }

            const marker = L.circleMarker([coord.lat, coord.lon], {
                color: markerColor,
                fillColor: fillColor,
                fillOpacity: 0.8,
                radius: 10,
                weight: 3
            }).addTo(map);

            const popupContent = nearestFPSInfo ? `
                <strong>🏫 Government School</strong><br>
                Name: ${schoolName}<br>
                Mandal: ${mandal.name}<br>
                <strong>Nearest FPS:</strong> ${nearestFPSInfo.nearestFPS}<br>
                <strong>Distance:</strong> ${nearestFPSInfo.distance.toFixed(2)}km<br>
                <strong>Travel Time:</strong> ${nearestFPSInfo.time} min<br>
                Coordinates: ${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}
            ` : `
                <strong>🏫 Government School</strong><br>
                Name: ${schoolName}<br>
                Mandal: ${mandal.name}<br>
                Coordinates: ${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}
            `;

            marker.bindPopup(popupContent);

            schoolMarkers.push(marker);
            bounds.push([coord.lat, coord.lon]);
        });
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }

    // Populate distance table with all combinations
    populateDistanceTable(distances);
}

// Populate distance table
function populateDistanceTable(distances) {
    const tbody = document.getElementById('distanceTableBody');
    tbody.innerHTML = '';

    distances.sort((a, b) => a.distance - b.distance);

    distances.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.shopNo}</td>
            <td>${item.schoolName}</td>
            <td>${item.distance.toFixed(2)} km ${item.isEstimated ? '(est.)' : ''}</td>
            <td>${item.time} min</td>
            <td>${item.mandal}</td>
            <td>
                <button class="btn btn-primary" onclick="showSingleRoute(${index})" style="font-size: 0.8em; padding: 4px 8px;">
                    Show Route
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show single route
function showSingleRoute(index) {
    clearRoutes();
    const item = distanceData[index];
    
    if (item.routeControl) {
        // Add the existing route control to map
        item.routeControl.addTo(map);
        routeControls.push(item.routeControl);
        
        // Update route line style to be visible and prominent
        setTimeout(() => {
            const routeContainer = item.routeControl.getContainer();
            if (routeContainer) {
                const routeLine = routeContainer.querySelector('.leaflet-routing-container');
                if (routeLine) {
                    routeLine.style.display = 'none'; // Hide the text directions
                }
            }
        }, 100);
        
        // Fit map to show the route
        const bounds = L.latLngBounds([
            [item.fpsCoords.lat, item.fpsCoords.lon],
            [item.schoolCoords.lat, item.schoolCoords.lon]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
        
    } else {
        // If no route control exists, create a new one
        createAndShowRoute(item, index);
    }
}

// Create and show a new route
async function createAndShowRoute(item, index) {
    try {
        const waypoints = [
            L.latLng(item.fpsCoords.lat, item.fpsCoords.lon),
            L.latLng(item.schoolCoords.lat, item.schoolCoords.lon)
        ];

        const routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            createMarker: function() { return null; }, // Don't create additional markers
            lineOptions: {
                styles: [{ 
                    color: '#f39c12', 
                    weight: 5, 
                    opacity: 0.8,
                    dashArray: '10, 5'
                }]
            },
            show: false, // Don't show the instruction panel
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);

        // Hide the routing instructions panel
        routingControl.on('routesfound', function(e) {
            const container = routingControl.getContainer();
            if (container) {
                container.style.display = 'none';
            }
        });

        routeControls.push(routingControl);
        // Store for future use
        item.routeControl = routingControl;
        distanceData[index].routeControl = routingControl;
    } catch (error) {
        console.error('Error creating display route:', error);
    }
}

// Show all routes
function showAllRoutes() {
    clearRoutes();
    let routesShown = 0;
    const maxRoutes = 10; // Limit to prevent map overcrowding
    
    distanceData.slice(0, maxRoutes).forEach((item, index) => {
        if (item.routeControl) {
            item.routeControl.addTo(map);
            routeControls.push(item.routeControl);
            
            // Hide instruction panels
            setTimeout(() => {
                const container = item.routeControl.getContainer();
                if (container) {
                    container.style.display = 'none';
                }
            }, 100);
            
            routesShown++;
        } else {
            // Create route if it doesn't exist
            createRouteForDisplay(item, index);
            routesShown++;
        }
    });
    
    if (routesShown > 0) {
        alert(`Showing ${routesShown} routes (limited to ${maxRoutes} for performance)`);
    }
}

// Create route for display purposes
async function createRouteForDisplay(item, index) {
    try {
        const waypoints = [
            L.latLng(item.fpsCoords.lat, item.fpsCoords.lon),
            L.latLng(item.schoolCoords.lat, item.schoolCoords.lon)
        ];

        const routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            createMarker: function() { return null; },
            lineOptions: {
                styles: [{
                    color: '#f39c12',
                    weight: 5,
                    opacity: 0.8,
                    dashArray: '10, 5'
                }]
            },
            show: false,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);

        // Hide the routing instructions panel
        routingControl.on('routesfound', function(e) {
            const container = routingControl.getContainer();
            if (container) {
                container.style.display = 'none';
            }
        });

        routeControls.push(routingControl);
        // Store for future use
        item.routeControl = routingControl;
        distanceData[index].routeControl = routingControl;
    } catch (error) {
        console.error('Error creating display route:', error);
    }
}

// Show only nearest routes (< 2km)
function showNearestRoutes() {
    clearRoutes();
    const nearestRoutes = distanceData.filter(item => item.distance < 2);
    
    nearestRoutes.forEach((item, index) => {
        if (item.routeControl) {
            item.routeControl.addTo(map);
            routeControls.push(item.routeControl);
            
            // Hide instruction panels
            setTimeout(() => {
                const container = item.routeControl.getContainer();
                if (container) {
                    container.style.display = 'none';
                }
            }, 100);
        } else {
            // Create route if it doesn't exist
            createRouteForDisplay(item, index);
        }
    });
    
    if (nearestRoutes.length > 0) {
        alert(`Showing ${nearestRoutes.length} routes under 2km`);
    } else {
        alert('No routes found under 2km');
    }
}

// Clear all routes
function clearRoutes() {
    routeControls.forEach(control => {
        map.removeControl(control);
    });
    routeControls = [];
}

// Clear map
function clearMap() {
    fpsMarkers.forEach(marker => map.removeLayer(marker));
    schoolMarkers.forEach(marker => map.removeLayer(marker));
    clearRoutes();
    fpsMarkers = [];
    schoolMarkers = [];
}

// Handle file upload
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('content').style.display = 'block';
    document.getElementById('summaryStats').innerHTML = '<div class="loading">Processing CSV data</div>';

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: async function(results) {
            try {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }

                if (results.data.length === 0) {
                    throw new Error('No data found in CSV file');
                }

                // Initialize map if not already done
                if (!map) {
                    initMap();
                }

                // Process data with road distance calculations
                const processedResult = await processDataWithRoadDistances(results.data);
                processedData = processedResult.mandals;
                distanceData = processedResult.distances;
                const nearestFPSData = processedResult.nearestFPSForSchools;

                if (Object.keys(processedData).length === 0) {
                    throw new Error('No valid mandal data found in CSV');
                }

                // Display results with nearest FPS analysis
                displaySummary(processedData, nearestFPSData);
                addMarkersToMap(processedData, distanceData, nearestFPSData);

                console.log(`Processed ${distanceData.length} total distance calculations`);
                console.log(`Found nearest FPS for ${nearestFPSData.size} schools`);

            } catch (error) {
                document.getElementById('summaryStats').innerHTML = 
                    `<div class="error">Error processing data: ${error.message}</div>`;
                console.error('Error processing CSV:', error);
                document.getElementById('progressSection').style.display = 'none';
            }
        },
        error: function(error) {
            document.getElementById('summaryStats').innerHTML = 
                `<div class="error">Error reading CSV file: ${error.message}</div>`;
            console.error('CSV parsing error:', error);
            document.getElementById('progressSection').style.display = 'none';
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('FPS & School Road Distance Dashboard loaded');
});