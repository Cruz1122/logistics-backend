const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client();

/**
 * Geocodes an address using the Google Maps API.
 * Returns the latitude and longitude of the first result.
 * Throws an error if the address cannot be geocoded.
 * @param {string} address - The address to geocode.
 * @returns {Promise<{lat: number, lng: number}>} The latitude and longitude.
 */
async function geocode(address) {
  const res = await client.geocode({
    params: {
      address,
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });
  const result = res.data.results?.[0];
  if (!result) throw new Error("No se pudo geocodificar la dirección");
  const { lat, lng } = result.geometry.location;
  return { lat, lng };
}

module.exports = { geocode };