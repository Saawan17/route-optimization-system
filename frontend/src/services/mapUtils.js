import axios from 'axios';

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjRjYmRiY2Y4NWQ5ODQ4M2JhMWM2YTBlMDg3MWUzMmFjIiwiaCI6Im11cm11cjY0In0="; // 🔑 replace with your key

export const getDrivingRoute = async (start, end) => {
    try {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
        const res = await axios.get(url);
        const coords = res.data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const distanceKm = res.data.features[0].properties.summary.distance / 1000;
        const durationMin = res.data.features[0].properties.summary.duration / 60;
        return { coords, distanceKm, durationMin };
    } catch (err) {
        console.error("❌ Failed to fetch route", err);
        return null;
    }
};
