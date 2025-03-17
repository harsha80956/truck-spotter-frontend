import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TripPlannerPage from './pages/TripPlannerPage'
import TripDetailsPage from './pages/TripDetailsPage'
import EldLogsPage from './pages/EldLogsPage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trip-planner" element={<TripPlannerPage />} />
          <Route path="/trips/:id" element={<TripDetailsPage />} />
          <Route path="/eld-logs" element={<EldLogsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App 