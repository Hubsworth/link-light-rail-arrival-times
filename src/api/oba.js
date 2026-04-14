import axios from 'axios';

const API_KEY = '5654bb33-edab-4322-8688-94b9d262abe4';
const BASE_URL = 'https://api.pugetsound.onebusaway.org/api/where';

export const fetchArrivals = async (stopId) => {
  try {
    const response = await axios.get(`${BASE_URL}/arrivals-and-departures-for-stop/${stopId}.json`, {
      params: {
        key: API_KEY,
        minutesAfter: 60,
      },
    });
    return {
      arrivals: response.data.data.entry.arrivalsAndDepartures,
      serverTime: response.data.currentTime
    };
  } catch (error) {
    console.error('Error fetching arrivals:', error);
    throw error;
  }
};

export const getRouteStops = async (routeId = '40_100479') => {
  try {
    const response = await axios.get(`${BASE_URL}/stops-for-route/${routeId}.json`, {
      params: { key: API_KEY },
    });
    
    const { stops } = response.data.data.references;
    const { stopGroupings } = response.data.data.entry;
    
    // 1. Map stops by ID for easy lookup
    const stopsById = {};
    stops.forEach(s => { stopsById[s.id] = s; });

    // 2. Identify Southbound (Dir 0) and Northbound (Dir 1) from stopGroupings
    // stopGroupings[0] is typically the Directions group
    const directionsGroup = stopGroupings[0].stopGroups;
    const southboundIds = directionsGroup.find(g => g.id === "0")?.stopIds || [];
    const northboundIds = directionsGroup.find(g => g.id === "1")?.stopIds || [];

    // 3. Group by parent or name
    // Many stations have a common parentId (e.g. 40_C03 for Westlake)
    const stations = {};

    stops.forEach(stop => {
      // Use parentId if it exists, otherwise use the stopId itself as the parent key
      const parentId = stop.parent || stop.id;
      
      // We only care about stops that are actually child platforms or terminal stops
      // Parents usually don't have arrivals associated, child platforms (with -T1 or -T2) do.
      if (!stations[parentId]) {
        stations[parentId] = {
          id: parentId,
          name: stop.name,
          nbStopId: null,
          sbStopId: null,
        };
      }

      // Assign to direction based on grouping
      if (northboundIds.includes(stop.id)) {
        stations[parentId].nbStopId = stop.id;
      } else if (southboundIds.includes(stop.id)) {
        stations[parentId].sbStopId = stop.id;
      }
    });

    // 4. Sort based on Southbound ID order (North to South)
    const sortedResult = southboundIds
      .map(id => {
        // Find which station object includes this stopId
        return Object.values(stations).find(s => s.sbStopId === id || s.nbStopId === id);
      })
      .filter((v, i, a) => v && a.indexOf(v) === i); // Remove duplicates and nulls

    return sortedResult;
  } catch (error) {
    console.error('Error getting route stops:', error);
    throw error;
  }
};
