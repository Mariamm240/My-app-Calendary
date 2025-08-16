'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Check, X, Calendar, AlertCircle, Clock, BarChart3, Moon, Sun, Play, Pause, RotateCcw, Target, Trophy, Timer, ChevronLeft, ChevronRight, Grid3X3, Edit, List, ChevronUp, ChevronDown } from 'lucide-react'

interface Tarea {
  id: string
  titulo: string
  descripcion: string
  completada: boolean
  fecha: string
  prioridad: 'alta' | 'media' | 'baja'
  creadaEn: string
  tiempoEstimado?: number // minutos
  tiempoInvertido?: number // minutos
  subtareas?: Subtarea[]
  etiquetas?: string[]
  bloque?: 'manana' | 'media-manana' | 'tarde' | 'media-tarde'
  horaInicio?: string // formato HH:MM
  horaFin?: string // formato HH:MM (calculado automáticamente)
  tipoTarea?: 'normal' | 'rutina-simple' | 'rutina-compleja' // para filtrar tareas sencillas
  orden?: number // para drag & drop
  duracionHoras?: number // duración en horas para timeline
}

interface Subtarea {
  id: string
  titulo: string
  completada: boolean
}

interface EstadisticasDia {
  fecha: string
  tareasCreadas: number
  tareasCompletadas: number
  tiempoInvertido: number
  puntos: number
}

const PRIORIDADES: Record<string, { color: string; texto: string }> = {
  alta: { color: 'bg-red-500', texto: 'Alta' },
  media: { color: 'bg-yellow-500', texto: 'Media' },
  baja: { color: 'bg-blue-500', texto: 'Baja' }
}

export default function Home() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    tiempoEstimado: 30,
    etiquetas: [] as string[],
    bloque: 'manana' as 'manana' | 'media-manana' | 'tarde' | 'media-tarde'
  })
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [vista, setVista] = useState<'lista' | 'calendario' | 'estadisticas' | 'timeline'>('timeline')
  const [puntos, setPuntos] = useState(0)
  const [tareaArrastrando, setTareaArrastrando] = useState<string | null>(null)
  const [horaActual, setHoraActual] = useState(new Date())
  const [mostrarTareasSimples, setMostrarTareasSimples] = useState(true)

  // Cargar tareas del localStorage
  useEffect(() => {
    const tareasGuardadas = localStorage.getItem('tareas')
    const puntosGuardados = localStorage.getItem('puntos')
    if (tareasGuardadas) {
      setTareas(JSON.parse(tareasGuardadas))
    }
    if (puntosGuardados) {
      setPuntos(parseInt(puntosGuardados))
    }
  }, [])

  // Actualizar hora actual cada minuto
  useEffect(() => {
    const intervalo = setInterval(() => {
      setHoraActual(new Date())
    }, 60000)
    return () => clearInterval(intervalo)
  }, [])

  // Guardar tareas en localStorage
  const guardarTareas = (nuevasTareas: Tarea[]) => {
    setTareas(nuevasTareas)
    localStorage.setItem('tareas', JSON.stringify(nuevasTareas))
  }

  // Filtrar tareas por fecha
  const tareasHoy = tareas.filter(tarea => tarea.fecha === fechaSeleccionada)

  // Crear nueva tarea
  const crearTarea = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaTarea.titulo.trim()) return

    const tarea: Tarea = {
      id: Date.now().toString(),
      titulo: nuevaTarea.titulo,
      descripcion: nuevaTarea.descripcion,
      completada: false,
      fecha: fechaSeleccionada,
      prioridad: nuevaTarea.prioridad,
      creadaEn: new Date().toISOString(),
      tiempoEstimado: nuevaTarea.tiempoEstimado,
      tiempoInvertido: 0,
      subtareas: [],
      etiquetas: nuevaTarea.etiquetas,
      bloque: nuevaTarea.bloque,
      tipoTarea: 'normal' as const,
      orden: tareas.filter(t => t.fecha === fechaSeleccionada).length
    }

    const nuevasTareas = [...tareas, tarea]
    guardarTareas(nuevasTareas)
    setNuevaTarea({ titulo: '', descripcion: '', prioridad: 'media', tiempoEstimado: 30, etiquetas: [], bloque: 'manana' })
    setMostrarFormulario(false)
  }

  // Completar/descompletar tarea
  const toggleCompletada = (id: string) => {
    const nuevasTareas = tareas.map(tarea => {
      if (tarea.id === id) {
        const tareaActualizada = { ...tarea, completada: !tarea.completada }
        if (tareaActualizada.completada) {
          setPuntos(prev => prev + 10)
          localStorage.setItem('puntos', (puntos + 10).toString())
        } else {
          setPuntos(prev => Math.max(0, prev - 10))
          localStorage.setItem('puntos', Math.max(0, puntos - 10).toString())
        }
        return tareaActualizada
      }
      return tarea
    })
    guardarTareas(nuevasTareas)
  }

  // Eliminar tarea
  const eliminarTarea = (id: string) => {
    const nuevasTareas = tareas.filter(tarea => tarea.id !== id)
    guardarTareas(nuevasTareas)
  }

  // Funciones para el timeline
  const generarHoras = () => {
    const horas = []
    for (let i = 6; i <= 23; i++) {
      horas.push(i)
    }
    return horas
  }

  const obtenerTareasEnHora = (hora: number) => {
    return tareasHoy.filter(tarea => {
      if (tarea.horaInicio) {
        const horaInicioTarea = parseInt(tarea.horaInicio.split(':')[0])
        const duracion = tarea.duracionHoras || (tarea.tiempoEstimado / 60)
        return horaInicioTarea <= hora && hora < horaInicioTarea + duracion
      }
      return false
    })
  }

  const obtenerTareasSimples = () => {
    return tareasHoy.filter(tarea => 
      tarea.tipoTarea === 'rutina-simple' || 
      (tarea.tiempoEstimado <= 15 && !tarea.horaInicio)
    )
  }

  const asignarHoraATarea = (tareaId: string, hora: number, minutos: number = 0) => {
    const horaFormato = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
    const nuevasTareas = tareas.map(tarea => 
      tarea.id === tareaId 
        ? { ...tarea, horaInicio: horaFormato, duracionHoras: tarea.tiempoEstimado / 60 }
        : tarea
    )
    guardarTareas(nuevasTareas)
  }

  const obtenerHoraActualEnTimeline = () => {
    const hora = horaActual.getHours()
    const minutos = horaActual.getMinutes()
    return { hora, minutos, posicionY: ((hora - 6) * 80) + (minutos * 80 / 60) }
  }

  // Funciones para el calendario
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  
  const obtenerDiasDelMes = () => {
    const inicioMes = startOfMonth(fechaCalendario)
    const finMes = endOfMonth(fechaCalendario)
    const inicioCalendario = startOfWeek(inicioMes, { weekStartsOn: 1 }) // Lunes como primer día
    const finCalendario = endOfMonth(addDays(finMes, 6))
    
    return eachDayOfInterval({ start: inicioCalendario, end: finCalendario })
  }

  const obtenerTareasDelDia = (fecha: Date) => {
    const fechaString = format(fecha, 'yyyy-MM-dd')
    return tareas.filter(tarea => tarea.fecha === fechaString)
  }

  const obtenerEstadisticasDelDia = (fecha: Date) => {
    const tareasDelDia = obtenerTareasDelDia(fecha)
    const completadas = tareasDelDia.filter(t => t.completada).length
    const total = tareasDelDia.length
    const tiempoTotal = tareasDelDia.reduce((acc, t) => acc + (t.tiempoEstimado || 0), 0)
    
    return {
      total,
      completadas,
      pendientes: total - completadas,
      tiempoTotal,
      progreso: total > 0 ? (completadas / total) * 100 : 0
    }
  }

  const navegarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = direccion === 'anterior' 
      ? addDays(fechaCalendario, -30)
      : addDays(fechaCalendario, 30)
    setFechaCalendario(nuevaFecha)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className={`rounded-xl shadow-lg p-6 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                🎯 Gestión de Tareas
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Organiza tu día con timeline inteligente
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Puntos */}
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                <Trophy size={16} className="inline mr-2" />
                {puntos} puntos
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setVista('timeline')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  vista === 'timeline' 
                    ? 'bg-indigo-600 text-white' 
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Clock size={16} />
                Timeline
              </button>
              <button
                onClick={() => setVista('calendario')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  vista === 'calendario' 
                    ? 'bg-indigo-600 text-white' 
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Calendar size={16} />
                Calendario
              </button>
              <button
                onClick={() => setVista('lista')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  vista === 'lista' 
                    ? 'bg-indigo-600 text-white' 
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <List size={16} />
                Lista
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de fecha */}
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300'}`}
              />

              {/* Botón agregar tarea */}
              <button
                onClick={() => setMostrarFormulario(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Nueva Tarea
              </button>
            </div>
          </div>
        </div>

        {/* Formulario para nueva tarea */}
        {mostrarFormulario && (
          <div className={`rounded-xl shadow-lg p-6 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Nueva Tarea
            </h2>
            <form onSubmit={crearTarea} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Título de la tarea"
                  value={nuevaTarea.titulo}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300'}`}
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Descripción (opcional)"
                  value={nuevaTarea.descripcion}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300'}`}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Prioridad
                  </label>
                  <select
                    value={nuevaTarea.prioridad}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value as 'alta' | 'media' | 'baja' })}
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300'}`}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tiempo estimado (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={nuevaTarea.tiempoEstimado}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, tiempoEstimado: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Crear Tarea
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className={`px-6 py-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vista Timeline */}
        {vista === 'timeline' && (
          <div className="flex gap-6">
            {/* Timeline Principal */}
            <div className={`flex-1 rounded-xl shadow-lg transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Timeline del Día
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                      {format(new Date(), 'HH:mm', { locale: es })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="relative">
                  {/* Grid de horas */}
                  {generarHoras().map((hora) => {
                    const tareasEnHora = obtenerTareasEnHora(hora)
                    const { hora: horaActualNum } = obtenerHoraActualEnTimeline()
                    const esHoraActual = horaActualNum === hora
                    
                    return (
                      <div key={hora} className="relative">
                        {/* Línea de hora principal */}
                        <div className="flex items-center h-20 border-b border-gray-100 dark:border-gray-700">
                          <div className="w-16 flex-shrink-0">
                            <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {hora.toString().padStart(2, '0')}:00
                            </div>
                          </div>
                          
                          {/* Línea de tiempo */}
                          <div className="flex-1 relative">
                            <div className={`absolute left-0 w-full h-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            
                            {/* Marca de media hora */}
                            <div className={`absolute left-0 w-8 h-px top-10 ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                            <div className={`absolute left-10 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} top-8`}>
                              {hora.toString().padStart(2, '0')}:30
                            </div>
                            
                            {/* Línea de hora actual */}
                            {esHoraActual && (
                              <div 
                                className="absolute left-0 w-full h-1 bg-red-500 rounded-full shadow-lg z-10"
                                style={{ top: `${(horaActual.getMinutes() * 80 / 60)}px` }}
                              >
                                <div className="absolute -left-1 -top-1 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                                <div className="absolute -right-20 -top-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                  AHORA
                                </div>
                              </div>
                            )}
                            
                            {/* Tareas en esta hora */}
                            {tareasEnHora.map((tarea, index) => (
                              <div
                                key={tarea.id}
                                className={`absolute left-20 right-4 rounded-lg p-3 shadow-md transition-all hover:shadow-lg cursor-pointer border-l-4 ${
                                  tarea.prioridad === 'alta' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                  tarea.prioridad === 'media' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                }`}
                                style={{
                                  top: `${index * 60}px`,
                                  height: `${Math.max(50, (tarea.duracionHoras || 1) * 50)}px`
                                }}
                                onDragStart={() => setTareaArrastrando(tarea.id)}
                                onDragEnd={() => setTareaArrastrando(null)}
                                draggable
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                      {tarea.titulo}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Clock size={12} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {tarea.tiempoEstimado || 30} min
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleCompletada(tarea.id)}
                                      className={`p-1 rounded transition-colors ${
                                        tarea.completada 
                                          ? 'bg-green-500 text-white' 
                                          : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'
                                      }`}
                                    >
                                      <Check size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Zona de drop para asignar tareas */}
                        <div
                          className={`absolute inset-x-16 inset-y-0 opacity-0 hover:opacity-100 transition-opacity ${
                            tareaArrastrando ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-300' : ''
                          }`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (tareaArrastrando) {
                              asignarHoraATarea(tareaArrastrando, hora)
                            }
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar de Tareas Simples */}
            <div className={`w-80 rounded-xl shadow-lg transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Tareas Rápidas
                  </h3>
                  <button
                    onClick={() => setMostrarTareasSimples(!mostrarTareasSimples)}
                    className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    {mostrarTareasSimples ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {mostrarTareasSimples && (
                <div className="p-4 space-y-3">
                  {/* Tareas simples predefinidas */}
                  <div className="space-y-2">
                    <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Rutinas Diarias
                    </div>
                    
                    {[
                      { emoji: '💧', titulo: 'Tomar agua', tiempo: 1 },
                      { emoji: '🚶‍♂️', titulo: 'Caminar 5 min', tiempo: 5 },
                      { emoji: '🧘‍♂️', titulo: 'Respirar profundo', tiempo: 2 },
                      { emoji: '📱', titulo: 'Revisar mensajes', tiempo: 10 },
                      { emoji: '☕', titulo: 'Descanso café', tiempo: 15 },
                      { emoji: '🍎', titulo: 'Snack saludable', tiempo: 5 }
                    ].map((tarea, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:shadow-md ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-700' 
                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          const nuevaTarea: Tarea = {
                            id: Date.now().toString(),
                            titulo: tarea.titulo,
                            descripcion: '',
                            completada: false,
                            fecha: fechaSeleccionada,
                            prioridad: 'baja',
                            creadaEn: new Date().toISOString(),
                            tiempoEstimado: tarea.tiempo,
                            tiempoInvertido: 0,
                            subtareas: [],
                            etiquetas: [],
                            bloque: 'manana',
                            tipoTarea: 'rutina-simple',
                            orden: tareas.filter(t => t.fecha === fechaSeleccionada).length
                          }
                          guardarTareas([...tareas, nuevaTarea])
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{tarea.emoji}</span>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {tarea.titulo}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {tarea.tiempo} min
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tareas sin programar */}
                  {obtenerTareasSimples().length > 0 && (
                    <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
                      <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Sin Programar
                      </div>
                      
                      {obtenerTareasSimples().map((tarea) => (
                        <div
                          key={tarea.id}
                          className={`p-3 rounded-lg border cursor-grab transition-all hover:shadow-md ${
                            darkMode 
                              ? 'border-gray-600 bg-gray-700 hover:bg-gray-650' 
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                          draggable
                          onDragStart={() => setTareaArrastrando(tarea.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {tarea.titulo}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock size={10} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {tarea.tiempoEstimado || 15} min
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleCompletada(tarea.id)}
                              className={`p-1 rounded transition-colors ${
                                tarea.completada 
                                  ? 'bg-green-500 text-white' 
                                  : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'
                              }`}
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vista Calendario */}
        {vista === 'calendario' && (
          <div className="space-y-6">
            {/* Header del Calendario */}
            <div className={`rounded-xl shadow-lg p-6 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {format(fechaCalendario, 'MMMM yyyy', { locale: es })}
                  </h2>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gestiona tus tareas por día
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navegarMes('anterior')}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <button
                    onClick={() => setFechaCalendario(new Date())}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Hoy
                  </button>
                  
                  <button
                    onClick={() => navegarMes('siguiente')}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendario Grid */}
            <div className={`rounded-xl shadow-lg p-6 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, index) => (
                  <div key={index} className={`p-3 text-center font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {dia}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {obtenerDiasDelMes().map((fecha, index) => {
                  const esHoy = isSameDay(fecha, new Date())
                  const esMesActual = isSameMonth(fecha, fechaCalendario)
                  const fechaSeleccionadaDate = parseISO(fechaSeleccionada)
                  const esFechaSeleccionada = isSameDay(fecha, fechaSeleccionadaDate)
                  const estadisticas = obtenerEstadisticasDelDia(fecha)
                  const tareasDelDia = obtenerTareasDelDia(fecha)

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md
                        ${!esMesActual ? (darkMode ? 'text-gray-600 bg-gray-800/50' : 'text-gray-400 bg-gray-50') : ''}
                        ${esHoy ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                        ${esFechaSeleccionada ? (darkMode ? 'bg-indigo-900/50 border-indigo-500' : 'bg-indigo-50 border-indigo-300') : ''}
                        ${darkMode 
                          ? 'border-gray-700 bg-gray-700 hover:bg-gray-650' 
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setFechaSeleccionada(format(fecha, 'yyyy-MM-dd'))}
                    >
                      {/* Fecha */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`
                          font-semibold text-sm
                          ${esHoy ? 'text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full' : ''}
                          ${!esMesActual ? (darkMode ? 'text-gray-600' : 'text-gray-400') : (darkMode ? 'text-gray-200' : 'text-gray-800')}
                        `}>
                          {format(fecha, 'd')}
                        </span>
                        
                        {estadisticas.total > 0 && (
                          <div className="flex items-center gap-1">
                            <div className={`
                              w-2 h-2 rounded-full
                              ${estadisticas.progreso === 100 ? 'bg-green-500' : 
                                estadisticas.progreso > 50 ? 'bg-yellow-500' : 'bg-red-500'}
                            `} />
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {estadisticas.completadas}/{estadisticas.total}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Lista de tareas del día */}
                      <div className="space-y-1">
                        {tareasDelDia.slice(0, 3).map((tarea) => (
                          <div
                            key={tarea.id}
                            className={`
                              text-xs p-1 rounded border-l-2 truncate
                              ${tarea.completada ? 'opacity-60 line-through' : ''}
                              ${tarea.prioridad === 'alta' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                tarea.prioridad === 'media' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                                'border-blue-500 bg-blue-50 dark:bg-blue-900/20'}
                            `}
                          >
                            {tarea.titulo}
                          </div>
                        ))}
                        
                        {tareasDelDia.length > 3 && (
                          <div className={`text-xs text-center py-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            +{tareasDelDia.length - 3} más
                          </div>
                        )}
                      </div>

                      {/* Tiempo total del día */}
                      {estadisticas.tiempoTotal > 0 && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock size={10} />
                          {Math.round(estadisticas.tiempoTotal / 60)}h {estadisticas.tiempoTotal % 60}m
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Estadísticas del día seleccionado */}
            {fechaSeleccionada && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(() => {
                  const fechaSeleccionadaDate = parseISO(fechaSeleccionada)
                  const estadisticas = obtenerEstadisticasDelDia(fechaSeleccionadaDate)
                  const tareasDelDia = obtenerTareasDelDia(fechaSeleccionadaDate)
                  
                  return (
                    <>
                      <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {estadisticas.total}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Check size={20} className="text-green-600" />
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completadas</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {estadisticas.completadas}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Clock size={20} className="text-yellow-600" />
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pendientes</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {estadisticas.pendientes}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Timer size={20} className="text-purple-600" />
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tiempo</p>
                            <p className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {Math.round(estadisticas.tiempoTotal / 60)}h
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* Lista de tareas del día seleccionado */}
            {fechaSeleccionada && obtenerTareasDelDia(parseISO(fechaSeleccionada)).length > 0 && (
              <div className={`rounded-xl shadow-lg p-6 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Tareas para {format(parseISO(fechaSeleccionada), 'EEEE, d MMMM', { locale: es })}
                </h3>
                
                <div className="space-y-3">
                  {obtenerTareasDelDia(parseISO(fechaSeleccionada))
                    .sort((a, b) => {
                      if (a.completada !== b.completada) {
                        return a.completada ? 1 : -1
                      }
                      const prioridadOrden = { alta: 0, media: 1, baja: 2 }
                      return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
                    })
                    .map((tarea) => (
                      <div
                        key={tarea.id}
                        className={`
                          flex items-center justify-between p-4 rounded-lg border transition-all
                          ${tarea.completada ? 'opacity-70' : ''}
                          ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${PRIORIDADES[tarea.prioridad].color}`} />
                          <div>
                            <h4 className={`
                              font-medium
                              ${tarea.completada ? 'line-through' : ''}
                              ${darkMode ? 'text-gray-200' : 'text-gray-800'}
                            `}>
                              {tarea.titulo}
                            </h4>
                            {tarea.descripcion && (
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {tarea.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                            {tarea.tiempoEstimado} min
                          </span>
                          
                          <button
                            onClick={() => toggleCompletada(tarea.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              tarea.completada 
                                ? 'bg-green-500 text-white' 
                                : darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-550' : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            }`}
                          >
                            <Check size={16} />
                          </button>
                          
                          <button
                            onClick={() => eliminarTarea(tarea.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vista Lista de Tareas */}
        {vista === 'lista' && (
          <div>
            {tareasHoy.length === 0 ? (
              <div className={`rounded-xl shadow-lg p-12 text-center transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="mb-6">
                  <AlertCircle className={`mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={64} />
                </div>
                <p className={`text-xl mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No hay tareas para esta fecha
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  ¡Perfecto día para relajarse o crear nuevas tareas! 🌟
                </p>
                <button
                  onClick={() => setMostrarFormulario(true)}
                  className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105"
                >
                  Crear primera tarea
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tareasHoy
                  .sort((a, b) => {
                    if (a.completada !== b.completada) {
                      return a.completada ? 1 : -1
                    }
                    const prioridadOrden = { alta: 0, media: 1, baja: 2 }
                    return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
                  })
                  .map((tarea) => (
                    <div
                      key={tarea.id}
                      className={`rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border ${
                        darkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100'
                      } ${tarea.completada ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-4 h-4 rounded-full ${PRIORIDADES[tarea.prioridad].color} shadow-lg animate-pulse`}></div>
                            <h3 className={`text-xl font-bold transition-colors ${
                              tarea.completada 
                                ? `line-through ${darkMode ? 'text-gray-500' : 'text-gray-500'}` 
                                : `${darkMode ? 'text-gray-200' : 'text-gray-900'}`
                            }`}>
                              {tarea.titulo}
                            </h3>
                          </div>
                          
                          {tarea.descripcion && (
                            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {tarea.descripcion}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock size={14} />
                              {tarea.tiempoEstimado} min
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tarea.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                              tarea.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {PRIORIDADES[tarea.prioridad].texto}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCompletada(tarea.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              tarea.completada ? 'bg-green-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            <Check size={20} />
                          </button>
                          <button
                            onClick={() => eliminarTarea(tarea.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
