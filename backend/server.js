

const express = require("express");
const cors = require("cors");
const db = require("./db");
const authRoutes = require("./auth");
const fotosRoutes = require("./fotos");
const path = require("path");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/fotos", fotosRoutes);



// Comprobar conexión con MySQL
app.get("/api/test-db", async (req, res) => {
  try {
    const [resultado] = await db.query(
      "SELECT DATABASE() AS base_datos"
    );

    res.json({
      mensaje: "Conexión a MySQL exitosa",
      base_datos: resultado[0].base_datos,
    });
  } catch (error) {
    console.error("Error de MySQL:", error.message);

    res.status(500).json({
      mensaje: "Error al conectar con MySQL",
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(
    `Servidor ejecutándose en http://localhost:${PORT}`
  );
});
