import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar      from './components/Navbar'
import CategoryBar from './components/CategoryBar'
import FilterBar   from './components/FilterBar'
import Footer      from './components/Footer'
import Home        from './pages/Home'
import AdminPage   from './pages/AdminPage'

function MainLayout() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sort,        setSort]        = useState('default')
  const [category,    setCategory]    = useState(null)
  const [resolution,  setResolution]  = useState(null)
  const [mobileOnly,  setMobileOnly]  = useState(false)

  const handleSearch = (q) => {
    setSearchQuery(q)
    if (q) setCategory(null)
  }

  const handleSort = (value) => {
    setSort(value)
    setCategory(null)
  }

  const handleMobileToggle = () => setMobileOnly(v => !v)

  const handleClearFilters = () => {
    setMobileOnly(false)
    setResolution(null)
  }

  return (
    <div className="min-h-screen bg-surface-900 font-sans flex flex-col">
      <Navbar
        onSearch={handleSearch}
        onSort={handleSort}
        activeSort={sort}
        searchQuery={searchQuery}
      />
      <CategoryBar
        activeCategory={category}
        onSelect={setCategory}
      />
      <FilterBar
        mobileOnly={mobileOnly}
        onMobileToggle={handleMobileToggle}
        resolution={resolution}
        onResolutionChange={setResolution}
        onClearFilters={handleClearFilters}
      />
      <div className="flex-1">
        <Home
          searchQuery={searchQuery}
          sort={sort}
          categoryId={category?.id ?? null}
          categoryName={category?.name ?? null}
          resolution={resolution}
          mobileOnly={mobileOnly}
          onSearch={handleSearch}
        />
      </div>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<MainLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
