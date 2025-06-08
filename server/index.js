const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile);

app.use(cors());
app.use(express.json());

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS computers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventoryNumber TEXT,
      building TEXT,
      location TEXT,
      deviceType TEXT,
      model TEXT,
      processor TEXT,
      ram TEXT,
      storage TEXT,
      graphics TEXT,
      ipAddress TEXT,
      computerName TEXT,
      year TEXT,
      notes TEXT,
      status TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS networkDevices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      model TEXT,
      building TEXT,
      location TEXT,
      ipAddress TEXT,
      login TEXT,
      password TEXT,
      wifiName TEXT,
      wifiPassword TEXT,
      notes TEXT,
      status TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS otherDevices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      model TEXT,
      building TEXT,
      location TEXT,
      responsible TEXT,
      inventoryNumber TEXT,
      notes TEXT,
      status TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS assignedDevices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee TEXT,
      position TEXT,
      building TEXT,
      devices TEXT,
      assignedDate TEXT,
      notes TEXT
    )`);
  });
}

function createRoutes(type) {
  app.get(`/${type}`, (req, res) => {
    db.all(`SELECT * FROM ${type}`, (err, rows) => {
      if (err) return res.status(500).json({error: err.message});
      res.json(rows);
    });
  });

  app.get(`/${type}/:id`, (req, res) => {
    db.get(`SELECT * FROM ${type} WHERE id=?`, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({error: err.message});
      if (!row) return res.status(404).end();
      res.json(row);
    });
  });

  app.post(`/${type}`, (req, res) => {
    const data = req.body;
    const fields = Object.keys(data).join(',');
    const placeholders = Object.keys(data).map(() => '?').join(',');
    db.run(
      `INSERT INTO ${type} (${fields}) VALUES (${placeholders})`,
      Object.values(data),
      function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({id: this.lastID, ...data});
      }
    );
  });

  app.put(`/${type}/:id`, (req, res) => {
    const data = req.body;
    const assignments = Object.keys(data).map(key => `${key}=?`).join(',');
    db.run(
      `UPDATE ${type} SET ${assignments} WHERE id=?`,
      [...Object.values(data), req.params.id],
      function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({id: Number(req.params.id), ...data});
      }
    );
  });

  app.delete(`/${type}/:id`, (req, res) => {
    db.run(`DELETE FROM ${type} WHERE id=?`, [req.params.id], function(err) {
      if (err) return res.status(500).json({error: err.message});
      res.json({success: true});
    });
  });
}

['computers','networkDevices','otherDevices','assignedDevices'].forEach(createRoutes);

init();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
