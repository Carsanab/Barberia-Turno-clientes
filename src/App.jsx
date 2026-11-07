import DateView from './components/DateView';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL

function App() {
  return (
    <div className="app">
      <DateView API_URL={API_URL} />
    </div>
  );
}

export default App;