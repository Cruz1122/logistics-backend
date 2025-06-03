/**
 * Health check endpoint for the inventory service.
 * Responds with "OK" if the service is running, or "Unhealthy" if there is an error.
 * Useful for monitoring and readiness/liveness probes.
 */
const health = async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err); // Log the error details
    res.status(500).send("Unhealthy");
  }
};

module.exports = {
    health
};