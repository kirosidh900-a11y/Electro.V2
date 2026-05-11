// This module is intentionally imported FIRST in index.js.
// ES module imports are hoisted, so dotenv.config() called in the module body
// of index.js would run AFTER all other imports have already evaluated — too late
// for razorpay.config.js, db.js, etc. to see the env vars.
// Importing this file as the very first import ensures env vars are available
// when every other module is first evaluated.

import dotenv from "dotenv";

dotenv.config();
