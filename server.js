require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateToken, verifyToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3011;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(function (s) { return s.trim(); })
  : ["http://localhost:3000", "http://localhost:3011"];

app.use(cors({
  origin: corsOrigins
}));
app.use(express.json());
app.use(express.static(__dirname));

const dbConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function connectDB() {
  try {
    pool = await sql.connect(dbConfig);
    console.log("Connected to SQL Server database");
    await ensureTableExists();
  } catch (err) {
    console.error("Database connection failed:", err.message);
  }
}

async function ensureTableExists() {
  try {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AppData')
      CREATE TABLE AppData (
        DataKey NVARCHAR(100) PRIMARY KEY,
        DataValue NVARCHAR(MAX),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `);
    console.log("AppData table ensured");
  } catch (err) {
    console.error("Error ensuring AppData table:", err.message);
  }
}

function isBcryptHash(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"))
  );
}

async function verifyPassword(password, storedPassword) {
  if (!storedPassword || typeof storedPassword !== "string") {
    return false;
  }

  if (isBcryptHash(storedPassword)) {
    return await bcrypt.compare(password, storedPassword);
  }

  return password === storedPassword;
}

const STUDENT_TABLES = ["CSE", "CIVIL", "AIDS", "IT", "EEE", "ECE", "MECH"];

app.get("/api/db-status", async (req, res) => {
  try {
    if (!pool || !pool.connected) {
      await connectDB();
    }
    if (pool && pool.connected) {
      await pool.request().query("SELECT 1 AS connected");
      res.json({ connected: true, message: "Database connected" });
    } else {
      res.status(503).json({ connected: false, message: "Database not connected" });
    }
  } catch (err) {
    res.status(500).json({ connected: false, message: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { role, username, password } = req.body;

    if (role === "student") {
      if (!pool || !pool.connected) {
        await connectDB();
      }
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, message: "Database not available" });
      }

      for (const table of STUDENT_TABLES) {
        const query = `SELECT * FROM ${table} WHERE Register_No = @username`;
        const result = await pool
          .request()
          .input("username", sql.NVarChar, username)
          .query(query);

        if (result.recordset.length > 0) {
          const user = result.recordset[0];
          const storedPassword = user.password || "";

          const userData = {
            name: user.Student_Name || username,
            registerNumber: user.Register_No || username,
            dept: user.Dept || table,
            year: user.Year || "",
            sec: user.Sec || "",
            role: "student",
          };

          const validPassword = await verifyPassword(password, storedPassword);
          if (validPassword) {
            const token = generateToken({
              username: userData.registerNumber,
              role: userData.role,
            });

            if (isBcryptHash(storedPassword)) {
              return res.json({ success: true, message: "Login successful", user: userData, token });
            }

            return res.json({
              success: true,
              message: "You must set a new password before continuing.",
              needsPasswordChange: true,
              user: userData,
              token,
            });
          }

          return res.status(401).json({ success: false, message: "Invalid Register Number or Password" });
        }
      }

      return res.status(401).json({ success: false, message: "Invalid Register Number or Password" });
    }

    if (role === "hod") {
      if (!pool || !pool.connected) {
        await connectDB();
      }
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, message: "Database not available" });
      }

      const query = `SELECT * FROM HOD WHERE username = @username`;
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(query);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        const storedPassword = user.password || "";

        const userData = {
          name: user.username || username,
          registerNumber: user.username || username,
          role: "hod",
        };

        const validPassword = await verifyPassword(password, storedPassword);
        if (validPassword) {
          const token = generateToken({ username: userData.registerNumber, role: userData.role });

          if (isBcryptHash(storedPassword)) {
            return res.json({ success: true, message: "Login successful", user: userData, token });
          }

          return res.json({
            success: true,
            message: "You must set a new password before continuing.",
            needsPasswordChange: true,
            user: userData,
            token,
          });
        }

        return res.status(401).json({ success: false, message: "Invalid HOD ID or Password" });
      }

      return res.status(401).json({ success: false, message: "Invalid HOD ID or Password" });
    }

    if (role === "principal") {
      if (!pool || !pool.connected) {
        await connectDB();
      }
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, message: "Database not available" });
      }
      // Use the Principal table for principal logins (username/password fields)
      const query = `SELECT * FROM Principal WHERE username = @username`;
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(query);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        // Principal table uses `username` and `password`
        const storedPassword = user.password || user.Password || "";

        const userData = {
          name: user.username || username,
          registerNumber: user.username || username,
          role: "principal",
        };

        const validPassword = await verifyPassword(password, storedPassword);
        if (validPassword) {
          const token = generateToken({
            username: userData.registerNumber,
            role: userData.role,
          });
          return res.json({ success: true, message: "Login successful", user: userData, token });
        }

        return res.status(401).json({ success: false, message: "Invalid Principal ID or Password" });
      }

      return res.status(401).json({ success: false, message: "Invalid Principal ID or Password" });
    }

    if (role === "alumni") {
      if (!pool || !pool.connected) {
        await connectDB();
      }
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, message: "Database not available" });
      }

      const alumniTables = ["TeamLeaders", "TeamMembers", "Admin"];
      for (const table of alumniTables) {
        const colResult = await pool.request()
          .input("tbl", sql.NVarChar, table)
          .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl`);
        const cols = colResult.recordset.map(r => r.COLUMN_NAME);
        console.log(`[alumni] ${table} columns:`, cols);

        const idCandidates = ["Username", "username", "AdminID", "Name", "name", "LeaderID", "MemberID", "ID", "Email", "email", "AlumniID", "Alumni_Id", "UserID", "UserId"];
        const idCol = idCandidates.find(c => cols.includes(c));
        if (!idCol) {
          console.log(`[alumni] ${table}: no matching ID column found, skipping`);
          continue;
        }

        const pwdCandidates = ["password", "Password", "Pass", "pass", "Pwd", "pwd", "Passwd", "passwd"];
        const pwdCol = pwdCandidates.find(c => cols.includes(c));
        console.log(`[alumni] ${table}: using ID column="${idCol}", password column="${pwdCol}"`);

        const query = `SELECT * FROM ${table} WHERE ${idCol} = @username`;
        console.log(`[alumni] ${table} query:`, query, "value:", username);
        const result = await pool
          .request()
          .input("username", sql.NVarChar, username)
          .query(query);
        console.log(`[alumni] ${table} rows found:`, result.recordset.length);

        if (result.recordset.length > 0) {
          const user = result.recordset[0];
          console.log(`[alumni] ${table} matched user keys:`, Object.keys(user));
          const storedPassword = pwdCol ? (user[pwdCol] || "") : "";
          console.log(`[alumni] stored password length:`, storedPassword.length);

          const userData = {
            name: user.Name || user.name || user.Username || user.username || user.AdminID || user.AlumniID || username,
            registerNumber: user.Username || user.username || user.AdminID || user.AlumniID || user.Name || user.name || username,
            role: "alumni",
          };

          const validPassword = await verifyPassword(password, storedPassword);
          console.log(`[alumni] password valid:`, validPassword);
          if (validPassword) {
            const token = generateToken({
              username: userData.registerNumber,
              role: userData.role,
            });

            if (isBcryptHash(storedPassword)) {
              return res.json({ success: true, message: "Login successful", user: userData, token });
            }

            return res.json({
              success: true,
              message: "You must set a new password before continuing.",
              needsPasswordChange: true,
              user: userData,
              token,
            });
          }

          return res.status(401).json({ success: false, message: "Invalid Alumni ID or Password" });
        }
      }

      return res.status(401).json({ success: false, message: "Invalid Alumni ID or Password" });
    }

    if (role === "admin") {
      if (!pool || !pool.connected) {
        await connectDB();
      }
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, message: "Database not available" });
      }

      const query = `SELECT * FROM Admin WHERE username = @username`;
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(query);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        const storedPassword = user.Password || "";

        const userData = {
          name: "Administrator",
          registerNumber: user.username || username,
          role: "admin",
        };

        const validPassword = await verifyPassword(password, storedPassword);
        if (validPassword) {
          const token = generateToken({
            username: userData.registerNumber,
            role: userData.role,
          });

          if (isBcryptHash(storedPassword)) {
            return res.json({ success: true, message: "Login successful", user: userData, token });
          }

          return res.json({
            success: true,
            message: "You must set a new password before continuing.",
            needsPasswordChange: true,
            user: userData,
            token,
          });
        }

        return res.status(401).json({ success: false, message: "Invalid Admin ID or Password" });
      }

      return res.status(401).json({ success: false, message: "Invalid Admin ID or Password" });
    }

    return res.status(400).json({ success: false, message: "Invalid role" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/change-password", async (req, res) => {
  try {
    const { registerNumber, currentPassword, newPassword, role } = req.body;

    if (!registerNumber || !currentPassword || !newPassword || !role) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter" });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one lowercase letter" });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one number" });
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one special character" });
    }
    if (/mzcet/i.test(newPassword)) {
      return res.status(400).json({ success: false, message: "New password cannot be similar to the default password" });
    }

    if (!pool || !pool.connected) {
      await connectDB();
    }
    if (!pool || !pool.connected) {
      return res.status(503).json({ success: false, message: "Database not available" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Handle Student role
    if (role === "student") {
      for (const table of STUDENT_TABLES) {
        const query = `SELECT * FROM ${table} WHERE Register_No = @registerNumber`;
        const result = await pool
          .request()
          .input("registerNumber", sql.NVarChar, registerNumber)
          .query(query);

        if (result.recordset.length > 0) {
          const storedPassword = result.recordset[0].password || "";
          const validCurrent = await verifyPassword(currentPassword, storedPassword);

          if (!validCurrent) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
          }

          const updateQuery = `UPDATE ${table} SET password = @newPassword WHERE Register_No = @registerNumber`;
          await pool
            .request()
            .input("newPassword", sql.NVarChar, hashedPassword)
            .input("registerNumber", sql.NVarChar, registerNumber)
            .query(updateQuery);

          return res.json({ success: true, message: "Password changed successfully" });
        }
      }
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Handle HOD role
    if (role === "hod") {
      const query = `SELECT * FROM HOD WHERE username = @registerNumber`;
      const result = await pool
        .request()
        .input("registerNumber", sql.NVarChar, registerNumber)
        .query(query);

      if (result.recordset.length > 0) {
        const storedPassword = result.recordset[0].password || "";
        const validCurrent = await verifyPassword(currentPassword, storedPassword);

        if (!validCurrent) {
          return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        const updateQuery = `UPDATE HOD SET password = @newPassword WHERE username = @registerNumber`;
        await pool
          .request()
          .input("newPassword", sql.NVarChar, hashedPassword)
          .input("registerNumber", sql.NVarChar, registerNumber)
          .query(updateQuery);

        return res.json({ success: true, message: "Password changed successfully" });
      }
      return res.status(404).json({ success: false, message: "HOD not found" });
    }

    // Handle Principal role
    if (role === "principal") {
      const query = `SELECT * FROM Principal WHERE username = @registerNumber`;
      const result = await pool
        .request()
        .input("registerNumber", sql.NVarChar, registerNumber)
        .query(query);

      if (result.recordset.length > 0) {
        const storedPassword = result.recordset[0].password || result.recordset[0].Password || "";
        const validCurrent = await verifyPassword(currentPassword, storedPassword);

        if (!validCurrent) {
          return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        const updateQuery = `UPDATE Principal SET password = @newPassword WHERE username = @registerNumber`;
        await pool
          .request()
          .input("newPassword", sql.NVarChar, hashedPassword)
          .input("registerNumber", sql.NVarChar, registerNumber)
          .query(updateQuery);

        return res.json({ success: true, message: "Password changed successfully" });
      }
      return res.status(404).json({ success: false, message: "Principal not found" });
    }

    // Handle Alumni role
    if (role === "alumni") {
      const alumniTables = ["TeamLeaders", "TeamMembers", "Admin"];
      for (const table of alumniTables) {
        const colResult = await pool.request()
          .input("tbl", sql.NVarChar, table)
          .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl`);
        const cols = colResult.recordset.map(r => r.COLUMN_NAME);

        const idCandidates = ["Username", "username", "AdminID", "Name", "name", "LeaderID", "MemberID", "ID", "Email", "email", "AlumniID", "Alumni_Id", "UserID", "UserId"];
        const idCol = idCandidates.find(c => cols.includes(c));
        if (!idCol) continue;

        const pwdCandidates = ["password", "Password", "Pass", "pass", "Pwd", "pwd", "Passwd", "passwd"];
        const pwdCol = pwdCandidates.find(c => cols.includes(c));

        const query = `SELECT * FROM ${table} WHERE ${idCol} = @registerNumber`;
        const result = await pool
          .request()
          .input("registerNumber", sql.NVarChar, registerNumber)
          .query(query);

        if (result.recordset.length > 0) {
          const storedPassword = pwdCol ? (result.recordset[0][pwdCol] || "") : "";
          const validCurrent = await verifyPassword(currentPassword, storedPassword);

          if (!validCurrent) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
          }

          const updateQuery = `UPDATE ${table} SET ${pwdCol} = @newPassword WHERE ${idCol} = @registerNumber`;
          await pool
            .request()
            .input("newPassword", sql.NVarChar, hashedPassword)
            .input("registerNumber", sql.NVarChar, registerNumber)
            .query(updateQuery);

          return res.json({ success: true, message: "Password changed successfully" });
        }
      }
      return res.status(404).json({ success: false, message: "Alumni not found" });
    }

    // Handle Admin role
    if (role === "admin") {
      const query = `SELECT * FROM Admin WHERE username = @registerNumber`;
      const result = await pool
        .request()
        .input("registerNumber", sql.NVarChar, registerNumber)
        .query(query);

      if (result.recordset.length > 0) {
        const storedPassword = result.recordset[0].Password || "";
        const validCurrent = await verifyPassword(currentPassword, storedPassword);

        if (!validCurrent) {
          return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        const updateQuery = `UPDATE Admin SET Password = @newPassword WHERE username = @registerNumber`;
        await pool
          .request()
          .input("newPassword", sql.NVarChar, hashedPassword)
          .input("registerNumber", sql.NVarChar, registerNumber)
          .query(updateQuery);

        return res.json({ success: true, message: "Password changed successfully" });
      }
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    return res.status(400).json({ success: false, message: "Invalid role" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const crypto = require("crypto");
const resetTokens = {};

app.post("/api/forgot-verify", async (req, res) => {
  try {
    const { registerNumber, dob } = req.body;

    if (!registerNumber || !dob) {
      return res.status(400).json({ success: false, message: "Register Number and Date of Birth are required" });
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      return res.status(400).json({ success: false, message: "Date of Birth must be in DD/MM/YYYY format" });
    }

    if (!pool || !pool.connected) {
      await connectDB();
    }
    if (!pool || !pool.connected) {
      return res.status(503).json({ success: false, message: "Database not available" });
    }

    for (const table of STUDENT_TABLES) {
      const query = `SELECT * FROM ${table} WHERE Register_No = @registerNumber`;
      const result = await pool
        .request()
        .input("registerNumber", sql.NVarChar, registerNumber)
        .query(query);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        if (!user.DateOfBirth) {
          return res.status(400).json({ success: false, message: "Date of Birth not found for this account. Contact administrator." });
        }

        let storedDob;
        if (typeof user.DateOfBirth === "object" && user.DateOfBirth instanceof Date) {
          const y = user.DateOfBirth.getFullYear();
          const m = String(user.DateOfBirth.getMonth() + 1).padStart(2, "0");
          const d = String(user.DateOfBirth.getDate()).padStart(2, "0");
          storedDob = y + "-" + m + "-" + d;
        } else {
          storedDob = user.DateOfBirth.toString().trim();
        }

        const parts = dob.split("/");
        const normalizedInput = parts[2] + "-" + parts[1] + "-" + parts[0];

        if (normalizedInput !== storedDob) {
          return res.status(401).json({ success: false, message: "Date of Birth does not match our records" });
        }

        const token = crypto.randomBytes(32).toString("hex");
        resetTokens[token] = {
          registerNumber,
          table,
          createdAt: Date.now(),
        };

        setTimeout(() => { delete resetTokens[token]; }, 15 * 60 * 1000);

        return res.json({ success: true, message: "Verification successful", resetToken: token });
      }
    }

    return res.status(404).json({ success: false, message: "Register Number not found" });
  } catch (err) {
    console.error("Forgot verify error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/forgot-reset", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: "Reset token and new password are required" });
    }

    const tokenData = resetTokens[resetToken];
    if (!tokenData) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token. Please start over." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter" });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one lowercase letter" });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one number" });
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one special character" });
    }
    if (/mzcet/i.test(newPassword)) {
      return res.status(400).json({ success: false, message: "New password cannot be similar to the default password" });
    }

    if (!pool || !pool.connected) {
      await connectDB();
    }
    if (!pool || !pool.connected) {
      return res.status(503).json({ success: false, message: "Database not available" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updateQuery = `UPDATE ${tokenData.table} SET password = @newPassword WHERE Register_No = @registerNumber`;
    await pool
      .request()
      .input("newPassword", sql.NVarChar, hashedPassword)
      .input("registerNumber", sql.NVarChar, tokenData.registerNumber)
      .query(updateQuery);

    delete resetTokens[resetToken];

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Forgot reset error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/verify-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "MzWebJWT@2026#Secret");
    return res.json({ success: true, valid: true, user: decoded });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.json({ success: false, valid: false, message: "Token expired" });
    }
    return res.json({ success: false, valid: false, message: "Invalid token" });
  }
});

// =====================
// Default Cards Config (served from environment variables)
// =====================

app.get("/api/default-cards", function (req, res) {
  try {
    var defaultCards = JSON.parse(process.env.DEFAULT_CARDS || '[]');
    res.json({ success: true, data: defaultCards });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================
// Card Data API (persists admin-added cards, edits, deletions in DB)
// =====================

app.get("/api/cards", async (req, res) => {
  try {
    if (!pool || !pool.connected) { await connectDB(); }
    const result = await pool.request()
      .query("SELECT DataKey, DataValue FROM AppData WHERE DataKey IN ('customCards', 'edits', 'deletedDefaults')");

    const config = { customCards: [], edits: {}, deletedDefaults: [] };
    result.recordset.forEach(function (row) {
      try { config[row.DataKey] = JSON.parse(row.DataValue); }
      catch (e) { config[row.DataKey] = row.DataKey === 'edits' ? {} : []; }
    });
    res.json({ success: true, data: config });
  } catch (err) {
    console.error("Get cards error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

async function upsertAppData(key, value) {
  await pool.request()
    .input("key", sql.NVarChar(100), key)
    .input("value", sql.NVarChar(sql.MAX), value)
    .query(`
      IF EXISTS (SELECT 1 FROM AppData WHERE DataKey = @key)
        UPDATE AppData SET DataValue = @value, UpdatedAt = GETDATE() WHERE DataKey = @key
      ELSE
        INSERT INTO AppData (DataKey, DataValue) VALUES (@key, @value)
    `);
}

async function getAppDataArray(key) {
  const r = await pool.request()
    .input("key", sql.NVarChar(100), key)
    .query("SELECT DataValue FROM AppData WHERE DataKey = @key");
  if (r.recordset.length === 0) return [];
  try { return JSON.parse(r.recordset[0].DataValue); } catch (e) { return []; }
}

async function getAppDataObject(key) {
  const r = await pool.request()
    .input("key", sql.NVarChar(100), key)
    .query("SELECT DataValue FROM AppData WHERE DataKey = @key");
  if (r.recordset.length === 0) return {};
  try { return JSON.parse(r.recordset[0].DataValue); } catch (e) { return {}; }
}

app.post("/api/cards", verifyToken, async (req, res) => {
  try {
    const { id, name, url, icon, image } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: "Name and URL are required" });
    }
    const newCard = {
      id: id || ("custom-" + Date.now()),
      name: name,
      url: url,
      icon: icon || "fa-globe",
      image: image || "",
      isDefault: false,
    };
    const customCards = await getAppDataArray("customCards");
    customCards.push(newCard);
    await upsertAppData("customCards", JSON.stringify(customCards));
    res.json({ success: true, message: "Card added", card: newCard });
  } catch (err) {
    console.error("Add card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/cards/:id", verifyToken, async (req, res) => {
  try {
    const cardId = req.params.id;
    const { name, url, icon, image } = req.body;

    if (cardId.indexOf("default-") === 0) {
      // Save as edit for a default card
      const edits = await getAppDataObject("edits");
      edits[cardId] = { name: name, url: url, icon: icon, image: image };
      await upsertAppData("edits", JSON.stringify(edits));
    } else {
      // Update a custom card in the array
      const customCards = await getAppDataArray("customCards");
      const idx = customCards.findIndex(function (c) { return c.id === cardId; });
      if (idx !== -1) {
        if (name !== undefined) customCards[idx].name = name;
        if (url !== undefined) customCards[idx].url = url;
        if (icon !== undefined) customCards[idx].icon = icon;
        if (image !== undefined) customCards[idx].image = image;
        await upsertAppData("customCards", JSON.stringify(customCards));
      }
    }
    res.json({ success: true, message: "Card updated" });
  } catch (err) {
    console.error("Update card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/cards/:id", verifyToken, async (req, res) => {
  try {
    const cardId = req.params.id;

    if (cardId.indexOf("default-") === 0) {
      // Mark default card as deleted
      const deleted = await getAppDataArray("deletedDefaults");
      if (deleted.indexOf(cardId) === -1) deleted.push(cardId);
      await upsertAppData("deletedDefaults", JSON.stringify(deleted));
    } else {
      // Remove custom card from array
      const customCards = await getAppDataArray("customCards");
      const filtered = customCards.filter(function (c) { return c.id !== cardId; });
      await upsertAppData("customCards", JSON.stringify(filtered));
    }
    res.json({ success: true, message: "Card deleted" });
  } catch (err) {
    console.error("Delete card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  await connectDB();
});