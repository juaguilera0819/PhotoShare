
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3001";

function App() {
  const [fotos, setFotos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [token, setToken] = useState(
    () => sessionStorage.getItem("token") || ""
  );
  const [usuario, setUsuario] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  // Consultar fotografías de MySQL
  const cargarFotos = async () => {
    try {
      const respuesta = await fetch(`${API}/api/fotos`);

      if (!respuesta.ok) {
        throw new Error("No se pudo cargar la galería");
      }

      const datos = await respuesta.json();
      setFotos(datos);
    } catch (error) {
      setMensaje(error.message);
    }
  };

  useEffect(() => {
    cargarFotos();
  }, []);

  // Registrar usuario
  const registrar = async () => {
    try {
      const respuesta = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, correo, password }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al registrarse");
      }

      setMensaje("Registro exitoso. Ahora inicia sesión.");
    } catch (error) {
      setMensaje(error.message);
    }
  };

  // Iniciar sesión
  const iniciarSesion = async () => {
    try {
      const respuesta = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo, password }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al iniciar sesión");
      }

      if (!datos.token) {
        throw new Error("El servidor no devolvió un token");
      }

      sessionStorage.setItem("token", datos.token);
      setToken(datos.token);
      setUsuario(datos.usuario);
      setPassword("");
      setMensaje("Inicio de sesión exitoso");
    } catch (error) {
      setMensaje(error.message);
    }
  };

  // Cerrar sesión
  const cerrarSesion = () => {
    sessionStorage.removeItem("token");
    setToken("");
    setUsuario(null);
    setMensaje("Sesión cerrada");
  };

  // Publicar fotografía
  const publicarFoto = async (e) => {
    e.preventDefault();

    if (!archivo || !token) {
      setMensaje("Inicia sesión y selecciona una fotografía");
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const formulario = new FormData();
      formulario.append("imagen", archivo);
      formulario.append("descripcion", descripcion);

      const respuesta = await fetch(`${API}/api/fotos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formulario,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al publicar");
      }

      setDescripcion("");
      setArchivo(null);
      setMensaje("Fotografía publicada correctamente");
      await cargarFotos();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📸 PhotoShare</h1>
        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#galeria">Galería</a>
          <a href="#publicar">Publicar</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <h2>Comparte tus mejores momentos</h2>
        <p>
          Una plataforma para compartir fotografías
          y descubrir nuevas historias.
        </p>
        <a href="#publicar" className="boton">
          Compartir fotografía
        </a>
      </section>

      <main>
        <section className="publicar" id="publicar">
          {!token ? (
            <>
              <h2>Registro e inicio de sesión</h2>

              <input
                type="text"
                placeholder="Tu nombre (para registrarte)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />

              <input
                type="email"
                placeholder="Correo electrónico"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="acciones">
                <button
                  type="button"
                  className="boton"
                  onClick={registrar}
                >
                  Registrarse
                </button>

                <button
                  type="button"
                  className="boton"
                  onClick={iniciarSesion}
                >
                  Iniciar sesión
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>
                Publicar una fotografía
              </h2>

              <p>
                Sesión iniciada
                {usuario?.nombre
                  ? ` como ${usuario.nombre}`
                  : ""}
              </p>

              <form onSubmit={publicarFoto}>
                <input
                  type="text"
                  placeholder="Descripción de la fotografía"
                  value={descripcion}
                  onChange={(e) =>
                    setDescripcion(e.target.value)
                  }
                />

                <input
                  type="file"
                  accept="image/jpeg"
                  onChange={(e) =>
                    setArchivo(e.target.files[0] || null)
                  }
                />

                <button
                  type="submit"
                  className="boton"
                  disabled={cargando}
                >
                  {cargando
                    ? "Publicando..."
                    : "Publicar fotografía"}
                </button>
              </form>

              <button
                type="button"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>
            </>
          )}

          {mensaje && <p role="status">{mensaje}</p>}
        </section>

        <section className="galeria" id="galeria">
          <h2>Galería de fotografías</h2>

          {fotos.length === 0 ? (
            <p className="vacio">
              Todavía no hay fotografías.
              ¡Publica la primera!
            </p>
          ) : (
            <div className="grid-fotos">
              {fotos.map((foto) => (
                <article className="tarjeta" key={foto.id}>
                  <img
                    src={`${API}${foto.imagen_url}`}
                    alt={foto.descripcion || "Fotografía"}
                  />

                  <div className="info">
                    <h3>{foto.autor}</h3>
                    <p>{foto.descripcion}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>© 2026 PhotoShare | Sistemas Distribuidos</p>
      </footer>
    </div>
  );
}

export default App;
