
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

// Registrar usuario
router.post("/register", async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (
      typeof nombre !== "string" ||
      typeof correo !== "string" ||
      typeof password !== "string" ||
      !nombre.trim() ||
      !correo.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        mensaje: "Ingresa nombre, correo y contraseña de mínimo 8 caracteres",
      });
    }

    const correoLimpio = correo.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      return res.status(400).json({
        mensaje: "El correo electrónico no es válido",
      });
    }

    if (nombre.length > 100 || correoLimpio.length > 150 ||
        password.length > 72) {
      return res.status(400).json({
        mensaje: "Uno de los campos supera la longitud permitida",
      });
    }

    const [existe] = await db.query(
      "SELECT id FROM usuarios WHERE correo = ?",
      [correoLimpio]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        mensaje: "Este correo ya está registrado",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nombre, correo, password_hash)
       VALUES (?, ?, ?)`,
      [nombre.trim(), correoLimpio, passwordHash]
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: {
        id: resultado.insertId,
        nombre: nombre.trim(),
        correo: correoLimpio,
      },
    });

  } catch (error) {
    console.error("Error en registro:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Este correo ya está registrado",
      });
    }

    res.status(500).json({
      mensaje: "Error interno al registrar usuario",
    });
  }
});

// Iniciar sesión
router.post("/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (typeof correo !== "string" ||
        typeof password !== "string") {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios",
      });
    }

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE correo = ?",
      [correo.trim().toLowerCase()]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    const usuario = usuarios[0];

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordValida) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    const token = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    });

  } catch (error) {
    console.error("Error en login:", error.message);

    res.status(500).json({
      mensaje: "Error interno al iniciar sesión",
    });
  }
});

module.exports = router;
