/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: Configuracion.jsx
Autor: Jose Rodolfo Chaves Herrera / Actualizado por Marco Vásquez
Fecha: 24/08/2026
Modulo: Frontend - Configuracion del Sistema
Descripcion:
Pantalla de administracion centralizada para los parametros institucionales,
tecnicos y de red IP del sistema: nombre oficial de la institucion, duracion
maxima de sesion, limite de almacenamiento y rango de IP permitido para marcas
con validacion de sintaxis estricta (IPv4 / CIDR completos).
//////////////////////////////////////////////////////////
*/

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerLinksNav } from '../utils/navLinks.js';
import {
  obtenerConfiguraciones,
  actualizarConfiguracion,
} from '../api/configuracion.js';

import Navbar from '../components/Navbar.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Buttons.jsx';
import Alert from '../components/Alert.jsx';
import Input from '../components/Input.jsx';
import Titulo from '../components/Titulo.jsx';
import Spinner from '../components/Spinner.jsx';
import Tabla from '../components/Tabla.jsx';

// Validador de formato IPv4 / CIDR en el cliente
const validarFormatoRangoIp = (rangoTexto) => {
  if (!rangoTexto || typeof rangoTexto !== 'string') return false;
  const texto = rangoTexto.trim();
  if (!texto) return false;

  const rangos = texto.split(',').map((r) => r.trim());

  for (const rango of rangos) {
    if (rango === '0.0.0.0/0' || rango === '*') continue;

    if (rango.includes('/')) {
      const partes = rango.split('/');
      if (partes.length !== 2) return false;
      const [ipBase, mascaraStr] = partes;
      if (!/^\d+$/.test(mascaraStr)) return false;
      const mascara = parseInt(mascaraStr, 10);
      if (isNaN(mascara) || mascara < 0 || mascara > 32) return false;

      const octetos = ipBase.split('.');
      if (octetos.length !== 4) return false;
      if (octetos.some((o) => !/^\d+$/.test(o) || Number(o) < 0 || Number(o) > 255)) return false;
    } else {
      if (rango === '::1' || rango === 'localhost') continue;
      const octetos = rango.split('.');
      if (octetos.length !== 4) return false;
      if (octetos.some((o) => !/^\d+$/.test(o) || Number(o) < 0 || Number(o) > 255)) return false;
    }
  }

  return true;
};

export default function Configuracion() {
  const { usuario, logout } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Lista completa de configuraciones desde la BD
  const [listaConfiguraciones, setListaConfiguraciones] = useState([]);

  // Estados de los campos principales de configuración (incluyendo rango_ip_permitido)
  const [config, setConfig] = useState({
    nombre_institucion: 'Universidad Técnica Nacional',
    tiempo_max_sesion_min: '120',
    tamano_max_archivo_mb: '5',
    rango_ip_permitido: '0.0.0.0/0',
  });

  // Cargar configuraciones de la BD
  const cargarConfiguracion = useCallback(async () => {
    setCargando(true);
    setError('');
    const res = await obtenerConfiguraciones();
    setCargando(false);

    if (res.ok && Array.isArray(res.data)) {
      setListaConfiguraciones(res.data);
      const mapa = {};
      res.data.forEach((item) => {
        if (
          item.clave in config ||
          ['nombre_institucion', 'tiempo_max_sesion_min', 'tamano_max_archivo_mb', 'rango_ip_permitido'].includes(item.clave)
        ) {
          mapa[item.clave] = item.valor;
        }
      });
      setConfig((prev) => ({ ...prev, ...mapa }));
    } else if (!res.ok) {
      setError(res.message || 'Error al obtener las configuraciones');
    }
  }, []);

  useEffect(() => {
    if (usuario && esAdmin) {
      cargarConfiguracion();
    }
  }, [usuario, esAdmin, cargarConfiguracion]);

  // Manejar cambios en el formulario
  const handleChange = (campo, valor) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  };

  // Guardar configuración general (incluyendo IP)
  const manejarGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    // Validaciones de campos
    if (!config.nombre_institucion.trim()) {
      setError('El nombre de la institución es requerido.');
      return;
    }

    const tiempoSesion = Number(config.tiempo_max_sesion_min);
    if (isNaN(tiempoSesion) || tiempoSesion <= 0) {
      setError('El tiempo máximo de sesión debe ser un número entero mayor a 0 minutos.');
      return;
    }

    const tamanoArchivo = Number(config.tamano_max_archivo_mb);
    if (isNaN(tamanoArchivo) || tamanoArchivo <= 0) {
      setError('El tamaño máximo de archivo debe ser un número mayor a 0 MB.');
      return;
    }

    // Validar sintaxis de rango de IP
    const ipTrimmed = config.rango_ip_permitido.trim();
    if (!ipTrimmed) {
      setError('El rango de IP permitido es requerido.');
      return;
    }

    if (!validarFormatoRangoIp(ipTrimmed)) {
      setError(
        'El formato de IP ingresado no es válido. Debe ingresar una dirección IPv4 completa (ej. 192.168.1.15) o una subred CIDR (ej. 192.168.1.0/24 o 0.0.0.0/0).'
      );
      return;
    }

    setGuardando(true);

    try {
      // Guardar cada parámetro mediante el endpoint individual del backend
      const promesas = [
        actualizarConfiguracion('nombre_institucion', config.nombre_institucion.trim()),
        actualizarConfiguracion('tiempo_max_sesion_min', String(tiempoSesion)),
        actualizarConfiguracion('tamano_max_archivo_mb', String(tamanoArchivo)),
        actualizarConfiguracion('rango_ip_permitido', ipTrimmed),
      ];

      const resultados = await Promise.all(promesas);
      setGuardando(false);

      const algunError = resultados.find((r) => !r.ok);
      if (algunError) {
        setError(algunError.message || 'Error al actualizar algunos parámetros.');
      } else {
        setExito('Parámetros del sistema y rango de IP guardados exitosamente.');
        cargarConfiguracion();
      }
    } catch (err) {
      setGuardando(false);
      setError(err.message || 'Error de comunicación con el servidor');
    }
  };

  if (!usuario) return null;

  if (!esAdmin) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <Alert color="rojo" titulo="Acceso denegado." texto="No tiene permisos para acceder a la configuración del sistema." />
      </div>
    );
  }

  return (
    <>
      <Navbar
        color="azul"
        texto="SIGMA"
        navList={true}
        links={obtenerLinksNav(usuario, '/configuracion')}
      />

      <div className="container-fluid px-4 py-2">
        <div className="mb-4">
          <Titulo tipografia="h2" texto="Configuración General del Sistema" color_text="negro" />
          <p className="text-muted">
            Administra los parámetros institucionales, expiración de sesiones, límites de almacenamiento y rango de red IP autorizada.
          </p>
        </div>

        {error && <Alert color="rojo" fondoBlanco={true} texto={error} dismissible onDismiss={() => setError('')} />}
        {exito && <Alert color="verde" fondoBlanco={true} texto={exito} dismissible onDismiss={() => setExito('')} />}

        {cargando ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="text-muted mt-2">Cargando parámetros...</p>
          </div>
        ) : (
          <div className="row g-4">
            {/* Formulario Principal de Configuración */}
            <div className="col-12 col-lg-7">
              <Card
                responsivo={true}
                card_width="100%"
                titulo="Parámetros Institucionales, de Sistema y Red IP"
                chil_body={
                  <form onSubmit={manejarGuardar}>
                    {/* 1. Nombre de la Institución */}
                    <div className="mb-4">
                      <Input
                        label="Nombre de la Institución / Universidad *"
                        placeholder="Ej. Universidad Técnica Nacional"
                        value={config.nombre_institucion}
                        onChange={(e) => handleChange('nombre_institucion', e.target.value)}
                        required
                      />
                      <small className="text-muted">
                        Nombre oficial mostrado en el sistema, encabezados y reportes institucionales.
                      </small>
                    </div>

                    {/* 2. Rango de IP Permitido para Marcas */}
                    <div className="mb-4">
                      <Input
                        label="Rango de Red IP Permitido (rango_ip_permitido) *"
                        placeholder="Ej. 0.0.0.0/0 o 192.168.1.0/24"
                        value={config.rango_ip_permitido}
                        onChange={(e) => handleChange('rango_ip_permitido', e.target.value)}
                        required
                      />
                      <small className="text-muted">
                        Dirección IP o notación CIDR autorizada para marcas (ej. <code>0.0.0.0/0</code> para cualquier red, <code>127.0.0.1</code> o <code>192.168.1.0/24</code>).
                      </small>
                    </div>

                    {/* 3. Tiempo de Sesión */}
                    <div className="mb-4">
                      <Input
                        label="Tiempo Máximo de Sesión (Minutos) *"
                        tipo="number"
                        placeholder="120"
                        min="1"
                        max="1440"
                        value={config.tiempo_max_sesion_min}
                        onChange={(e) => handleChange('tiempo_max_sesion_min', e.target.value)}
                        required
                      />
                      <small className="text-muted">
                        Duración máxima de una sesión antes de requerir nuevo inicio de sesión por inactividad.
                      </small>
                    </div>

                    {/* 4. Tamaño de Archivo */}
                    <div className="mb-4">
                      <Input
                        label="Tamaño Máximo de Archivos / Imágenes (MB) *"
                        tipo="number"
                        placeholder="5"
                        min="1"
                        max="50"
                        value={config.tamano_max_archivo_mb}
                        onChange={(e) => handleChange('tamano_max_archivo_mb', e.target.value)}
                        required
                      />
                      <small className="text-muted">
                        Límite de tamaño permitido para subir fotografías de equipos en el inventario.
                      </small>
                    </div>

                    <div className="d-flex gap-2 justify-content-end border-top pt-3">
                      <Button
                        type="button"
                        color="gris"
                        texto="Revertir Cambios"
                        disabled={guardando}
                        onClick={cargarConfiguracion}
                      />
                      <Button
                        type="submit"
                        color="azul"
                        cargando={guardando}
                        texto="Guardar Parámetros"
                      />
                    </div>
                  </form>
                }
              />
            </div>

            {/* Información y Parámetros en Base de Datos */}
            <div className="col-12 col-lg-5">
              <Card
                responsivo={true}
                card_width="100%"
                titulo="Resumen de Parámetros en Base de Datos"
                chil_body={
                  <div>
                    <p className="text-muted small mb-3">
                      Valores actualmente almacenados en la tabla <code>configuracion</code>:
                    </p>

                    <Tabla columnas={[{ texto: 'Clave', ancho: '50%' }, { texto: 'Valor Actual', ancho: '50%' }]}>
                      {listaConfiguraciones.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <code className="fw-bold">{item.clave}</code>
                            <div className="text-muted small">{item.descripcion || '—'}</div>
                          </td>
                          <td className="align-middle">
                            <span className="badge bg-light text-dark border font-monospace fs-6 text-wrap text-break">
                              {item.valor}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </Tabla>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
