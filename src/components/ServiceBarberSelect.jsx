import { useState, useEffect } from 'react';

export default function ServiceBarberSelect({ API_URL, onSelect, selectedService, selectedBarber }) {
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servRes, barbRes] = await Promise.all([
        fetch(`${API_URL}?action=getServicios`),
        fetch(`${API_URL}?action=getBarberos`)
      ]);
      const servData = await servRes.json();
      const barbData = await barbRes.json();
      setServicios(Array.isArray(servData) ? servData : []);
      setBarberos(Array.isArray(barbData) ? barbData : []);
    } catch (e) {
      console.error(e);
      setServicios([]);
      setBarberos([]);
    }
    setLoading(false);
  };

  const formatPrice = (price) => {
    return `$${parseInt(price).toLocaleString('es-AR')}`;
  };

  if (loading) {
    return (
      <div className="loading-section">
        <div className="spinner-small"></div>
        <p>Cargando servicios y barberos...</p>
      </div>
    );
  }

  return (
    <div className="service-barber-select">
      {/* SERVICIOS */}
      <div className="selection-section">
        <div className="section-header">
          <span className="step-number">1</span>
          <h3>Elegí el servicio</h3>
        </div>
        <p className="section-subtitle">Se abona en el local, una vez terminado el servicio.</p>

        <div className="services-grid">
          {servicios.map(servicio => (
            <button
              key={servicio.id}
              className={`service-card ${selectedService?.id === servicio.id ? 'selected' : ''}`}
              onClick={() => onSelect('service', servicio)}
            >
              <div className="service-info">
                <h4>{servicio.nombre}</h4>
                <span className="service-duration">{servicio.duracion} min</span>
              </div>
              <div className="service-price">
                <span className="price-label">EFECTIVO</span>
                <span className="price-value">{formatPrice(servicio.precio)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* BARBEROS */}
      <div className="selection-section">
        <div className="section-header">
          <span className="step-number">2</span>
          <h3>Elegí el profesional</h3>
        </div>

        <div className="barbers-grid">
          {/* Opción "Cualquiera" */}
          <button
            className={`barber-card ${!selectedBarber ? 'selected' : ''}`}
            onClick={() => onSelect('barber', null)}
          >
            <div className="barber-avatar any">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span className="barber-name">Cualquiera</span>
          </button>

          {barberos.map(barbero => (
            <button
              key={barbero.id}
              className={`barber-card ${selectedBarber?.id === barbero.id ? 'selected' : ''}`}
              onClick={() => onSelect('barber', barbero)}
            >
              <div className="barber-avatar">
                {barbero.fotoUrl ? (
                  <img src={barbero.fotoUrl} alt={barbero.nombre} />
                ) : (
                  <span>{barbero.nombre.charAt(0)}</span>
                )}
              </div>
              <span className="barber-name">{barbero.nombre}</span>
              {barbero.especialidad && (
                <span className="barber-specialty">{barbero.especialidad}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}