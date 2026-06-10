/*
  # Enable pgcrypto Extension
  
  Enables the pgcrypto extension needed for password hashing in user creation function.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;