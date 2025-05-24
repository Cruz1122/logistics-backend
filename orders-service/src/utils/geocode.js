const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client();

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
