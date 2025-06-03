const twilio = require("twilio");
require("dotenv").config();

/**
 * Initializes the Twilio client using environment variables for account SID and auth token.
 * This client can be used to send SMS, make calls, and use other Twilio services.
 */
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


module.exports = { client };