# AVKomp

This project is a simple equipment management web application. A small Node.js server is used to store data in a SQLite database and expose REST endpoints.

## Running the server

1. Install dependencies (requires internet access):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
   The server listens on port `3000` by default.

The database file `data.db` will be created automatically in the `server` folder.

## REST API

The server exposes the following resource endpoints:
- `/computers`
- `/networkDevices`
- `/otherDevices`
- `/assignedDevices`

Each endpoint supports `GET`, `POST`, `PUT`, and `DELETE` requests.

## Front‑end

Open `index.html` in a browser. The front‑end uses `database.js` to interact with the REST API using `fetch`.
