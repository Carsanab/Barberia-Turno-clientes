import { useState, useEffect, useRef } from 'react';

export default function DateView({ API_URL }) {
  const [turnos, setTurnos] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [minDate, setMinDate] = useState('');
  const [weekDays, setWeekDays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const nombreInputRef = useRef(null);

  useEffect(() => {
    fetchTurnos();
    setMinDate(getTodayString());
    generateWeekDays(0);
  }, []);

  useEffect(() => {
    if (showForm && nombreInputRef.current) {
      nombreInputRef.current.focus();
    }
  }, [showForm]);

  // Refrescar turnos cada 30 segundos para actualizar disponibilidad
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTurnos();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateWeekDays = (offset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDay = today.getDay();
    const monday = new Date(today);
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + diff + (offset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push({
        date: day.toISOString().split('T')[0],
        dayName: getDayNameShort(day.getDay()),
        dayNumber: String(day.getDate()).padStart(2, '0'),
        isToday: day.toDateString() === today.toDateString(),
        isPast: day < today
      });
    }
    setWeekDays(days);

    if (offset === 0) {
      const todayStr = today.toISOString().split('T')[0];
      const todayDay = days.find(d => d.date === todayStr && !d.isPast);
      if (todayDay) {
        setSelectedDate(todayDay.date);
      } else {
        const nextDay = days.find(d => !d.isPast);
        if (nextDay) setSelectedDate(nextDay.date);
      }
    } else {
      const nextDay = days.find(d => !d.isPast);
      if (nextDay) setSelectedDate(nextDay.date);
    }
  };

  const getDayNameShort = (dayNum) => {
    const names = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return names[dayNum];
  };

  const fetchTurnos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=getTurnos`);
      const data = await res.json();
      setTurnos(data);
    } catch (e) {
      console.error(e);
      setMsg('Error al cargar turnos');
    }
    setLoading(false);
  };

  // FUNCIÓN CLAVE: Filtrar turnos pasados
  const getTurnosForDate = (dateStr) => {
  const today = new Date();
  const todayStr = getTodayString();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  return turnos.filter(t => {
    // Si no está habilitado, no mostrar
    if (!t.habilitado) return false;
    
    // Si tiene nombre (ya reservado), no mostrar
    if (t.nombre) return false;

    // Si la fecha es anterior a hoy, no mostrar
    if (t.fecha < todayStr) return false;

    // Si es hoy, filtrar por horario (con 1 hora de anticipación)
    if (t.fecha === todayStr) {
      const [horas, minutos] = t.horario.split(':').map(Number);
      const turnoTimeInMinutes = horas * 60 + minutos;
      
      // Solo mostrar si faltan al menos 60 minutos (1 hora)
      return turnoTimeInMinutes >= currentTimeInMinutes + 60;
    }

    // Si es fecha futura, mostrar todos los habilitados
    return true;
  });
};

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setSelectedTurno(null);
    setShowForm(false);
    setMsg('');
  };

  const handleDayClick = (day) => {
    if (!day.isPast) {
      setSelectedDate(day.date);
      setSelectedTurno(null);
      setShowForm(false);
      setMsg('');
    }
  };

  const handleWeekChange = (direction) => {
    const newOffset = weekOffset + direction;
    if (newOffset >= 0) {
      setWeekOffset(newOffset);
      generateWeekDays(newOffset);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    }
    
    if (!telefono.trim()) {
      errors.telefono = 'El teléfono es obligatorio';
    } else if (!/^\d{8,15}$/.test(telefono.replace(/\D/g, ''))) {
      errors.telefono = 'Ingresá un teléfono válido (8-15 dígitos)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (selectedTurno) {
      setShowForm(true);
      setFormErrors({});
    }
  };

  const handleConfirm = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmarReserva = async () => {
    setShowConfirmModal(false);
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reservar',
          fecha: selectedTurno.fecha,
          horario: selectedTurno.horario,
          nombre: nombre.trim(),
          telefono: telefono.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`✅ Turno reservado: ${formatDateDisplay(selectedTurno.fecha)} a las ${selectedTurno.horario}`);
        setNombre('');
        setTelefono('');
        setSelectedTurno(null);
        setShowForm(false);
        setFormErrors({});
        await fetchTurnos();
      } else {
        setMsg('❌ ' + (data.error || 'Error al reservar'));
      }
    } catch (e) {
      setMsg('❌ Error de conexión');
    }
  };

  const turnosDelDia = selectedDate ? getTurnosForDate(selectedDate) : [];

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getDayNameFull = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return names[date.getDay()];
    }
    return '';
  };

  const handleTelefonoChange = (e) => {
    const value = e.target.value;
    const soloNumeros = value.replace(/\D/g, '');
    setTelefono(soloNumeros);
    if (formErrors.telefono) {
      setFormErrors({ ...formErrors, telefono: '' });
    }
  };

  const handleNombreChange = (e) => {
    setNombre(e.target.value);
    if (formErrors.nombre) {
      setFormErrors({ ...formErrors, nombre: '' });
    }
  };

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'Esta semana';
    if (weekOffset === 1) return 'Próxima semana';
    return `Semana +${weekOffset}`;
  };

  return (
    <div className="modern-view">
      {/* HEADER */}
      <header className="modern-header">
        <div className="logo-circle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <line x1="20" y1="4" x2="8.12" y2="15.88"/>
            <line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
        </div>
        <h1>THE <span className="red">BARBER</span></h1>
        <p className="subtitle">Volvé a tu prime</p>
      </header>

      {msg && <div className="msg">{msg}</div>}

      {/* PASO 1 - FECHA */}
      <div className="step-section">
        <div className="step-label">
          Seleccioná una fecha:
          <span className="step-badge">PASO 1</span>
        </div>
        
        <div className="date-card">
          <div className="date-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="date-card-content">
            <span className="date-card-label">FECHA ELEGIDA</span>
            <span className="date-card-value">
              {selectedDate ? formatDateDisplay(selectedDate) : 'Seleccionar'}
            </span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={minDate}
            className="date-input-hidden"
          />
          <svg className="date-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>

        {/* Navegación de semanas */}
        <div className="week-navigation">
          <button 
            className="week-nav-btn" 
            onClick={() => handleWeekChange(-1)}
            disabled={weekOffset === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="week-label">{getWeekLabel()}</span>
          <button 
            className="week-nav-btn" 
            onClick={() => handleWeekChange(1)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Días de la semana */}
        <div className="week-days">
          {weekDays.map((day, idx) => (
            <button
              key={idx}
              className={`week-day-btn ${selectedDate === day.date ? 'active' : ''} ${day.isPast ? 'past' : ''}`}
              onClick={() => handleDayClick(day)}
              disabled={day.isPast}
            >
              <span className="week-day-name">{day.dayName}</span>
              <span className="week-day-number">{day.dayNumber}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TURNOS DEL DÍA */}
      {selectedDate && (
        <div className="turnos-section">
          <div className="turnos-header">
            <h2>
              <span className="red-dot"></span>
              {getDayNameFull(selectedDate)} {formatDateDisplay(selectedDate)}
            </h2>
            <span className="turnos-info">Turnos de 30 min</span>
          </div>

          {loading ? (
            <p className="loading">Cargando turnos...</p>
          ) : turnosDelDia.length === 0 ? (
            <p className="no-turnos">
              {selectedDate === getTodayString() 
                ? 'No hay más turnos disponibles para hoy 😔' 
                : 'No hay turnos disponibles para este día 😔'}
            </p>
          ) : (
            <div className="turnos-grid-modern">
              {turnosDelDia.map(turno => (
                <button
                  key={turno.id}
                  className={`turno-card disponible ${selectedTurno?.id === turno.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTurno(turno)}
                >
                  <span className="turno-time">{turno.horario}</span>
                  <span className="turno-badge badge-disponible">
                    <span className="badge-dot"></span>
                    DISPONIBLE
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULARIO */}
      {showForm && selectedTurno && (
        <div className="form-section">
          <h3>Completá tus datos</h3>
          <p className="form-info">
            {getDayNameFull(selectedTurno.fecha)} {formatDateDisplay(selectedTurno.fecha)} a las {selectedTurno.horario}
          </p>
          
          <div className="form-inputs-modern">
            <div className="input-group">
              <input
                ref={nombreInputRef}
                placeholder="Tu nombre *"
                value={nombre}
                onChange={handleNombreChange}
                className={formErrors.nombre ? 'input-error' : ''}
              />
              {formErrors.nombre && <span className="error-text">{formErrors.nombre}</span>}
            </div>
            
            <div className="input-group">
              <input
                placeholder="Tu teléfono *"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={telefono}
                onChange={handleTelefonoChange}
                className={formErrors.telefono ? 'input-error' : ''}
              />
              {formErrors.telefono && <span className="error-text">{formErrors.telefono}</span>}
            </div>
          </div>

          <div className="form-actions-modern">
            <button className="btn-back" onClick={() => {
              setShowForm(false);
              setFormErrors({});
            }}>
              ← Volver
            </button>
            <button className="btn-confirm-modern" onClick={handleConfirm}>
              Confirmar reserva
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal-client" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-container confirm">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3>Confirmar Reserva</h3>
            <p className="modal-message">
              ¿Confirmás tu turno para el <strong>{getDayNameFull(selectedTurno.fecha)} {formatDateDisplay(selectedTurno.fecha)}</strong> a las <strong>{selectedTurno.horario}</strong>?
            </p>
            <div className="modal-actions-confirm">
              <button className="btn-modal-cancel" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </button>
              <button className="btn-modal-confirm confirm" onClick={confirmarReserva}>
                ✅ Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN CONTINUAR */}
      {selectedTurno && !showForm && (
        <div className="bottom-bar">
          <button className="btn-continue" onClick={handleContinue}>
            Continuar con la reserva
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <p className="cancel-policy">Cancelación gratuita hasta 2 horas antes de tu turno</p>
        </div>
      )}
    </div>
  );
}