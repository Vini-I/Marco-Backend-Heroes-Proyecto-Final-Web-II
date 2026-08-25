/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: Marcas.jsx
Autor: Marco Vásquez
Fecha: 22/08/2026
Modulo: Frontend - Marcas y Dispositivos
Descripcion:
Pantalla principal para el Modulo de Marcas y Dispositivos. Permite
marcar entrada y salida con alternancia automatica, verificar el estado
de asistencia en vivo, consultar la red IP, registrar el navegador como
dispositivo autorizado, ver todos los dispositivos (si es admin) o los propios,
inactivar/eliminar dispositivos y ver el historial con calculo de tiempo.
Filas de tabla con altura de 1 sola linea uniforme sin saltos de texto.
//////////////////////////////////////////////////////////
*/

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerLinksNav } from '../utils/navLinks.js';
import { marcarAsistencia, obtenerEstadoActual, obtenerMisMarcas } from '../api/marcas.js';
import {
  registrarDispositivo,
  seleccionarDispositivo,
  obtenerMisDispositivos,
  cambiarEstadoDispositivo,
  eliminarDispositivo,
} from '../api/dispositivos.js';

import Navbar from '../components/Navbar.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Buttons.jsx';
import Alert from '../components/Alert.jsx';
import Input from '../components/Input.jsx';
import Tabla from '../components/Tabla.jsx';

export default function Marcas() {
  const { usuario, logout } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  // Pestaña activa ('asistencia' o 'dispositivos')
  const [tabActiva, setTabActiva] = useState('asistencia');

  // Estado de Asistencia
  const [estadoActual, setEstadoActual] = useState(null);
  const [historialMarcas, setHistorialMarcas] = useState([]);
  const [cargandoMarca, setCargandoMarca] = useState(false);
  const [mensajeMarca, setMensajeMarca] = useState(null);
  const [horaEnVivo, setHoraEnVivo] = useState(new Date().toLocaleTimeString());

  // Estado de Dispositivos
  const [dispositivos, setDispositivos] = useState([]);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({ nombre: '', descripcion: '' });
  const [cargandoDispositivo, setCargandoDispositivo] = useState(false);
  const [mensajeDispositivo, setMensajeDispositivo] = useState(null);

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => setHoraEnVivo(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar datos de marcas y estado actual
  const cargarDatosMarcas = useCallback(async () => {
    const resEstado = await obtenerEstadoActual();
    if (resEstado.ok) setEstadoActual(resEstado.data);

    const resHistorial = await obtenerMisMarcas();
    if (resHistorial.ok) setHistorialMarcas(resHistorial.data);
  }, []);

  // Cargar dispositivos autorizados
  const cargarDispositivos = useCallback(async () => {
    const resDisp = await obtenerMisDispositivos();
    if (resDisp.ok) setDispositivos(resDisp.data);
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarDatosMarcas();
      cargarDispositivos();
    }
  }, [usuario, cargarDatosMarcas, cargarDispositivos]);

  // Ejecutar Marca (ENTRADA / SALIDA)
  const ejecutarMarca = async () => {
    setMensajeMarca(null);
    setCargandoMarca(true);

    const res = await marcarAsistencia();
    setCargandoMarca(false);

    setMensajeMarca({
      tipo: res.ok ? 'verde' : 'rojo',
      texto: res.message,
    });

    if (res.ok) {
      cargarDatosMarcas();
    }
  };

  // Registrar Dispositivo
  const guardarDispositivo = async (e) => {
    e.preventDefault();
    setMensajeDispositivo(null);

    if (!nuevoDispositivo.nombre.trim()) {
      setMensajeDispositivo({ tipo: 'rojo', texto: 'Por favor ingrese el nombre del dispositivo.' });
      return;
    }

    setCargandoDispositivo(true);
    const res = await registrarDispositivo(nuevoDispositivo);
    setCargandoDispositivo(false);

    setMensajeDispositivo({
      tipo: res.ok ? 'verde' : 'rojo',
      texto: res.message,
    });

    if (res.ok) {
      setNuevoDispositivo({ nombre: '', descripcion: '' });
      cargarDispositivos();
      cargarDatosMarcas();
    }
  };

  // Seleccionar dispositivo para el navegador actual (Solo si pertenece al usuario)
  const handleSeleccionarDispositivo = async (id) => {
    const res = await seleccionarDispositivo(id);
    if (res.ok) {
      cargarDispositivos();
      cargarDatosMarcas();
      setMensajeDispositivo({ tipo: 'verde', texto: res.message });
    } else {
      setMensajeDispositivo({ tipo: 'rojo', texto: res.message });
    }
  };

  // Cambiar estado del dispositivo
  const toggleEstadoDispositivo = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const res = await cambiarEstadoDispositivo(id, nuevoEstado);
    if (res.ok) {
      cargarDispositivos();
      cargarDatosMarcas();
    }
  };

  // Eliminar dispositivo
  const handleEliminarDispositivo = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este dispositivo autorizado?')) return;
    const res = await eliminarDispositivo(id);
    if (res.ok) {
      cargarDispositivos();
      cargarDatosMarcas();
    }
  };

  if (!usuario) return null;

  const esEntrada = estadoActual?.siguiente_marca_sugerida === 'ENTRADA';
  const estadoAsistencia = estadoActual?.estado_asistencia || 'FUERA';
  const ipCliente = estadoActual?.ip_cliente || 'Detectando...';
  const ipAutorizada = estadoActual?.ip_autorizada ?? true;

  return (
    <>
      {/* Navbar Estandar de la App */}
      <Navbar
        color="azul"
        texto="SIGMA"
        navList={true}
        links={obtenerLinksNav(usuario, '/marcas')}
      />

      <div className="container-fluid px-4 py-2">
        {/* Selector de Pestañas (Tabs) */}
        <div className="d-flex justify-content-center mb-4">
          <div className="btn-group shadow-sm" role="group">
            <button
              className={`btn btn-${tabActiva === 'asistencia' ? 'primary' : 'outline-primary'} px-4 py-2 fw-bold`}
              onClick={() => setTabActiva('asistencia')}
            >
              <i className="bi bi-clock-history me-2"></i> Asistencia & Marcas
            </button>
            <button
              className={`btn btn-${tabActiva === 'dispositivos' ? 'primary' : 'outline-primary'} px-4 py-2 fw-bold`}
              onClick={() => setTabActiva('dispositivos')}
            >
              <i className="bi bi-laptop me-2"></i> Dispositivos Autorizados
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PESTAÑA 1: REGISTRO DE ASISTENCIA                              */}
        {/* ============================================================== */}
        {tabActiva === 'asistencia' && (
          <div className="row g-4 justify-content-center">
            {/* Tarjeta de Control Principal */}
            <div className="col-12 col-lg-8">
              <Card
                responsivo={true}
                card_width="100%"
                titulo="Control de Asistencia"
                texto_alineado="center"
                chil_body={
                  <div className="py-3">
                    {/* Badge de Estado Actual */}
                    <div className="mb-3">
                      <span className="text-muted d-block mb-1 fs-6">Estado de Asistencia:</span>
                      <span
                        className={`badge ${
                          estadoAsistencia === 'DENTRO' ? 'bg-success' : 'bg-secondary'
                        } fs-4 px-4 py-2 shadow-sm rounded-pill`}
                      >
                        {estadoAsistencia === 'DENTRO' ? 'DENTRO (En Jornada)' : 'FUERA (Sin Marca Activa)'}
                      </span>
                    </div>

                    {/* Reloj en Vivo e IP */}
                    <div className="row justify-content-center g-3 my-2 text-center">
                      <div className="col-auto">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">Hora Local Sistema</small>
                          <strong className="fs-5 text-dark">
                            <i className="bi bi-clock me-1"></i> {horaEnVivo}
                          </strong>
                        </div>
                      </div>
                      <div className="col-auto">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">IP de Conexión</small>
                          <strong className="fs-5 text-dark me-2">{ipCliente}</strong>
                          {ipAutorizada ? (
                            <span className="badge bg-success">
                              <i className="bi bi-check-circle me-1"></i> Red Autorizada
                            </span>
                          ) : (
                            <span className="badge bg-danger">
                              <i className="bi bi-x-circle me-1"></i> Red No Permitida
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mensajes de Alerta */}
                    {mensajeMarca && (
                      <div className="my-3">
                        <Alert
                          color={mensajeMarca.tipo}
                          fondoBlanco={true}
                          texto={mensajeMarca.texto}
                          dismissible={true}
                          onDismiss={() => setMensajeMarca(null)}
                        />
                      </div>
                    )}

                    {!ipAutorizada && (
                      <div className="my-3">
                        <Alert
                          color="rojo"
                          fondoBlanco={true}
                          titulo="Red No Permitida"
                          texto="No es posible realizar la marca desde la red actual."
                        />
                      </div>
                    )}

                    {/* Botón Principal de Acción */}
                    <div className="mt-4">
                      <Button
                        color={esEntrada ? 'verde' : 'rojo'}
                        tamano="grande"
                        cargando={cargandoMarca}
                        disabled={!ipAutorizada}
                        onClick={ejecutarMarca}
                        className="px-5 py-3 fs-4 fw-bold shadow"
                      >
                        <i className={`bi ${esEntrada ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right'} me-2`}></i>
                        {esEntrada ? 'MARCAR ENTRADA' : 'MARCAR SALIDA'}
                      </Button>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Historial de Marcas del Usuario */}
            <div className="col-12 col-lg-10">
              <Card
                responsivo={true}
                card_width="100%"
                titulo="Mi Historial de Marcas"
                texto_alineado="left"
                chil_body={
                  historialMarcas.length === 0 ? (
                    <p className="text-muted text-center py-3 mb-0">
                      No tienes marcas registradas aún. Haz clic en el botón superior para realizar tu primera marca.
                    </p>
                  ) : (
                    <Tabla
                      columnas={[
                        { texto: 'Usuario', ancho: '20%' },
                        { texto: 'Fecha', ancho: '12%' },
                        { texto: 'Hora', ancho: '12%' },
                        { texto: 'Tipo de Marca', ancho: '14%' },
                        { texto: 'Dispositivo', ancho: '20%' },
                        { texto: 'Dirección IP', ancho: '12%' },
                        { texto: 'Tiempo Laborado', ancho: '10%' },
                      ]}
                    >
                      {historialMarcas.map((m) => {
                        const duracion = m.duracion_calculada || m.duracion_laborada;
                        return (
                          <tr key={m.id}>
                            <td className="fw-bold align-middle text-nowrap">{m.usuario_nombre || usuario.nombre_completo}</td>
                            <td className="text-center font-monospace align-middle text-nowrap">{String(m.fecha).slice(0, 10)}</td>
                            <td className="text-center font-monospace fw-bold align-middle text-nowrap">{m.hora}</td>
                            <td className="text-center align-middle">
                              <span
                                className={`badge ${
                                  m.tipo === 'ENTRADA' ? 'bg-success' : 'bg-primary'
                                } px-3 py-1`}
                              >
                                {m.tipo}
                              </span>
                            </td>
                            <td className="text-center align-middle text-nowrap">{m.dispositivo_nombre || 'Dispositivo Registrado'}</td>
                            <td className="text-center font-monospace small align-middle text-nowrap">{m.ip}</td>
                            <td className="text-center fw-semibold text-success align-middle text-nowrap">
                              {duracion ? (
                                <span>
                                  <i className="bi bi-hourglass-split me-1"></i>
                                  {duracion}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Tabla>
                  )
                }
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: GESTIÓN DE DISPOSITIVOS AUTORIZADOS                */}
        {/* ============================================================== */}
        {tabActiva === 'dispositivos' && (
          <div className="row g-4 justify-content-center">
            {/* Formulario para registrar el navegador/dispositivo actual */}
            <div className="col-12 col-md-5">
              <Card
                responsivo={true}
                card_width="100%"
                titulo="Autorizar Este Navegador / Dispositivo"
                texto_alineado="left"
                chil_body={
                  <form onSubmit={guardarDispositivo}>
                    <p className="text-muted small mb-3">
                      Al registrar este dispositivo, se generará una cookie identificadora única que permitirá autorizar
                      tus marcas desde este navegador de forma segura.
                    </p>

                    <div className="mb-3">
                      <Input
                        label="Nombre del Dispositivo *"
                        placeholder="Ej. Laptop Trabajo Marco, PC Casa"
                        value={nuevoDispositivo.nombre}
                        onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, nombre: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <Input
                        label="Descripción u Observaciones"
                        placeholder="Ej. Google Chrome en Windows 11"
                        value={nuevoDispositivo.descripcion}
                        onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, descripcion: e.target.value })}
                      />
                    </div>

                    {mensajeDispositivo && (
                      <div className="mb-3">
                        <Alert
                          color={mensajeDispositivo.tipo}
                          fondoBlanco={true}
                          texto={mensajeDispositivo.texto}
                          dismissible={true}
                          onDismiss={() => setMensajeDispositivo(null)}
                        />
                      </div>
                    )}

                    <Button tipo="submit" color="azul" cargando={cargandoDispositivo} className="w-100 fw-bold">
                      <i className="bi bi-laptop me-2"></i> Autorizar Dispositivo Actual
                    </Button>
                  </form>
                }
              />
            </div>

            {/* Lista de Dispositivos Registrados */}
            <div className="col-12 col-md-7">
              <Card
                responsivo={true}
                card_width="100%"
                titulo={esAdmin ? 'Todos los Dispositivos Registrados (Administración)' : 'Dispositivos Autorizados Registrados'}
                texto_alineado="left"
                chil_body={
                  dispositivos.length === 0 ? (
                    <p className="text-muted text-center py-3 mb-0">
                      No hay ningún dispositivo registrado aún en el sistema.
                    </p>
                  ) : (
                    <Tabla
                      columnas={[
                        { texto: 'Propietario', ancho: '22%' },
                        { texto: 'Nombre', ancho: '23%' },
                        { texto: 'Descripción', ancho: '25%' },
                        { texto: 'Fecha Registro', ancho: '12%' },
                        { texto: 'Estado', ancho: '8%' },
                        { texto: 'Acciones', ancho: '10%' },
                      ]}
                    >
                      {dispositivos.map((d) => {
                        const esMiDispositivo = d.usuario_id === usuario.id;
                        return (
                          <tr
                            key={d.id}
                            className={d.es_actual ? 'bg-light border-start border-4 border-primary' : ''}
                          >
                            <td className="fw-bold align-middle text-nowrap">{d.propietario || usuario.nombre_completo}</td>
                            <td className="fw-semibold align-middle text-dark text-nowrap">
                              <span>{d.nombre}</span>
                              {d.es_actual && (
                                <span className="badge bg-primary text-white ms-2 shadow-sm d-inline-block">
                                  <i className="bi bi-laptop me-1"></i> Este Navegador
                                </span>
                              )}
                            </td>
                            <td
                              className="small text-muted align-middle text-nowrap text-truncate"
                              style={{ maxWidth: '160px' }}
                              title={d.descripcion || 'Sin descripción'}
                            >
                              {d.descripcion || 'Sin descripción'}
                            </td>
                            <td className="small font-monospace align-middle text-dark text-nowrap">
                              {new Date(d.fecha_registro).toLocaleDateString()}
                            </td>
                            <td className="text-center align-middle">
                              <span className={`badge ${d.estado === 'ACTIVO' ? 'bg-success' : 'bg-danger'}`}>
                                {d.estado}
                              </span>
                            </td>
                            <td className="text-center align-middle">
                              <div className="btn-group btn-group-sm text-nowrap d-inline-flex align-items-center" role="group">
                                {/* Solo se permite 'Seleccionar / Usar' si el dispositivo pertenece al usuario autenticado */}
                                {!d.es_actual && d.estado === 'ACTIVO' && esMiDispositivo && (
                                  <button
                                    className="btn btn-outline-primary fw-semibold px-2 py-1 text-nowrap"
                                    title="Usar en este navegador"
                                    onClick={() => handleSeleccionarDispositivo(d.id)}
                                  >
                                    <i className="bi bi-box-arrow-in-down me-1"></i> Seleccionar
                                  </button>
                                )}
                                <button
                                  className={`btn btn-${d.estado === 'ACTIVO' ? 'warning text-dark' : 'success'} px-2 py-1 text-nowrap`}
                                  title={d.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                                  onClick={() => toggleEstadoDispositivo(d.id, d.estado)}
                                >
                                  {d.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                                </button>
                                <button
                                  className="btn btn-danger px-2 py-1"
                                  title="Eliminar"
                                  onClick={() => handleEliminarDispositivo(d.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Tabla>
                  )
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
