
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const db = require("./db");

const router = express.Router();

// Verificar la sesión del usuario
function verificarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Debes iniciar sesión",
    });
  }

  try {
    const token = auth.split(" ")[1];

    req.usuario = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    next();
  } catch {
    res.status(401).json({
      mensaje: "Sesión inválida o vencida",
    });
  }
}

// Guardar imágenes en uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + ".jpg");
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "image/jpeg") {
      return cb(new Error("Solo se permiten imágenes JPG"));
    }
    cb(null, true);
  },
});

// Consultar fotografías desde MySQL
router.get("/", async (req, res) => {
  try {
    const [fotos] = await db.query(`
      SELECT
        f.id,
        f.descripcion,
        f.imagen_url,
        f.fecha_publicacion,
        u.nombre AS autor
      FROM fotos f
      INNER JOIN usuarios u ON f.usuario_id = u.id
      ORDER BY f.fecha_publicacion DESC, f.id DESC
    `);

    res.json(fotos);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error al consultar fotografías",
    });
  }
});

// Publicar una fotografía
router.post("/", verificarToken, (req, res) => {
  upload.single("imagen")(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje: "Debes seleccionar una fotografía JPG",
      });
    }

    try {
      const descripcion = req.body.descripcion || "";

      if (
        typeof descripcion !== "string" ||
        descripcion.length > 1000
      ) {
        await fs.unlink(req.file.path);

        return res.status(400).json({
          mensaje: "Descripción inválida",
        });
      }

      const imagenUrl = `/uploads/${req.file.filename}`;

      const [resultado] = await db.query(
        `INSERT INTO fotos
         (usuario_id, imagen_url, descripcion)
         VALUES (?, ?, ?)`,
        [req.usuario.id, imagenUrl, descripcion]
      );

      res.status(201).json({
        mensaje: "Fotografía publicada correctamente",
        id: resultado.insertId,
        imagen_url: imagenUrl,
      });
    } catch (error) {
      console.error(error.message);
      await fs.unlink(req.file.path).catch(() => {});

      res.status(500).json({
        mensaje: "Error al publicar fotografía",
      });
    }
  });
});

module.exports = router;
