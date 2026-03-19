const express = require('express');
const router = express.Router();
const { getDistanceKm } = require('../utils/geo.util');

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

/**
 * GET /api/utils/distance?lat1=...&lng1=...&lat2=...&lng2=...
 * Returns road distance (via OpenRouteService) with Haversine fallback.
 */
router.get('/distance', async (req, res) => {
    const { lat1, lng1, lat2, lng2 } = req.query;

    const coords = [lat1, lng1, lat2, lng2].map(Number);
    if (coords.some(isNaN)) {
        return res.status(400).json({ message: 'Thiếu hoặc sai tọa độ (lat1, lng1, lat2, lng2).' });
    }

    const [cLat1, cLng1, cLat2, cLng2] = coords;

    // Try OpenRouteService for real road distance
    if (ORS_API_KEY) {
        try {
            const url = `${ORS_BASE_URL}?api_key=${ORS_API_KEY}&start=${cLng1},${cLat1}&end=${cLng2},${cLat2}`;
            const response = await fetch(url);
            const data = await response.json();

            const segment = data?.features?.[0]?.properties?.segments?.[0];
            if (segment) {
                return res.json({
                    distance_km: Math.round((segment.distance / 1000) * 100) / 100,
                    distance_m: Math.round(segment.distance),
                    duration_min: Math.round(segment.duration / 60),
                    source: 'openrouteservice',
                });
            }
        } catch {
            // Fall through to Haversine
        }
    }

    // Fallback: Haversine straight-line distance
    const distanceKm = getDistanceKm(cLat1, cLng1, cLat2, cLng2);

    return res.json({
        distance_km: Math.round(distanceKm * 100) / 100,
        distance_m: Math.round(distanceKm * 1000),
        duration_min: null,
        source: 'haversine',
    });
});

module.exports = router;
